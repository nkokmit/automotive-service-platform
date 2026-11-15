"""Chat router – POST /chat with image damage area (cm², %, px), vehicle-aware pricing & streaming."""
from __future__ import annotations
import logging
import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from app.agent.graph import build_agent_graph
from app.dependencies import get_qdrant, get_http_client, get_checkpointer
from app.config import get_settings
from app.tools.damage_analysis import (
    execute_damage_detection,
    extract_vehicle_brand_from_text,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["chat"])
settings = get_settings()

DEFAULT_IMAGE_PROMPT = (
    "Phân tích ảnh xe này, lấy ra diện tích bị hư hỏng (cm², %, px) và đưa ra đánh giá "
    "chi tiết kèm giá tiền sửa chữa tương ứng theo dòng xe."
)


def _extract_text(content: Any) -> str:
    """Normalize LangChain message content (str or list of content blocks) to str."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
        return "\n".join(parts)
    return str(content)


class ChatRequest(BaseModel):
    message: str = Field(default="", max_length=4000)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str | None = None
    image_url: str | None = None
    image_base64: str | None = None
    vehicle_brand: str | None = None
    vehicle_segment: str | None = None
    stream: bool = False


class ChatResponse(BaseModel):
    session_id: str
    response: str
    tool_calls: list[str] = []
    damage_report: dict[str, Any] | None = None


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    qdrant=Depends(get_qdrant),
    http_client=Depends(get_http_client),
    checkpointer=Depends(get_checkpointer),
):
    """Send a message (and optional vehicle image + vehicle brand/segment) to the automotive AI agent."""
    from app.dependencies import _session_factory  # noqa: PLC0415

    has_image = bool(req.image_base64 or req.image_url)
    clean_msg = (req.message or "").strip()
    if not clean_msg and not has_image:
        raise HTTPException(
            status_code=422,
            detail="Vui lòng nhập nội dung tin nhắn hoặc đính kèm ảnh xe cần phân tích.",
        )

    user_text = clean_msg or DEFAULT_IMAGE_PROMPT
    effective_brand = (
        req.vehicle_brand.strip()
        if req.vehicle_brand and req.vehicle_brand.strip()
        else extract_vehicle_brand_from_text(clean_msg)
    )
    effective_segment = (
        req.vehicle_segment.strip()
        if req.vehicle_segment and req.vehicle_segment.strip()
        else None
    )

    damage_capture: dict[str, Any] = {}

    # Pre-execute segmentation & vehicle-aware cost estimation when an image is attached
    if has_image:
        try:
            formatted_text, report_data = await execute_damage_detection(
                http_client,
                image_url=req.image_url,
                image_base64=req.image_base64,
                vehicle_brand=effective_brand,
                vehicle_segment=effective_segment,
            )
            if report_data is not None:
                damage_capture["report"] = report_data
                damage_capture["formatted_text"] = formatted_text
                user_text += (
                    "\n\n[KẾT QUẢ PHÂN TÍCH ẢNH XE TỪ HỆ THỐNG YOLOv8-SEG (ĐÃ CHẠY THÀNH CÔNG)]:\n"
                    f"{formatted_text}\n"
                    "[Hãy dựa trực tiếp vào số liệu diện tích bị hư hỏng (cm², %, px), dòng xe & hệ số giá, "
                    "chiết khấu combo (nếu có), phương án khắc phục và bảng giá tiền sửa chữa tương ứng ở trên "
                    "để trình bày câu trả lời tư vấn chi tiết cho khách hàng. Không cần gọi lại công cụ analyze_vehicle_damage.]"
                )
            else:
                user_text += (
                    "\n[Người dùng đã đính kèm ảnh xe. Hãy gọi công cụ analyze_vehicle_damage() không truyền tham số "
                    "để lấy diện tích bị hư hỏng và báo giá sửa chữa.]"
                )
        except Exception as exc:
            logger.warning("Pre-detection on attached image failed: %s", exc)
            user_text += (
                "\n[Người dùng đã đính kèm ảnh xe. Hãy gọi công cụ analyze_vehicle_damage() không truyền tham số "
                "để lấy diện tích bị hư hỏng và báo giá sửa chữa.]"
            )

    graph = build_agent_graph(
        qdrant,
        _session_factory,
        http_client,
        checkpointer=checkpointer,
        attached_image_url=req.image_url,
        attached_image_base64=req.image_base64,
        attached_vehicle_brand=effective_brand,
        attached_vehicle_segment=effective_segment,
        damage_capture=damage_capture,
    )

    initial_state = {
        "messages": [HumanMessage(content=user_text)],
        "session_id": req.session_id,
        "user_id": req.user_id,
    }
    config = {"configurable": {"thread_id": req.session_id}}

    try:
        if req.stream:
            return StreamingResponse(
                _stream_response(graph, initial_state, config, req.session_id),
                media_type="text/event-stream",
            )

        result = await graph.ainvoke(initial_state, config=config)
        messages = result["messages"]
        final_message = messages[-1]

        current_turn_tools = []
        for m in reversed(messages):
            if isinstance(m, HumanMessage):
                break
            if hasattr(m, "name") and hasattr(m, "tool_call_id"):
                current_turn_tools.append(m.name)
        current_turn_tools.reverse()

        if has_image and "analyze_vehicle_damage" not in current_turn_tools and "report" in damage_capture:
            current_turn_tools.append("analyze_vehicle_damage")

        response_text = _extract_text(final_message.content)
        if not response_text.strip() and "formatted_text" in damage_capture:
            response_text = damage_capture["formatted_text"]

        return ChatResponse(
            session_id=req.session_id,
            response=response_text,
            tool_calls=list(dict.fromkeys(current_turn_tools)),
            damage_report=damage_capture.get("report"),
        )
    except Exception as exc:
        logger.exception("Agent invocation failed")
        if "formatted_text" in damage_capture:
            return ChatResponse(
                session_id=req.session_id,
                response=damage_capture["formatted_text"],
                tool_calls=["analyze_vehicle_damage"],
                damage_report=damage_capture.get("report"),
            )
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _stream_response(
    graph, initial_state: dict, config: dict, session_id: str
) -> AsyncIterator[str]:
    """Yield SSE events from the agent graph."""
    yield f"data: {{\"session_id\": \"{session_id}\"}}\n\n"
    async for event in graph.astream_events(initial_state, config=config, version="v2"):
        kind = event.get("event")
        if kind == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            text = _extract_text(chunk.content)
            if text:
                content = text.replace("\\", "\\\\").replace('"', '\\"')
                yield f'data: {{"content": "{content}"}}\n\n'
        elif kind == "on_tool_start":
            name = event["name"]
            yield f'data: {{"tool_start": "{name}"}}\n\n'
        elif kind == "on_tool_end":
            name = event["name"]
            yield f'data: {{"tool_end": "{name}"}}\n\n'
    yield "data: [DONE]\n\n"


@router.get("/chat/{session_id}/history")
async def get_history(
    session_id: str,
    qdrant=Depends(get_qdrant),
    http_client=Depends(get_http_client),
    checkpointer=Depends(get_checkpointer),
):
    """Retrieve full conversation history for a given session_id."""
    from app.dependencies import _session_factory  # noqa: PLC0415
    graph = build_agent_graph(qdrant, _session_factory, http_client, checkpointer=checkpointer)
    config = {"configurable": {"thread_id": session_id}}
    state = await graph.aget_state(config)

    messages = state.values.get("messages", []) if state and state.values else []
    history = []
    for m in messages:
        role = "assistant"
        if isinstance(m, HumanMessage):
            role = "user"
        elif hasattr(m, "tool_call_id"):
            role = "tool"
        history.append({
            "role": role,
            "content": _extract_text(m.content),
            "tool_name": getattr(m, "name", None),
        })
    return {"session_id": session_id, "messages": history, "total": len(history)}


@router.delete("/chat/{session_id}")
async def reset_session(
    session_id: str,
    checkpointer=Depends(get_checkpointer),
):
    """Reset / clear memory for a session."""
    try:
        await checkpointer.adelete_thread(session_id)
        return {"session_id": session_id, "status": "reset", "message": "Session memory cleared."}
    except Exception as exc:
        logger.warning("Could not delete session %s: %s", session_id, exc)
        return {"session_id": session_id, "status": "cleared"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "agent-service"}
