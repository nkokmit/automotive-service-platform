"""LangGraph ReAct agent graph for the automotive platform."""
from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

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
)

logger = logging.getLogger(__name__)
settings = get_settings()


def build_agent_graph(
    qdrant_client: AsyncQdrantClient,
    db_session_factory: async_sessionmaker,
    http_client: httpx.AsyncClient,
) -> Any:
    """Build and compile the LangGraph ReAct agent.

    Args:
        qdrant_client: Async Qdrant client for hybrid search.
        db_session_factory: SQLAlchemy async session factory.
        http_client: Shared httpx client for external services.

    Returns:
        Compiled LangGraph CompiledGraph.
    """
    # ── Build tools ──────────────────────────────────────────────────────────
    search_news = make_search_car_news_tool(qdrant_client)
    search_cars = make_search_used_cars_tool(db_session_factory)
    check_slots_tool, create_booking_tool = make_booking_tools(http_client)

    tools = [search_news, search_cars, check_slots_tool, create_booking_tool]

    # ── LLM ──────────────────────────────────────────────────────────────────
    llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=0.1,
        streaming=True,
    ).bind_tools(tools)

    # ── Nodes ─────────────────────────────────────────────────────────────────
    def agent_node(state: AgentState) -> dict:
        """Call the LLM with current messages."""
        system = SystemMessage(
            content=SYSTEM_PROMPT.format(
                current_time=datetime.now().strftime("%d/%m/%Y %H:%M")
            )
        )
        messages = [system] + state["messages"]
        response = llm.invoke(messages)
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

    return graph.compile()
