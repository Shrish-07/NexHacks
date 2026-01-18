from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.events.manager import process_event

app = FastAPI(title="NexHacks Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/event")
async def event(video_url: str | None = None, type: str | None = None):
    return process_event(video_url=video_url, event_type=type)

class VoiceAlert(BaseModel):
    room: str
    event: str
    transcript: str

@app.post("/alert")
async def alert(alert: VoiceAlert):
    print(f"\n🚨 VOICE ALERT RECEIVED 🚨\nRoom: {alert.room}\nEvent: {alert.event}\nTranscript: {alert.transcript}\n")
    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}