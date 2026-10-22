"""Chat router – POST /chat with streaming support."""
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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["chat"])
settings = get_settings()


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
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str | None = None
    image_url: str | None = None
    image_base64: str | None = None
    stream: bool = False


class ChatResponse(BaseModel):
    session_id: str
    response: str
    tool_calls: list[str] = []


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    qdrant=Depends(get_qdrant),
    http_client=Depends(get_http_client),
    checkpointer=Depends(get_checkpointer),
):
    """Send a message to the automotive AI agent with multi-turn conversation memory."""
    from app.dependencies import _session_factory  # noqa: PLC0415

    graph = build_agent_graph(
        qdrant,
        _session_factory,
        http_client,
        checkpointer=checkpointer,
        attached_image_url=req.image_url,
        attached_image_base64=req.image_base64,
    )

    user_text = req.message
    if req.image_base64 or req.image_url:
        user_text += "\n[Người dùng đã đính kèm ảnh xe cần phân tích hư hỏng bằng công cụ analyze_vehicle_damage]"

    initial_state = {
        "messages": [HumanMessage(content=user_text)], 
        "session_id": req.session_id,
        "user_id": req.user_id,
    }
    config = {"configurable": {"thread_id": req.session_id}} # thread id là chìa khóa để xác định cuộc trò chuyện hiện tại, cho phép agent duy trì ngữ cảnh và lịch sử hội thoại liên quan đến session_id cụ thể đó.

    try:
        if req.stream:
            return StreamingResponse(
                _stream_response(graph, initial_state, config, req.session_id),
                media_type="text/event-stream",
            )

        result = await graph.ainvoke(initial_state, config=config) 
        messages = result["messages"]
        final_message = messages[-1]

        # Extract tools called in this current turn
        current_turn_tools = []
        for m in reversed(messages):
            if isinstance(m, HumanMessage):
                break
            if hasattr(m, "name") and hasattr(m, "tool_call_id"):
                current_turn_tools.append(m.name)
        current_turn_tools.reverse()

        return ChatResponse(
            session_id=req.session_id,
            response=_extract_text(final_message.content),
            tool_calls=list(dict.fromkeys(current_turn_tools)),
        )
    except Exception as exc:
        logger.exception("Agent invocation failed")
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
