"""Unit tests for Approach A multi-agent graph (Intent Router + Specialized Subgraphs)."""
from __future__ import annotations
import asyncio
import sys
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver

AGENT_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(AGENT_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_SERVICE_DIR))

from app.agent.graph import build_agent_graph  # noqa: E402
from app.agent.router import RouteDecision  # noqa: E402
from app.routers.chat import _stream_response  # noqa: E402


class FakeRouterLLM:
    """Mock router LLM supporting with_structured_output."""

    def __init__(self, decision: RouteDecision | Exception):
        self._decision = decision

    def with_structured_output(self, schema: Any) -> "FakeRouterLLM":
        return self

    async def ainvoke(self, messages: list[Any]) -> RouteDecision:
        if isinstance(self._decision, Exception):
            raise self._decision
        return self._decision


class FakeSubAgentLLM:
    """Mock sub-agent LLM returning a fixed AIMessage and recording call count."""

    def __init__(self, reply_text: str):
        self.reply_text = reply_text
        self.calls = 0

    async def ainvoke(self, messages: list[Any]) -> AIMessage:
        self.calls += 1
        return AIMessage(content=self.reply_text)


def _dummy_deps():
    return MagicMock(), MagicMock(), MagicMock()


def test_single_intent_routes_only_to_advisor():
    async def _run():
        qdrant, db, http = _dummy_deps()
        router_llm = FakeRouterLLM(RouteDecision(agents=["advisor_agent"], reason="car advice"))
        advisor_llm = FakeSubAgentLLM("Nên thay dầu mỗi 5.000 km.")
        damage_llm = FakeSubAgentLLM("Damage response")
        booking_llm = FakeSubAgentLLM("Booking response")

        graph = build_agent_graph(
            qdrant,
            db,
            http,
            checkpointer=MemorySaver(),
            router_llm=router_llm,
            advisor_llm=advisor_llm,
            damage_llm=damage_llm,
            booking_llm=booking_llm,
        )

        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content="Bao lâu nên thay dầu nhớt?")],
                "session_id": "s1",
                "user_id": None,
                "route_queue": [],
                "active_agent": None,
            },
            config={"configurable": {"thread_id": "s1"}},
        )

        assert advisor_llm.calls == 1
        assert damage_llm.calls == 0
        assert booking_llm.calls == 0
        assert result["messages"][-1].content == "Nên thay dầu mỗi 5.000 km."
        assert result["active_agent"] is None
        assert result["route_queue"] == []

    asyncio.run(_run())


def test_multi_intent_runs_damage_then_booking_sequentially():
    async def _run():
        qdrant, db, http = _dummy_deps()
        router_llm = FakeRouterLLM(
            RouteDecision(agents=["damage_agent", "booking_agent"], reason="damage + booking")
        )
        advisor_llm = FakeSubAgentLLM("Advisor response")
        damage_llm = FakeSubAgentLLM("Phát hiện trầy xước cản trước (~800.000 VNĐ).")
        booking_llm = FakeSubAgentLLM("Đã kiểm tra slot trống 09:00 ngày mai, bạn xác nhận đặt lịch nhé?")

        graph = build_agent_graph(
            qdrant,
            db,
            http,
            checkpointer=MemorySaver(),
            attached_image_url="https://example.com/car.jpg",
            router_llm=router_llm,
            advisor_llm=advisor_llm,
            damage_llm=damage_llm,
            booking_llm=booking_llm,
        )

        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content="Xem ảnh xe này giúp tôi và đặt lịch sửa sáng mai.")],
                "session_id": "s2",
                "user_id": None,
                "route_queue": [],
                "active_agent": None,
            },
            config={"configurable": {"thread_id": "s2"}},
        )

        assert damage_llm.calls == 1
        assert booking_llm.calls == 1
        assert advisor_llm.calls == 0
        ai_contents = [m.content for m in result["messages"] if isinstance(m, AIMessage)]
        assert ai_contents == [
            "Phát hiện trầy xước cản trước (~800.000 VNĐ).",
            "Đã kiểm tra slot trống 09:00 ngày mai, bạn xác nhận đặt lịch nhé?",
        ]

    asyncio.run(_run())


def test_router_fallback_on_error_and_attached_image():
    async def _run():
        qdrant, db, http = _dummy_deps()
        router_llm = FakeRouterLLM(RuntimeError("router timeout"))
        advisor_llm = FakeSubAgentLLM("Advisor fallback")
        damage_llm = FakeSubAgentLLM("Damage fallback")
        booking_llm = FakeSubAgentLLM("Booking fallback")

        graph = build_agent_graph(
            qdrant,
            db,
            http,
            attached_image_base64="ZmFrZQ==",
            router_llm=router_llm,
            advisor_llm=advisor_llm,
            damage_llm=damage_llm,
            booking_llm=booking_llm,
        )

        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content="Kiểm tra giúp mình")],
                "session_id": "s3",
                "user_id": None,
                "route_queue": [],
                "active_agent": None,
            }
        )

        assert damage_llm.calls == 1
        assert advisor_llm.calls == 0
        assert booking_llm.calls == 0
        assert result["messages"][-1].content == "Damage fallback"

    asyncio.run(_run())


def test_stream_response_filters_router_tokens():
    class FakeChunk:
        def __init__(self, content: str):
            self.content = content

    class FakeGraph:
        async def astream_events(self, initial_state, config=None, version="v2"):
            yield {
                "event": "on_chat_model_stream",
                "metadata": {"langgraph_node": "router"},
                "data": {"chunk": FakeChunk('{"agents":["advisor_agent"]}')},
            }
            yield {
                "event": "on_chat_model_stream",
                "metadata": {"langgraph_node": "advisor_agent_llm"},
                "data": {"chunk": FakeChunk("Xin chào!")},
            }

    async def _run():
        chunks = []
        async for item in _stream_response(FakeGraph(), {}, {}, "sess-1"):
            chunks.append(item)
        joined = "".join(chunks)
        assert "advisor_agent" not in joined
        assert "Xin chào!" in joined
        assert "[DONE]" in joined

    asyncio.run(_run())
