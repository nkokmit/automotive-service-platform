"""LangGraph ReAct agent graph for the automotive platform."""
from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
import httpx
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.agent.state import AgentState
from app.agent.prompts import SYSTEM_PROMPT
from app.config import get_settings
from app.tools import (
    make_search_car_news_tool,
    make_search_used_cars_tool,
    make_booking_tools,
    make_damage_analysis_tool,
)

logger = logging.getLogger(__name__)
settings = get_settings()


def _create_llm_with_tools(tools: list[Any]):
    """Instantiate Google Gemini (with multi-model fallbacks for 503/429 resilience) or OpenAI LLM."""
    if settings.gemini_api_key:
        api_key = settings.gemini_api_key.strip()
        candidate_models = [
            settings.gemini_model,
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-flash-lite-latest",
            "gemini-flash-latest",
        ]
        # Deduplicate while preserving order
        # fromkeys là một cách để loại bỏ các phần tử trùng lặp trong danh sách, giữ nguyên thứ tự xuất hiện của chúng.
        unique_models = list(dict.fromkeys(candidate_models))
        bound_llms = [
            ChatGoogleGenerativeAI( 
                model=m,
                google_api_key=api_key,
                temperature=0.1,
                max_retries=2,
            ).bind_tools(tools)
            for m in unique_models
        ]
        primary = bound_llms[0]
        if len(bound_llms) > 1:
            return primary.with_fallbacks(bound_llms[1:])
        return primary

    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key.strip(),
        temperature=0.1,
    ).bind_tools(tools)


def build_agent_graph(
    qdrant_client: AsyncQdrantClient,
    db_session_factory: async_sessionmaker,
    http_client: httpx.AsyncClient,
    checkpointer: Any | None = None,
    attached_image_url: str | None = None,
    attached_image_base64: str | None = None,
) -> Any:
    """Build and compile the LangGraph ReAct agent with 5 tools."""
    # ── Build tools ──────────────────────────────────────────────────────────
    search_news = make_search_car_news_tool(qdrant_client)
    search_cars = make_search_used_cars_tool(db_session_factory)
    check_slots_tool, create_booking_tool = make_booking_tools(http_client)
    damage_tool = make_damage_analysis_tool(
        http_client,
        attached_image_url=attached_image_url,
        attached_image_base64=attached_image_base64,
    )

    tools = [
        search_news,
        search_cars,
        check_slots_tool,
        create_booking_tool,
        damage_tool,
    ]

    # ── LLM ──────────────────────────────────────────────────────────────────
    llm = _create_llm_with_tools(tools)

    # ── Nodes ─────────────────────────────────────────────────────────────────
    async def agent_node(state: AgentState) -> dict:
        """Call the LLM with current messages."""
        system = SystemMessage(
            content=SYSTEM_PROMPT.format(
                current_time=datetime.now().strftime("%d/%m/%Y %H:%M")
            )
        )
        messages = [system] + state["messages"]
        response = await llm.ainvoke(messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)

    # ── Graph ─────────────────────────────────────────────────────────────────
    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("agent")
    graph.add_conditional_edges(
        "agent",
        tools_condition,
        {"tools": "tools", END: END},
    )
    graph.add_edge("tools", "agent")

    return graph.compile(checkpointer=checkpointer)
