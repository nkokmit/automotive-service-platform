"""LangGraph multi-agent graph (Intent Router + Specialized Subgraphs) for the automotive platform."""
from __future__ import annotations
from typing import Any

import httpx
from langgraph.graph import END, StateGraph
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.agent.prompts import (
    ADVISOR_SYSTEM_PROMPT,
    BOOKING_SYSTEM_PROMPT,
    DAMAGE_SYSTEM_PROMPT,
)
from app.agent.router import (
    dispatch_next_node,
    make_router_node,
    route_to_active_agent,
)
from app.agent.state import AgentState
from app.agent.subagents import (
    ADVISOR_AGENT,
    BOOKING_AGENT,
    DAMAGE_AGENT,
    build_react_subgraph,
)
from app.tools import (
    make_booking_tools,
    make_customer_vehicle_tools,
    make_damage_analysis_tool,
    make_search_car_news_tool,
    make_search_used_cars_tool,
)


def build_agent_graph(
    qdrant_client: AsyncQdrantClient,
    db_session_factory: async_sessionmaker,
    http_client: httpx.AsyncClient,
    checkpointer: Any | None = None,
    attached_image_url: str | None = None,
    attached_image_base64: str | None = None,
    attached_vehicle_brand: str | None = None,
    attached_vehicle_segment: str | None = None,
    damage_capture: dict[str, Any] | None = None,
    router_llm: Any | None = None,
    advisor_llm: Any | None = None,
    damage_llm: Any | None = None,
    booking_llm: Any | None = None,
) -> Any:
    """Build and compile the Approach A multi-agent graph (Intent Router + 3 Subgraphs)."""
    search_news = make_search_car_news_tool(qdrant_client)
    search_cars = make_search_used_cars_tool(db_session_factory)
    lookup_vehicle_tool, record_history_tool = make_customer_vehicle_tools(db_session_factory)
    check_slots_tool, create_booking_tool = make_booking_tools(http_client)
    damage_tool = make_damage_analysis_tool(
        http_client,
        attached_image_url=attached_image_url,
        attached_image_base64=attached_image_base64,
        attached_vehicle_brand=attached_vehicle_brand,
        attached_vehicle_segment=attached_vehicle_segment,
        damage_capture=damage_capture,
    )

    advisor_subgraph = build_react_subgraph(
        name=ADVISOR_AGENT,
        system_prompt=ADVISOR_SYSTEM_PROMPT,
        tools=[search_news, search_cars, lookup_vehicle_tool, record_history_tool],
        llm=advisor_llm,
    )
    damage_subgraph = build_react_subgraph(
        name=DAMAGE_AGENT,
        system_prompt=DAMAGE_SYSTEM_PROMPT,
        tools=[damage_tool],
        llm=damage_llm,
    )
    booking_subgraph = build_react_subgraph(
        name=BOOKING_AGENT,
        system_prompt=BOOKING_SYSTEM_PROMPT,
        tools=[check_slots_tool, create_booking_tool],
        llm=booking_llm,
    )

    has_attached_image = bool(attached_image_url or attached_image_base64)
    route_edges = {
        ADVISOR_AGENT: ADVISOR_AGENT,
        DAMAGE_AGENT: DAMAGE_AGENT,
        BOOKING_AGENT: BOOKING_AGENT,
        END: END,
    }

    graph = StateGraph(AgentState)
    graph.add_node("router", make_router_node(router_llm=router_llm, has_attached_image=has_attached_image))
    graph.add_node(ADVISOR_AGENT, advisor_subgraph)
    graph.add_node(DAMAGE_AGENT, damage_subgraph)
    graph.add_node(BOOKING_AGENT, booking_subgraph)
    graph.add_node("dispatch_next", dispatch_next_node)

    graph.set_entry_point("router")
    graph.add_conditional_edges("router", route_to_active_agent, route_edges)

    for agent_name in (ADVISOR_AGENT, DAMAGE_AGENT, BOOKING_AGENT):
        graph.add_edge(agent_name, "dispatch_next")

    graph.add_conditional_edges("dispatch_next", route_to_active_agent, route_edges)

    return graph.compile(checkpointer=checkpointer)
