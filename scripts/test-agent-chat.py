"""Test script to verify AI Agent ReAct flow and tools via HTTP API.

Usage:
    & "C:\code\vehicle-damage-detection-assessment\env\Scripts\python.exe" scripts/test-agent-chat.py
"""
import base64
import sys
import httpx
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

AGENT_URL = "http://localhost:8002/api/v1/chat"
DAMAGE_URL = "http://localhost:8001/api/v1/detect"
TEST_IMG = Path(r"C:\code\vehicle-damage-detection-assessment\data\CarDD_COCO\test2017\000012.jpg")


def test_damage_service_directly():
    print("\n--- 1. Testing Damage Detection Service directly ---")
    if not TEST_IMG.exists():
        print(f"[!] Test image not found: {TEST_IMG}")
        return

    b64_img = base64.b64encode(TEST_IMG.read_bytes()).decode("utf-8")
    try:
        resp = httpx.post(
            DAMAGE_URL,
            json={"image_base64": b64_img, "conf_threshold": 0.20},
            timeout=30.0,
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Detected: {data.get('num_detections')} damages | Severity: {data.get('overall_severity')}")
        print(f"Summary: {data.get('summary')}")
    except httpx.ConnectError:
        print("[!] Damage service not running on port 8001. Run .\\scripts\\run-local.ps1 first.")


def test_agent_chat(prompt: str):
    print(f"\n--- Testing Agent with prompt: '{prompt}' ---")
    try:
        resp = httpx.post(
            AGENT_URL,
            json={"message": prompt},
            timeout=60.0,
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Tools called: {data.get('tool_calls')}")
        print(f"Response:\n{data.get('response')}")
    except httpx.ConnectError:
        print("[!] Agent service not running on port 8002. Run .\\scripts\\run-local.ps1 first.")


if __name__ == "__main__":
    test_damage_service_directly()
    test_agent_chat("Tìm giúp tôi xe Toyota hoặc VinFast đời 2022 trở lên, giá dưới 1.2 tỷ")

