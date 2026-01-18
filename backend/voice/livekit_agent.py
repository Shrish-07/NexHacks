import asyncio
from livekit import rtc
from backend.config import LIVEKIT_URL
from backend.voice.token import create_agent_token

# Global queue for alerts (nurse notification, SMS, etc.)
_voice_alert_queue: asyncio.Queue[str] | None = None


class NurseVoiceAgent:
    def __init__(self):
        self.room: rtc.Room | None = None

    async def start(self, room: rtc.Room):
        self.room = room

        # Register event handlers - always wrap async callbacks in create_task
        room.on("data_received", lambda payload, kind, participant:
                asyncio.create_task(self._on_data_received(payload, kind, participant)))

        room.on("track_subscribed", lambda track, publication, participant:
                asyncio.create_task(self._on_track_subscribed(track, publication, participant)))

        room.on("disconnected", lambda reason=None:
                asyncio.create_task(self._on_room_disconnected(reason)))

        print(f"[Agent] Connected as {room.local_participant.identity}")

    async def _on_data_received(self, payload: bytes, kind: rtc.DataPacketKind,
                               participant: rtc.RemoteParticipant | None):
        try:
            if kind == rtc.DataPacketKind.LOSSY:
                # You can ignore lossy packets if you want
                return

            text = payload.decode("utf-8").strip().lower()
            sender = participant.identity if participant else "unknown"
            print(f"[Agent] Received text from {sender}: {text}")
            await self.on_message(text, sender)
        except UnicodeDecodeError:
            print("[Agent] Received non-UTF8 data packet")
        except Exception as e:
            print(f"[Agent] Error in data_received handler: {e}")

    async def _on_track_subscribed(self, track: rtc.RemoteTrack,
                                  publication: rtc.RemoteTrackPublication,
                                  participant: rtc.RemoteParticipant):
        print(f"[Agent] Subscribed to {track.kind} track from {participant.identity}")

    async def _on_room_disconnected(self, reason: str | None = None):
        reason_str = f" ({reason})" if reason else ""
        print(f"[Agent] Room disconnected{reason_str}")
        # You can add cleanup logic here if needed

    async def on_message(self, text: str, sender: str):
        distress_keywords = [
            "help", "help me", "choking", "can't breathe", "cant breathe",
            "pain", "fall", "emergency", "nurse", "doctor", "ambulance"
        ]

        if any(keyword in text for keyword in distress_keywords):
            response = "Help is on the way. Please remain calm. A nurse has been alerted."
            await self.say(response)
            if _voice_alert_queue is not None:
                await _voice_alert_queue.put(f"DISTRESS_DETECTED from {sender}: {text}")
        elif any(x in text for x in ["status", "how are you", "check", "report"]):
            await self.say("All rooms are currently being monitored. I'm here to help.")
        else:
            await self.say("I heard you. Say 'help' if you need assistance.")

    async def say(self, message: str):
        print(f"[Agent speaks] {message}")
        # In real implementation → publish data / synthesize speech here


async def voice_alert_loop():
    """Background task that handles real alerts (SMS, call nurse, etc.)"""
    while True:
        alert = await _voice_alert_queue.get()
        print(f"\n{'*' * 30}\nALERT TRIGGERED\n{alert}\n{'*' * 30}\n")
        _voice_alert_queue.task_done()


async def main():
    global _voice_alert_queue
    _voice_alert_queue = asyncio.Queue()

    room_name = "test_room"
    agent_identity = "nurse_001"

    token = create_agent_token(room_name, agent_identity)
    print(f"Generated token: {token}")

    room = rtc.Room()

    # Better way: use event to know when we should exit
    disconnected_event = asyncio.Event()

    async def on_disconnected(reason=None):
        disconnected_event.set()
        print(f"[Agent] Disconnection event received (reason: {reason or 'none'})")

    # Also register here so we catch early disconnects
    room.on("disconnected", lambda reason=None: asyncio.create_task(on_disconnected(reason)))

    try:
        print(f"Connecting agent to room: {room_name}")
        await room.connect(url=LIVEKIT_URL, token=token)

        agent = NurseVoiceAgent()
        await agent.start(room)

        # Start background alert processor
        asyncio.create_task(voice_alert_loop())

        print("Agent is running. Waiting for room events...\n"
              "(Press Ctrl+C to stop)")

        # Clean & efficient way to wait until disconnection
        await disconnected_event.wait()

    except KeyboardInterrupt:
        print("\n[Agent] Stopped by user (Ctrl+C)")
    except Exception as e:
        print(f"Agent connection failed: {type(e).__name__}: {e}")
    finally:
        await room.disconnect()
        print("Agent disconnected")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram terminated by user")