import requests
import random
from backend.config import OVERSHOOT_API_KEY  

def detect_event_from_video(video_url):
    try:
        overshoot_url = "https://api.overshoot.ai/v1/detect"
        headers = {"Authorization": f"Bearer {OVERSHOOT_API_KEY}"}
        data = {"video_url": video_url}  

        response = requests.post(overshoot_url, headers=headers, json=data)
        response_data = response.json()

        if response_data.get("status") == "success" and "events" in response_data:
            events = response_data["events"]
            if events:
                event = events[0]
                return {
                    "room": event["room"],
                    "type": event["type"],
                    "confidence": event["confidence"],
                    "explanation": event["explanation"]
                }
        return {"error": "No event detected or failed to analyze video"}
    except Exception as e:
        return {"error": f"Error: {str(e)}"}

def detect_event():
    events = [
        ("Fall detected", 0.91),
        ("Bed exit detected", 0.87),
        ("Wandering detected", 0.82),
        ("Prolonged inactivity", 0.78)
    ]
    room = random.randint(1, 6)
    event, confidence = random.choice(events)
    return {
        "room": room,
        "type": event,
        "confidence": confidence,
        "explanation": "Event detected successfully."
    }