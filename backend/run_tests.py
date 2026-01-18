# backend/run_tests.py
"""
Minimal integration smoke tests for NexHacks backend
Run with:  python -m backend.run_tests    (from project root)
"""

import asyncio
import os
import sys

# Make sure we can import from backend/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from datetime import timedelta

from backend.config import (
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    OVERSHOOT_API_KEY,
    TOKEN_KEY,
)
from backend.voice.token import create_agent_token
from backend.cv.detector import detect_event, detect_event_from_video
from backend.events.manager import process_event
# from backend.notifications import send_sms_alert     # uncomment when Twilio ready

TIMEOUT = 12

def test_config_loads():
    print("\n[TEST] Config loading")
    required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
    missing = [k for k in required if not globals().get(k)]
    if missing:
        print(f"→ [WARN] Missing env vars: {', '.join(missing)}")
    else:
        print("→ [OK] Core config keys present")

def test_token_generation():
    print("\n[TEST] Agent token generation")
    try:
        token = create_agent_token(
            room_name="smoketest_room",
            identity="test_agent_001",
            ttl=timedelta(minutes=30)
        )
        print(f"→ [OK] Token generated ({len(token)} chars)")
        return token
    except Exception as e:
        print(f"→ [FAIL] {e}")
        return None

def test_mock_detection():
    print("\n[TEST] Mock event detection")
    try:
        result = process_event()   # uses detect_event()
        print(f"→ [OK] Got result: {result}")
    except Exception as e:
        print(f"→ [FAIL] {e}")

def test_video_detection():
    print("\n[TEST] Video event detection (real API)")
    if not OVERSHOOT_API_KEY or OVERSHOOT_API_KEY == "placeholder":  # Add your placeholder check if needed
        print("→ [SKIP] OVERSHOOT_API_KEY not set or invalid")
        return
    # Use a short, public, safe video if you want real test
    test_url = "https://filesamples.com/samples/video/mp4/sample_640x360.mp4"
    try:
        result = detect_event_from_video(test_url)
        if "error" in result:
            print(f"→ [WARN] API error: {result['error']}")
        else:
            print(f"→ [OK] API responded: {result}")
    except Exception as e:
        print(f"→ [FAIL] {type(e).__name__}: {e}")

async def test_livekit_connect_short(token):
    if not token or not LIVEKIT_URL:
        print("\n[TEST] LiveKit connection → [SKIP] no token or URL")
        return
    print("\n[TEST] LiveKit short connection test")
    from livekit import rtc
    room = rtc.Room()
    disconnected = asyncio.Event()
    def on_disconnect(*args):
        print("  → Disconnected")
        disconnected.set()
    room.on("disconnected", on_disconnect)
    try:
        print(f"  → Connecting to {LIVEKIT_URL} ...")
        await asyncio.wait_for(
            room.connect(url=LIVEKIT_URL, token=token),
            timeout=8.0
        )
        print("  → [OK] Connected")
        await asyncio.sleep(4)  # give some time to observe
    except Exception as e:
        print(f"  → [FAIL] {type(e).__name__}: {e}")
    finally:
        await room.disconnect()

async def main():
    print("=== NexHacks Backend Smoke Tests ===\n")
    test_config_loads()
    token = test_token_generation()
    test_mock_detection()
    test_video_detection()
    if token:
        await test_livekit_connect_short(token)
    print("\n=== Done ===\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped.")
    except Exception as e:
        print(f"\nUnexpected: {e}")
        sys.exit(1)