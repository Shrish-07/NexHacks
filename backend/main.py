from fastapi import FastAPI
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

OVERSHOOT_API_KEY = os.getenv("OVERSHOOT_API_KEY")

@app.get("/event")
async def event(video_url: str = None):
    if video_url:
        overshoot_api_url = "https://api.overshoot.ai/detect"
        headers = {
            "Authorization": f"Bearer {OVERSHOOT_API_KEY}"
        }
        
        response = requests.post(overshoot_api_url, headers=headers, json={"video_url": video_url})
        if response.status_code == 200:
            event_data = response.json()
            return {
                "room": event_data["room"],
                "type": event_data["event_type"],
                "confidence": event_data["confidence"],
                "explanation": event_data["explanation"]
            }
        else:
            return {"error": "Failed to detect event", "status": response.status_code}
    else:
        return {
            "room": 3,
            "type": "Fall detected",
            "confidence": 0.91,
            "explanation": "Event detected successfully."
        }