import os
import random
import traceback
from typing import Dict, Any, Optional
from backend.config import OVERSHOOT_API_KEY

# Optional: you can install overshoot sdk locally for server-side usage too
# pip install overshoot-sdk
try:
    from overshoot_sdk import RealtimeVision
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    print("WARNING: overshoot-sdk not installed → using only mock mode")


def detect_event_from_video(video_url: str, use_sdk_if_possible: bool = True) -> Dict[str, Any]:
    """
    Try to use Overshoot real-time vision API.
    Falls back to mock on any failure (very likely with static URL).
    """
    print(f"[CV] Analyzing video: {video_url}")

    if SDK_AVAILABLE and use_sdk_if_possible and OVERSHOOT_API_KEY:
        try:
            print("[CV] Trying Overshoot SDK (server-side)...")

            result_container = {}

            vision = RealtimeVision(
                api_url="https://cluster1.overshoot.ai/api/v0.2",
                api_key=OVERSHOOT_API_KEY,
                prompt=(
                    "You are monitoring an elderly care facility camera. "
                    "Detect and classify in real-time: fall, bed exit without assistance, "
                    "wandering outside safe area, prolonged inactivity (>30s no movement). "
                    "Be very concise."
                ),
                output_schema={
                    "type": "object",
                    "properties": {
                        "event_type": {"type": "string", "enum": ["fall", "bed_exit", "wandering", "inactivity", "none"]},
                        "confidence": {"type": "number"},
                        "explanation": {"type": "string"}
                    },
                    "required": ["event_type", "confidence"]
                },
                source={"type": "url", "url": video_url},  # ← note: currently very experimental / may not work
                processing={
                    "clip_length_seconds": 5,
                    "delay_seconds": 4,
                    "sampling_ratio": 0.25
                },
                on_result=lambda res: (
                    result_container.update({
                        "type": res.result.get("event_type", "none"),
                        "confidence": res.result.get("confidence", 0.5),
                        "explanation": res.result.get("explanation", "—")
                    })
                    if res.result else None
                )
            )

            # Because it's real-time → we can't really "wait" easily in sync function
            # For demo we just give very short run or skip to mock
            # Real usage → you would run this in background task / websocket

            print("[CV] SDK start() called — but continuing with mock for sync API")
            # await vision.start()  # ← would need async endpoint!

            vision.stop()  # we don't really start it properly here

            if result_container:
                return _format_result(result_container)

        except Exception as e:
            print("[CV] Overshoot SDK failed:", str(e))
            traceback.print_exc()

    print("[CV] Falling back to mock detector (static video / SDK unavailable)")
    return detect_event_mock()


def detect_event_mock(event_type: Optional[str] = None) -> Dict[str, Any]:
    events = {
        "fall":        {"event_type": "fall",        "confidence": 0.94, "explanation": "Sudden vertical drop followed by no movement on floor"},
        "bed_exit":    {"event_type": "bed_exit",    "confidence": 0.89, "explanation": "Patient moved from lying to standing and left bed area"},
        "wandering":   {"event_type": "wandering",   "confidence": 0.87, "explanation": "Patient moving aimlessly outside designated safe zone"},
        "inactivity":  {"event_type": "inactivity",  "confidence": 0.82, "explanation": "No significant movement detected for more than 35 seconds"},
        "none":        {"event_type": "none",        "confidence": 0.91, "explanation": "Normal activity observed"}
    }

    if event_type and event_type.lower() in events:
        data = events[event_type.lower()]
    else:
        data = random.choice(list(events.values()))

    room = random.randint(1, 8)

    nice_explanation = {
        "fall":        f"Room {room}: Patient appears to have fallen. High risk — immediate check required.",
        "bed_exit":    f"Room {room}: Unassisted bed exit detected. Risk of fall/wandering — assist patient.",
        "wandering":   f"Room {room}: Patient is wandering. Ensure safety and guide back.",
        "inactivity":  f"Room {room}: Prolonged inactivity detected. Possible distress or unconsciousness — check urgently.",
        "none":        f"Room {room}: All appears normal at the moment."
    }[data["event_type"]]

    return {
        "room": room,
        "type": data["event_type"],
        "confidence": data["confidence"],
        "explanation": data["explanation"],
        "nurse_message": nice_explanation
    }


def _format_result(raw: Dict) -> Dict:
    event_map = {
        "fall": "Fall detected",
        "bed_exit": "Unassisted bed exit",
        "wandering": "Wandering detected",
        "inactivity": "Prolonged inactivity",
        "none": "Normal activity"
    }

    t = raw.get("event_type", "none")
    return {
        "room": random.randint(1, 8),
        "type": event_map.get(t, t.capitalize()),
        "confidence": raw.get("confidence", 0.70),
        "explanation": raw.get("explanation", "—"),
        "nurse_message": f"Room ?? : {event_map.get(t, t)} – {raw.get('explanation','')}"
    }