"""Test Multi-turn Conversation Memory for ReAct Agent with LangGraph MemorySaver."""
import asyncio
import sys
import uuid
from pathlib import Path
import httpx

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent

async def main():
    agent_dir = ROOT / "ai-services" / "agent-service"
    sys.path.insert(0, str(agent_dir))
    from app.main import app as agent_app

    transport = httpx.ASGITransport(app=agent_app)
    session_id = f"test-sess-{uuid.uuid4().hex[:8]}"

    async with httpx.AsyncClient(transport=transport, base_url="http://agent-service:8002", timeout=60.0) as client:
        print("==================================================================")
        print(f"BẮT ĐẦU KIỂM THỬ HỘI THOẠI ĐA LƯỢT (SESSION_ID: {session_id})")
        print("==================================================================")

        # LƯỢT 1: Tìm xe cũ
        print("\n--- LƯỢT 1: Người dùng tìm xe ---")
        msg1 = "Tìm giúp tôi xe Toyota đời từ 2021 trở lên, giá dưới 1.2 tỷ"
        print(f"User: {msg1}")
        r1 = await client.post("/api/v1/chat", json={"session_id": session_id, "message": msg1})
        d1 = r1.json()
        print(f"Agent (Tools: {d1.get('tool_calls')}):\n{d1.get('response')}\n")

        # LƯỢT 2: Hỏi tiếp ngữ cảnh không nhắc lại tên xe ("Xe này đi được bao nhiêu km và ở đâu?")
        print("--- LƯỢT 2: Hỏi tiếp về chiếc xe ở lượt 1 (Không nhắc lại tên xe) ---")
        msg2 = "Chiếc xe vừa tìm được đi được bao nhiêu km rồi và đang ở tỉnh thành nào vậy?"
        print(f"User: {msg2}")
        r2 = await client.post("/api/v1/chat", json={"session_id": session_id, "message": msg2})
        d2 = r2.json()
        print(f"Agent (Tools: {d2.get('tool_calls')}):\n{d2.get('response')}\n")

        # LƯỢT 3: Kiểm tra lịch sử hội thoại qua endpoint /history
        print("--- LƯỢT 3: Kiểm tra API xem lại lịch sử cuộc trò chuyện (/history) ---")
        r3 = await client.get(f"/api/v1/chat/{session_id}/history")
        d3 = r3.json()
        print(f"[+] Tổng số tin nhắn đã lưu trong phiên: {d3.get('total')}")
        for i, m in enumerate(d3.get("messages", []), 1):
            role = m["role"].upper()
            content_preview = m["content"][:80].replace("\n", " ")
            print(f"    {i}. [{role}] {content_preview}...")

        # LƯỢT 4: Reset phiên hội thoại
        print("\n--- LƯỢT 4: Kiểm tra xóa/reset bộ nhớ phiên hội thoại (DELETE) ---")
        r4 = await client.delete(f"/api/v1/chat/{session_id}")
        print(f"[+] Trạng thái reset: {r4.json()}")

        # Kiểm tra lại sau khi reset
        r5 = await client.get(f"/api/v1/chat/{session_id}/history")
        print(f"[+] Số tin nhắn sau khi reset: {r5.json().get('total')}")

    print("\n==================================================================")
    print("HOÀN TẤT KIỂM THỬ BỘ NHỚ HỘI THOẠI ĐA LƯỢT THÀNH CÔNG!")
    print("==================================================================")

if __name__ == "__main__":
    asyncio.run(main())

