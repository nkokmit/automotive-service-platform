"""Chat router – POST /chat with streaming support."""
from __future__ import annotations
import logging
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from app.agent.graph import build_agent_graph
from app.dependencies import get_qdrant, get_http_client
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["chat"])
settings = get_settings()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str | None = None
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
):
    """Send a message to the automotive AI agent."""
    from app.dependencies import _session_factory  # noqa: PLC0415

    graph = build_agent_graph(qdrant, _session_factory, http_client)

    initial_state = {
        "messages": [HumanMessage(content=req.message)],
        "session_id": req.session_id,
        "user_id": req.user_id,
    }

    try:
        if req.stream:
            return StreamingResponse(
                _stream_response(graph, initial_state, req.session_id),
                media_type="text/event-stream",
            )

        result = await graph.ainvoke(initial_state)
        messages = result["messages"]
        final_message = messages[-1]
        tool_names = [
            m.name
            for m in messages
            if hasattr(m, "name") and hasattr(m, "tool_call_id")
        ]
        return ChatResponse(
            session_id=req.session_id,
            response=final_message.content,
            tool_calls=list(dict.fromkeys(tool_names)),
        )
    except Exception as exc:
        logger.exception("Agent invocation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _stream_response(
    graph, initial_state: dict, session_id: str
) -> AsyncIterator[str]:
    """Yield SSE events from the agent graph."""
    yield f"data: {{\"session_id\": \"{session_id}\"}}\n\n"
    async for event in graph.astream_events(initial_state, version="v2"):
        kind = event.get("event")
        if kind == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if chunk.content:
                content = chunk.content.replace("\\", "\\\\").replace('"', '\\"')
                yield f'data: {{"content": "{content}"}}\n\n'
        elif kind == "on_tool_start":
            name = event["name"]
            yield f'data: {{"tool_start": "{name}"}}\n\n'
        elif kind == "on_tool_end":
            name = event["name"]
            yield f'data: {{"tool_end": "{name}"}}\n\n'
    yield "data: [DONE]\n\n"


@router.get("/health")
async def health():
    return {"status": "ok", "service": "agent-service"}
