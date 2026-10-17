"""LangGraph agent state definition."""
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """State for the ReAct automotive agent."""
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    user_id: str | None
