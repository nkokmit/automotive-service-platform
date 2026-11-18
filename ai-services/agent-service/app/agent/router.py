"""Intent router and sequential dispatcher for the multi-agent graph."""
from __future__ import annotations
import logging
from typing import Any, Literal

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END
from pydantic import BaseModel, Field

from app.agent.llm import create_router_llm
from app.agent.prompts import ROUTER_SYSTEM_PROMPT
from app.agent.state import AgentState
from app.agent.subagents import (
    ADVISOR_AGENT,
    BOOKING_AGENT,
    DAMAGE_AGENT,
    VALID_AGENTS,
)

logger = logging.getLogger(__name__)

AgentName = Literal["advisor_agent", "damage_agent", "booking_agent"]


class RouteDecision(BaseModel):
    """Structured routing output selecting 1 or more specialized agents in order."""

    agents: list[AgentName] = Field(
        min_length=1,
        description="Ordered list of sub-agents to handle the current user turn.",
    )
    reason: str = Field(
        default="",
        description="Brief explanation of why these agents were selected.",
    )


def _recent_context_messages(messages: list[BaseMessage], limit: int = 4) -> list[BaseMessage]:
    """Extract the most recent Human/AI text turns (excluding bulky tool payloads) for routing."""
    filtered: list[BaseMessage] = []
    for msg in messages:
        if hasattr(msg, "tool_call_id"):
            continue
        content = msg.content
        if isinstance(content, str) and not content.strip():
            continue
        filtered.append(msg)
    return filtered[-limit:] if filtered else messages[-1:]


def make_router_node(
    router_llm: Any | None = None,
    has_attached_image: bool = False,
):
    """Create the intent-classification router node."""
    base_llm = router_llm if router_llm is not None else create_router_llm()
    structured_llm = base_llm.with_structured_output(RouteDecision)

    async def route_intent(state: AgentState) -> dict[str, Any]:
        default_route = [DAMAGE_AGENT] if has_attached_image else [ADVISOR_AGENT]
        try:
            recent = _recent_context_messages(state["messages"])
            decision: RouteDecision = await structured_llm.ainvoke(
                [SystemMessage(content=ROUTER_SYSTEM_PROMPT)] + recent
            )
            chosen = list(dict.fromkeys(decision.agents))
        except Exception as exc:
            logger.warning("Router classification failed (%s), using fallback %s", exc, default_route)
            chosen = default_route

        if not chosen:
            chosen = default_route

        if has_attached_image and DAMAGE_AGENT not in chosen:
            chosen = [DAMAGE_AGENT] + chosen

        logger.info("Router selected agents: %s", chosen)
        return {
            "active_agent": chosen[0],
            "route_queue": chosen[1:],
        }

    return route_intent


def dispatch_next_node(state: AgentState) -> dict[str, Any]:
    """Pop the next queued sub-agent into active_agent, or clear when done."""
    queue = list(state.get("route_queue") or [])
    if queue:
        return {
            "active_agent": queue[0],
            "route_queue": queue[1:],
        }
    return {
        "active_agent": None,
        "route_queue": [],
    }


def route_to_active_agent(state: AgentState) -> str:
    """Conditional edge helper returning the active sub-agent name or END."""
    active = state.get("active_agent")
    if active in VALID_AGENTS:
        return active
    return END
