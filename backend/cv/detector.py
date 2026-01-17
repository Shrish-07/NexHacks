import requests
import random

# Function to call Overshoot API for event detection
def detect_event_from_video(video_url):
    try:
        # Replace with your actual Overshoot API key
        api_key = "your_overshoot_api_key_here"

        # URL for Overshoot API - replace with the actual endpoint provided by Overshoot
        overshoot_url = "https://api.overshoot.ai/v1/detect"
        headers = {"Authorization": f"Bearer {api_key}"}
        data = {"video_url": video_url}  # Adjust payload as necessary

        response = requests.post(overshoot_url, headers=headers, json=data)
        response_data = response.json()

        if response_data["status"] == "success" and "events" in response_data:
            events = response_data["events"]
            if events:
                # Here you can parse the event to match your requirements
                event = events[0]  # Choose the first event, adjust as needed
                return {
                    "room": event["room"],
                    "type": event["type"],
                    "confidence": event["confidence"],
                    "explanation": event["explanation"]
                }
        return {"error": "No event detected or failed to analyze video"}
    except Exception as e:
        return {"error": str(e)}

# Simulate event detection for testing purposes
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
        "explanation": "Detected event successfully using Overshoot."
    }