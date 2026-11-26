"""Specialized ReAct subgraphs for each automotive domain."""
from __future__ import annotations
from datetime import datetime
from typing import Any

from langchain_core.messages import SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from app.agent.llm import create_llm_with_tools
from app.agent.state import AgentState

ADVISOR_AGENT = "advisor_agent"
DAMAGE_AGENT = "damage_agent"
BOOKING_AGENT = "booking_agent"

VALID_AGENTS: tuple[str, ...] = (ADVISOR_AGENT, DAMAGE_AGENT, BOOKING_AGENT)


def build_react_subgraph(
    name: str,
    system_prompt: str,
    tools: list[Any],
    llm: Any | None = None,
) -> Any:
    """Compile a focused ReAct subgraph with its own system prompt and tool subset."""
    bound_llm = llm if llm is not None else create_llm_with_tools(tools)

    async def call_model(state: AgentState) -> dict[str, Any]:
        system = SystemMessage(
            content=system_prompt.format(
                current_time=datetime.now().strftime("%d/%m/%Y %H:%M")
            )
        )
        response = await bound_llm.ainvoke([system] + state["messages"])
        return {"messages": [response]}

    subgraph = StateGraph(AgentState)
    llm_node_name = f"{name}_llm"
    tools_node_name = f"{name}_tools"

    subgraph.add_node(llm_node_name, call_model)
    subgraph.add_node(tools_node_name, ToolNode(tools))

    subgraph.set_entry_point(llm_node_name)
    subgraph.add_conditional_edges(
        llm_node_name,
        tools_condition,
        {"tools": tools_node_name, END: END},
    )
    subgraph.add_edge(tools_node_name, llm_node_name)

    return subgraph.compile()
