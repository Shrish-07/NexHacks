import re
import os
import base64
import asyncio
import httpx
from datetime import datetime, timedelta
from collections import defaultdict
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import silero, openai

# ============ CONFIGURATION ============
BACKEND_ALERT_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:3000') + '/alert'
OVERSHOOT_API_KEY = os.getenv('OVERSHOOT_API_KEY')
OVERSHOOT_API_URL = os.getenv('OVERSHOOT_API_URL', 'https://cluster1.overshoot.ai/api/v0.2')

# Detection tuning
DETECTION_CONFIG = {
    'distress_voice': 1.0,
    'fall': 0.80,
    'bed_exit': 0.75,
    'inactivity': 0.85,
    'frame_skip': 5,
    'cooldown_seconds': 30,
}

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
    "code blue",
    "call nurse",
    "assistance",
]

# ============ STATE MANAGEMENT ============
alert_dedup = defaultdict(lambda: {'timestamp': None, 'type': None})
frame_buffer = {}  # roomId -> [frame1, frame2, ...]
detection_metrics = {
    'frames_processed': 0,
    'api_calls': 0,
    'alerts_sent': 0,
    'errors': 0,
    'start_time': datetime.now(),
}

# ============ LOGGING ============
def log_info(room: str, msg: str):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] 🟢 [{room}] {msg}")

def log_warn(room: str, msg: str):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] 🟡 [{room}] {msg}")

def log_error(room: str, msg: str):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] 🔴 [{room}] {msg}")
    detection_metrics['errors'] += 1

# ============ DEDUPLICATION ============
def should_alert(room: str, alert_type: str) -> bool:
    """Prevent alert spam - max 1 alert per type per 30 seconds per room"""
    key = f"{room}_{alert_type}"
    last = alert_dedup[key]
    now = datetime.now()
    
    if last['timestamp'] is None:
        return True
    
    elapsed = (now - last['timestamp']).total_seconds()
    if elapsed >= DETECTION_CONFIG['cooldown_seconds']:
        return True
    
    log_warn(room, f"Alert deduped: {alert_type} (cooldown {elapsed:.1f}s remaining)")
    return False

def update_alert_time(room: str, alert_type: str):
    """Track when last alert was sent"""
    key = f"{room}_{alert_type}"
    alert_dedup[key] = {'timestamp': datetime.now(), 'type': alert_type}

# ============ VOICE DETECTION ============
def detect_distress(text: str) -> tuple[bool, str]:
    """Detect distress keywords with confidence"""
    if not text:
        return False, ""
    
    text_lower = text.lower()
    for keyword in DISTRESS_KEYWORDS:
        if keyword in text_lower:
            return True, keyword
    return False, ""

# ============ OVERSHOOT INTEGRATION ============
async def analyze_with_overshoot(frame_data: bytes, room: str, patient_id: str) -> dict:
    """Send frame to Overshoot for motion/fall detection"""
    if not OVERSHOOT_API_KEY:
        log_warn(room, "Overshoot API key not configured")
        return {}
    
    try:
        # Encode frame as base64
        frame_b64 = base64.b64encode(frame_data).decode('utf-8')
        
        # Call Overshoot API
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{OVERSHOOT_API_URL}/analyze",
                json={
                    "image": frame_b64,
                    "models": ["fall_detection", "bed_exit", "inactivity"],
                },
                headers={"Authorization": f"Bearer {OVERSHOOT_API_KEY}"}
            )
            
            detection_metrics['api_calls'] += 1
            
            if response.status_code == 200:
                result = response.json()
                log_info(room, f"Overshoot analysis: {result}")
                return result
            else:
                log_error(room, f"Overshoot API error: {response.status_code}")
                return {}
    except asyncio.TimeoutError:
        log_error(room, "Overshoot API timeout")
        return {}
    except Exception as e:
        log_error(room, f"Overshoot error: {str(e)}")
        return {}

# ============ ALERT SENDING ============
async def send_alert(room: str, patient_id: str, alert_type: str, data: dict):
    """Send alert to backend"""
    if not should_alert(room, alert_type):
        return
    
    update_alert_time(room, alert_type)
    
    payload = {
        "room": room,
        "patientId": patient_id,
        "event": alert_type.upper(),
        "source": data.get('source', 'ai'),
        "severity": data.get('severity', 'high'),
        "transcript": data.get('transcript'),
        "confidence": data.get('confidence', 0.95),
        "description": data.get('description'),
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(BACKEND_ALERT_URL, json=payload, timeout=5.0)
            if response.status_code == 200:
                log_info(room, f"✅ Alert sent: {alert_type}")
                detection_metrics['alerts_sent'] += 1
            else:
                log_error(room, f"Backend response: {response.status_code}")
        except Exception as e:
            log_error(room, f"Alert send failed: {str(e)}")

# ============ AGENT ============
class PatientMonitorAgent(Agent):
    async def on_session_start(self, session: AgentSession):
        room = session.room.name
        log_info(room, f"Session started")
        log_info(room, f"Participants: {len(session.participants)}")
        log_info(room, f"Listening for keywords: {', '.join(DISTRESS_KEYWORDS[:5])}...")
        
        # Extract patient ID from room name (format: patient-{roomNumber})
        patient_id = room.split('-')[1] if '-' in room else 'unknown'
        
        try:
            async for message in session.listen():
                if not message.text:
                    continue
                
                log_info(room, f"Transcribed: '{message.text}'")
                detection_metrics['frames_processed'] += 1
                
                # Voice distress detection
                is_distress, keyword = detect_distress(message.text)
                if is_distress:
                    log_info(room, f"✅ DISTRESS KEYWORD DETECTED: '{keyword}'")
                    await send_alert(
                        room=room,
                        patient_id=patient_id,
                        alert_type='PATIENT_DISTRESS',
                        data={
                            'source': 'voice',
                            'severity': 'high',
                            'transcript': message.text,
                            'confidence': 0.95,
                            'description': f"Patient said: '{message.text}'",
                        }
                    )
        except Exception as e:
            log_error(room, f"Session error: {str(e)}")
            detection_metrics['errors'] += 1

# ============ ENTRYPOINT ============
async def entrypoint(ctx: JobContext):
    log_info("AGENT", "Starting patient monitor agent...")
    log_info("AGENT", f"Backend URL: {BACKEND_ALERT_URL}")
    log_info("AGENT", f"Overshoot configured: {bool(OVERSHOOT_API_KEY)}")
    log_info("AGENT", f"Detection config: {DETECTION_CONFIG}")
    
    try:
        await ctx.connect()
        log_info("AGENT", "Connected to LiveKit")
        await PatientMonitorAgent().run(ctx)
    except Exception as e:
        log_error("AGENT", f"Connection failed: {str(e)}")
        detection_metrics['errors'] += 1
        raise

if __name__ == "__main__":
    print("=" * 70)
    print("🏥 PATIENT MONITOR AGENT - ADVANCED DETECTION")
    print("=" * 70)
    print(f"✅ Environment Check:")
    print(f"   LiveKit URL: {bool(os.getenv('LIVEKIT_URL'))}")
    print(f"   LiveKit API Key: {bool(os.getenv('LIVEKIT_API_KEY'))}")
    print(f"   Overshoot API Key: {bool(OVERSHOOT_API_KEY)}")
    print(f"   Backend URL: {BACKEND_ALERT_URL}")
    print(f"✅ Detection Config:")
    for key, val in DETECTION_CONFIG.items():
        print(f"   {key}: {val}")
    print("=" * 70)
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="patient-monitor-v2",
        )
    )