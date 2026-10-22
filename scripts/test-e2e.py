"""End-to-End Integration Test for ReAct AI Agent (Google Gemini) + YOLOv8s ONNX Damage Detection."""
import asyncio
import base64
import importlib.util
import sys
from pathlib import Path
import httpx

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
TEST_IMG = Path(r"C:\code\vehicle-damage-detection-assessment\data\CarDD_COCO\test2017\000012.jpg")


def _load_damage_detector():
    damage_dir = ROOT / "ai-services" / "damage-detection-service"
    sys.path.insert(0, str(damage_dir))
    from app.models.yolo_onnx import YoloOnnxDetector, _compute_overall_severity
    detector = YoloOnnxDetector(str(damage_dir / "app" / "models" / "yolov8s-seg.onnx"))
    sys.path.pop(0)
    for mod in list(sys.modules.keys()):
        if mod == "app" or mod.startswith("app."):
            del sys.modules[mod]
    return detector, _compute_overall_severity


async def main():
    print("==================================================================")
    print("1. KIỂM THỬ MODEL YOLOv8s-seg ONNX TRỰC TIẾP")
    print("==================================================================")
    import cv2
    detector, compute_overall = _load_damage_detector()
    bgr = cv2.imread(str(TEST_IMG))
    damages = detector.detect(bgr, conf_threshold=0.20)
    overall = compute_overall(damages)
    print(f"[+] Classes model hỗ trợ: {detector.classes}")
    print(f"[+] Phát hiện: {len(damages)} vùng hư hỏng | Mức độ tổng thể: {overall.upper()}")
    for d in damages:
        print(f"    - {d.class_name}: confidence={d.confidence:.2%}, bbox={d.bbox}, severity={d.severity}")

    # Load agent-service
    agent_dir = ROOT / "ai-services" / "agent-service"
    sys.path.insert(0, str(agent_dir))
    from app.main import app as agent_app
    from app.dependencies import get_http_client

    # Create mock transport that serves damage-detection-service with real ONNX detector
    # and lets garage-service fall back or return mock slots
    def mock_handler(request: httpx.Request) -> httpx.Response:
        if "/api/v1/detect" in str(request.url):
            parts = list({d.class_name for d in damages})
            summary = f"Phát hiện {len(damages)} vùng hư hỏng: {', '.join(parts)}. Mức độ tổng thể: {overall}."
            return httpx.Response(
                200,
                json={
                    "success": True,
                    "num_detections": len(damages),
                    "damages": [d.model_dump() for d in damages],
                    "overall_severity": overall,
                    "summary": summary,
                    "image_width": bgr.shape[1],
                    "image_height": bgr.shape[0],
                    "processing_time_ms": 420.5,
                },
            )
        raise httpx.ConnectError("Service offline (triggering fallback)")

    mock_http_client = httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))
    agent_app.dependency_overrides[get_http_client] = lambda: mock_http_client

    transport = httpx.ASGITransport(app=agent_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://agent-service:8002", timeout=60.0) as client:
        print("\n==================================================================")
        print("2. TEST TOOL 1: search_car_news (Tin tức & Bảo dưỡng)")
        print("==================================================================")
        r1 = await client.post(
            "/api/v1/chat",
            json={"message": "Cho tôi hỏi các mốc bảo dưỡng định kỳ xe ô tô quan trọng và cách chăm sóc lốp xe?"},
        )
        d1 = r1.json()
        print(f"[+] Status: {r1.status_code} | Tools được gọi: {d1.get('tool_calls')}")
        print(f"[+] Phản hồi của Agent:\n{d1.get('response')}")

        print("\n==================================================================")
        print("3. TEST TOOL 2: search_used_cars (Tìm xe cũ theo hãng/giá/đời)")
        print("==================================================================")
        r2 = await client.post(
            "/api/v1/chat",
            json={"message": "Tìm giúp tôi xe Toyota đời từ 2021 trở lên, giá dưới 1.2 tỷ"},
        )
        d2 = r2.json()
        print(f"[+] Status: {r2.status_code} | Tools được gọi: {d2.get('tool_calls')}")
        print(f"[+] Phản hồi của Agent:\n{d2.get('response')}")

        print("\n==================================================================")
        print("4. TEST TOOL 3 & 4: check_slots + create_booking (Đặt lịch sửa xe)")
        print("==================================================================")
        r3 = await client.post(
            "/api/v1/chat",
            json={
                "message": (
                    "Tôi ĐÃ XÁC NHẬN thông tin, hãy gọi check_slots kiểm tra giờ trống tại garage AutoCare "
                    "(garage_id: autocare-hn) ngày 2026-10-25, và gọi luôn create_booking để đặt lịch ngay "
                    "vào lúc 09:30 cho dịch vụ tire_rotation, tên khách hàng Nguyễn Văn Hùng, SĐT 0912345678."
                )
            },
        )
        d3 = r3.json()
        print(f"[+] Status: {r3.status_code} | Tools được gọi: {d3.get('tool_calls')}")
        print(f"[+] Phản hồi của Agent:\n{d3.get('response')}")

        print("\n==================================================================")
        print("5. TEST TOOL 5: analyze_vehicle_damage (Phân tích ảnh hư hỏng qua YOLOv8s ONNX)")
        print("==================================================================")
        b64_img = base64.b64encode(TEST_IMG.read_bytes()).decode("utf-8")
        r4 = await client.post(
            "/api/v1/chat",
            json={
                "message": "Tôi gửi kèm ảnh xe của tôi, hãy phân tích xem xe bị hư hỏng gì và tư vấn cách xử lý.",
                "image_base64": b64_img,
            },
        )
        d4 = r4.json()
        print(f"[+] Status: {r4.status_code} | Tools được gọi: {d4.get('tool_calls')}")
        print(f"[+] Phản hồi của Agent:\n{d4.get('response')}")

    await mock_http_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
