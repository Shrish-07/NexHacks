import re
import os
import httpx
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli

# Backend URL - use environment variable or default to localhost for development
BACKEND_ALERT_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:3000') + '/alert'

DISTRESS_KEYWORDS = [
    "help",
    "help me",
    "choking",
    "can't breathe",
    "cannot breathe",
    "pain",
    "emergency",
    "falling",
    "seizure",
]

def detect_distress(text: str) -> bool:
    text = text.lower()
    return any(keyword in text for keyword in DISTRESS_KEYWORDS)

class PatientMonitorAgent(Agent):
    async def on_session_start(self, session: AgentSession):
        print(f"🟢 [AGENT] Monitoring room: {session.room.name}")
        print(f"🎤 [AGENT] Listening for keywords: {DISTRESS_KEYWORDS}")
        print(f"📍 [AGENT] Room ID: {session.room.name}")
        print(f"👤 [AGENT] Participant: {session.participant_id if hasattr(session, 'participant_id') else 'N/A'}")

        async for message in session.listen():
            if not message.text:
                print(f"[{session.room.name}] 🤐 Empty message, skipping")
                continue

            print(f"[{session.room.name}] 🗣️  Detected: '{message.text}'")

            if detect_distress(message.text):
                print(f"[{session.room.name}] ✅ DISTRESS KEYWORD DETECTED!")
                await self.send_alert(
                    room=session.room.name,
                    transcript=message.text,
                )
            else:
                print(f"[{session.room.name}] ℹ️  No keywords found in: '{message.text}'")

    async def send_alert(self, room: str, transcript: str):
        payload = {
            "room": room,
            "event": "PATIENT_DISTRESS",
            "transcript": transcript,
            "source": "voice",
            "severity": "high"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(BACKEND_ALERT_URL, json=payload)
                print(f"📤 [AGENT] ALERT SENT for room {room} - Status: {response.status_code}")
                if response.status_code != 200:
                    print(f"⚠️  [AGENT] Unexpected response: {response.text}")
            except Exception as e:
                print(f"❌ [AGENT] ALERT FAILED for room {room} - Error: {str(e)}")

async def entrypoint(ctx: JobContext):
    print("🚀 [AGENT] Starting patient monitor agent...")
    print(f"📡 [AGENT] Backend URL: {BACKEND_ALERT_URL}")
    
    # Verify LiveKit connection
    if hasattr(ctx, 'room'):
        print(f"🔗 [AGENT] LiveKit room: {ctx.room.name}")
    
    await ctx.connect()
    print("✅ [AGENT] Connected to LiveKit!")
    await PatientMonitorAgent().run(ctx)

if __name__ == "__main__":
    print("═" * 60)
    print("🏥 PATIENT MONITOR AGENT - STARTING UP")
    print("═" * 60)
    print(f"🔑 LiveKit URL set: {bool(os.getenv('LIVEKIT_URL'))}")
    print(f"🔑 LiveKit API Key set: {bool(os.getenv('LIVEKIT_API_KEY'))}")
    print(f"🔑 LiveKit API Secret set: {bool(os.getenv('LIVEKIT_API_SECRET'))}")
    print(f"📍 Backend Alert URL: {BACKEND_ALERT_URL}")
    print("═" * 60)
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="patient-monitor",
        )
    )