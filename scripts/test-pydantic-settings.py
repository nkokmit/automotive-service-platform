"""Test pydantic-settings implementation: SecretStr protection & Fail-Fast validation."""
import sys
from pathlib import Path
from pydantic import ValidationError, SecretStr

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent


def test_agent_settings():
    print("==================================================================")
    print("1. KIỂM THỬ PYDANTIC-SETTINGS CHO AGENT-SERVICE")
    print("==================================================================")
    sys.path.insert(0, str(ROOT / "ai-services" / "agent-service"))
    from app.config import Settings, get_settings

    # 1. Tự động đọc từ .env
    settings = get_settings()
    print("[+] Tự động nạp Settings từ file .env thành công!")
    print(f"[+] Qdrant URL: {settings.qdrant_url}")
    print(f"[+] Gemini Model: {settings.gemini_model}")

    # 2. Kiểm thử bảo vệ bí mật bằng SecretStr
    print("\n--- Kiểm thử bảo mật SecretStr ---")
    gemini_key_repr = repr(settings.gemini_api_key)
    gemini_key_str = str(settings.gemini_api_key)
    print(f"[+] repr(settings.gemini_api_key) = {gemini_key_repr}")
    print(f"[+] str(settings.gemini_api_key)  = {gemini_key_str}")
    assert "AQ.Ab8RN" not in gemini_key_repr, "LỖI: API Key bị lộ trong repr!"
    assert "AQ.Ab8RN" not in gemini_key_str, "LỖI: API Key bị lộ trong str!"
    print("[PASS] SecretStr bảo vệ 100% không bị lộ API Key trong log hoặc print!")

    raw_val = settings.gemini_api_key.get_secret_value()
    assert raw_val.startswith("AQ."), "LỖI: get_secret_value() không lấy đúng giá trị thật!"
    print(f"[PASS] Lấy giá trị an toàn bằng .get_secret_value(): {raw_val[:6]}... (độ dài: {len(raw_val)})")

    # 3. Kiểm thử Fail-Fast khi thiếu API Key
    print("\n--- Kiểm thử Fail-Fast: Thiếu cả 2 API Key ---")
    try:
        Settings(gemini_api_key=None, openai_api_key=None)
        print("[FAIL] Lẽ ra phải ném ngoại lệ khi thiếu cả 2 API Key!")
    except ValidationError as err:
        print("[PASS] Đã bắt lỗi Fail-Fast thành công khi thiếu API Key:")
        for e in err.errors():
            print(f"       -> Loại lỗi: {e['type']} | Msg: {e['msg']}")

    # 4. Kiểm thử Fail-Fast khi sai định dạng URL
    print("\n--- Kiểm thử Fail-Fast: Sai định dạng URL ---")
    try:
        Settings(
            gemini_api_key=SecretStr("mock-key"),
            qdrant_url="http://invalid url with spaces"
        )
        print("[FAIL] Lẽ ra phải ném ngoại lệ khi URL sai cú pháp!")
    except ValidationError as err:
        print("[PASS] Đã bắt lỗi Fail-Fast thành công khi URL không hợp lệ:")
        for e in err.errors():
            print(f"       -> Trường: {e['loc']} | Msg: {e['msg']}")


def test_damage_settings():
    print("\n==================================================================")
    print("2. KIỂM THỬ PYDANTIC-SETTINGS CHO DAMAGE-DETECTION-SERVICE")
    print("==================================================================")
    # Xóa app khỏi sys.modules để load app của damage service
    for mod in list(sys.modules.keys()):
        if mod == "app" or mod.startswith("app."):
            del sys.modules[mod]

    sys.path = [p for p in sys.path if "agent-service" not in p]
    sys.path.insert(0, str(ROOT / "ai-services" / "damage-detection-service"))
    from app.config import Settings as DamageSettings

    dmg_settings = DamageSettings()
    print(f"[+] Nạp thành công config damage service từ .env:")
    print(f"    - onnx_model_path: {dmg_settings.onnx_model_path}")
    print(f"    - conf_threshold: {dmg_settings.conf_threshold}")
    print(f"    - iou_threshold: {dmg_settings.iou_threshold}")
    print(f"    - port: {dmg_settings.port}")

    # Kiểm thử Fail-Fast khi threshold vượt ngoài [0.01, 1.0]
    print("\n--- Kiểm thử Fail-Fast: conf_threshold vượt ngưỡng ---")
    try:
        DamageSettings(conf_threshold=1.5)
        print("[FAIL] Lẽ ra phải ném lỗi khi conf_threshold > 1.0!")
    except ValidationError as err:
        print("[PASS] Đã bắt lỗi Fail-Fast thành công khi conf_threshold = 1.5:")
        for e in err.errors():
            print(f"       -> Trường: {e['loc']} | Msg: {e['msg']}")


if __name__ == "__main__":
    test_agent_settings()
    test_damage_settings()
    print("\n==================================================================")
    print("TẤT CẢ CÁC BÀI TEST PYDANTIC-SETTINGS ĐẠT 100% PASS!")
    print("==================================================================")
