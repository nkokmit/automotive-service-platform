"""LangGraph agent state definition for multi-agent routing."""
from typing import Annotated, Optional
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """Shared state across the intent router and specialized sub-agents."""
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    user_id: Optional[str]
    route_queue: list[str]
    active_agent: Optional[str]
