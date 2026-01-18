import re
import httpx
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli

BACKEND_ALERT_URL = "http://127.0.0.1:8000/alert"

DISTRESS_KEYWORDS = [
    "help",
    "help me",
    "choking",
    "can't breathe",
    "cannot breathe",
    "pain",
    "emergency",
]

def detect_distress(text: str) -> bool:
    text = text.lower()
    return any(keyword in text for keyword in DISTRESS_KEYWORDS)

class PatientMonitorAgent(Agent):
    async def on_session_start(self, session: AgentSession):
        print(f"🟢 Monitoring room: {session.room.name}")

        async for message in session.listen():
            if not message.text:
                continue

            print(f"[{session.room.name}] {message.text}")

            if detect_distress(message.text):
                await self.send_alert(
                    room=session.room.name,
                    transcript=message.text,
                )

    async def send_alert(self, room: str, transcript: str):
        payload = {
            "room": room,
            "event": "PATIENT_DISTRESS",
            "transcript": transcript,
        }

        async with httpx.AsyncClient() as client:
            await client.post(BACKEND_ALERT_URL, json=payload)

        print(f"🚨 ALERT SENT for room {room}")

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    await PatientMonitorAgent().run(ctx)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="patient-monitor",
        )
    )