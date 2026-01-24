import re
import os
import base64
import asyncio
import httpx
import time
from datetime import datetime, timedelta
from collections import defaultdict
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents import metrics as agent_metrics
from livekit.protocols import worker_pb2
import logging

# ============ LOGGING SETUP ============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ CONFIGURATION ============
BACKEND_ALERT_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:3000') + '/alert'
BACKEND_MOTION_URL = os.getenv('BACKEND_URL', 'http://127.0.0.1:3000') + '/api/motion-detection'
OVERSHOOT_API_KEY = os.getenv('OVERSHOOT_API_KEY')
OVERSHOOT_API_URL = os.getenv('OVERSHOOT_API_URL', 'https://cluster1.overshoot.ai/api/v0.2')

# Detection tuning
DETECTION_CONFIG = {
    'distress_voice': 1.0,
    'fall': 0.80,
    'choking': 0.85,
    'bed_exit': 0.75,
    'inactivity': 0.70,
    'frame_skip': 3,
    'cooldown_seconds': 30,
    'frame_interval_ms': 500,  # Capture frame every 500ms
}

DISTRESS_KEYWORDS = [
    "help", "help me", "choking", "can't breathe", "cannot breathe",
    "pain", "emergency", "falling", "seizure", "code blue", "call nurse", "assistance",
]

MOTION_ANOMALIES = {
    'fall': 'Patient has fallen',
    'choking': 'Patient may be choking',
    'bed_exit': 'Patient exiting bed',
    'inactivity': 'Patient prolonged inactivity',
    'seizure_like': 'Seizure-like movements detected',
    'abnormal_movement': 'Unusual movement detected',
}

# ============ STATE MANAGEMENT ============
alert_dedup = defaultdict(lambda: {'timestamp': None, 'type': None})
detection_metrics = {
    'frames_processed': 0,
    'voice_detections': 0,
    'motion_detections': 0,
    'api_calls': 0,
    'errors': 0,
    'start_time': datetime.now(),
}

# ============ LOGGING HELPERS ============
def log_info(room: str, msg: str):
    logger.info(f"[{room}] {msg}")

def log_warn(room: str, msg: str):
    logger.warning(f"[{room}] {msg}")

def log_debug(room: str, msg: str):
    logger.debug(f"[{room}] {msg}")

def log_error(room: str, msg: str):
    logger.error(f"[{room}] {msg}")
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
    
    log_warn(room, f"⏱️  Alert deduped: {alert_type} ({elapsed:.1f}s remain)")
    return False

def update_alert_time(room: str, alert_type: str):
    """Track when last alert was sent"""
    key = f"{room}_{alert_type}"
    alert_dedup[key] = {'timestamp': datetime.now(), 'type': alert_type}

# ============ VOICE DETECTION ============
def detect_distress(text: str) -> tuple[bool, str]:
    """Detect distress keywords"""
    if not text:
        return False, ""
    
    text_lower = text.lower()
    for keyword in DISTRESS_KEYWORDS:
        if keyword in text_lower:
            return True, keyword
    return False, ""

# ============ MOTION/MOVEMENT DETECTION VIA OVERSHOOT ============
async def analyze_motion_with_overshoot(frame_data: bytes, room: str, patient_id: str) -> dict:
    """Send frame to Overshoot for motion/movement/choking detection"""
    if not OVERSHOOT_API_KEY:
        log_warn(room, "⚠️  Overshoot API key not configured")
        return {}
    
    try:
        # Encode frame as base64
        frame_b64 = base64.b64encode(frame_data).decode('utf-8')
        
        # Call Overshoot API for motion analysis
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{OVERSHOOT_API_URL}/analyze",
                json={
                    "image": frame_b64,
                    "models": [
                        "fall_detection",
                        "choking_detection", 
                        "bed_exit_detection",
                        "inactivity_detection",
                        "abnormal_movement",
                    ],
                },
                headers={"Authorization": f"Bearer {OVERSHOOT_API_KEY}"}
            )
            
            detection_metrics['api_calls'] += 1
            
            if response.status_code == 200:
                result = response.json()
                log_info(room, f"🎬 Motion analysis: {result}")
                return result
            else:
                log_error(room, f"Overshoot API error: {response.status_code} - {response.text}")
                return {}
    except asyncio.TimeoutError:
        log_error(room, "⏱️  Overshoot API timeout (5s)")
        return {}
    except Exception as e:
        log_error(room, f"Motion analysis error: {str(e)}")
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
                detection_metrics['voice_detections'] += 1
            else:
                log_error(room, f"Backend error: {response.status_code}")
        except Exception as e:
            log_error(room, f"Alert send failed: {str(e)}")

async def send_motion_detection(room: str, patient_id: str, detections: dict):
    """Send motion/movement detection results to backend motion endpoint"""
    if not detections:
        return
    
    # Process each detection type from Overshoot
    for detection_type, detection_data in detections.items():
        if not detection_data:
            continue
        
        # Extract confidence score
        confidence = detection_data.get('confidence', 0) if isinstance(detection_data, dict) else detection_data
        if confidence is None or confidence < 0.5:
            continue
        
        # Get threshold from config
        config_threshold = DETECTION_CONFIG.get(detection_type, 0.80)
        if confidence < config_threshold:
            log_debug(room, f"⏭️  {detection_type}: {confidence:.2f} < {config_threshold:.2f}")
            continue
        
        # Check alert cooldown
        if not should_alert(room, detection_type):
            log_debug(room, f"🔄 {detection_type}: On cooldown")
            continue
        
        update_alert_time(room, detection_type)
        
        # Get description
        description = MOTION_ANOMALIES.get(detection_type, f"Motion detected: {detection_type}")
        
        # Determine severity based on detection type
        severity = 'critical' if detection_type in ['fall', 'choking'] else 'high'
        
        payload = {
            "roomName": room,
            "patientId": patient_id,
            "detectionType": detection_type,
            "confidence": confidence,
            "description": description,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(BACKEND_MOTION_URL, json=payload)
                if response.status_code == 200:
                    log_info(room, f"✅ Motion alert sent: {detection_type} ({confidence:.0%})")
                    detection_metrics['motion_detections'] += 1
                else:
                    log_error(room, f"Motion endpoint error: {response.status_code} - {response.text}")
        except Exception as e:
            log_error(room, f"Motion detection send failed: {str(e)}")


# ============ AGENT - VOICE & MOTION ============
class PatientMonitorAgent(Agent):
    async def on_session_start(self, session: AgentSession):
        room = session.room.name
        log_info(room, "🟢 Session started")
        log_info(room, f"👥 Participants: {len(session.participants)}")
        log_info(room, f"🎤 Listening for: {', '.join(DISTRESS_KEYWORDS[:5])}...")
        
        # Extract patient ID from room name (format: patient-{roomNumber})
        patient_id = room.split('-')[1] if '-' in room else 'unknown'
        
        try:
            frame_count = 0
            
            async for message in session.listen():
                frame_count += 1
                detection_metrics['frames_processed'] += 1
                
                # ============ VOICE PROCESSING ============
                if message.text:
                    log_info(room, f"🗣️  Transcribed: '{message.text}'")
                    
                    # Check for distress keywords
                    is_distress, keyword = detect_distress(message.text)
                    if is_distress:
                        log_info(room, f"✅ DISTRESS: '{keyword}'")
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
                
                # ============ MOTION PROCESSING ============
                # Analyze frames for motion every N frames
                if frame_count % DETECTION_CONFIG['frame_skip'] == 0 and OVERSHOOT_API_KEY:
                    try:
                        # Get video frame from participants
                        for participant in session.participants.values():
                            if hasattr(participant, 'video_tracks') and participant.video_tracks:
                                for track_pub in participant.video_tracks:
                                    try:
                                        # Access the video track
                                        track = track_pub.track
                                        if track and hasattr(track, 'get_frames'):
                                            # Get the latest frame
                                            async for video_frame in track.get_frames():
                                                # Convert frame to bytes
                                                if hasattr(video_frame, 'data'):
                                                    frame_bytes = video_frame.data
                                                    # Send to Overshoot for analysis
                                                    motion_results = await analyze_motion_with_overshoot(
                                                        frame_bytes, room, patient_id
                                                    )
                                                    # Process and send alerts
                                                    if motion_results:
                                                        await send_motion_detection(
                                                            room, patient_id, motion_results
                                                        )
                                                break  # Process only first frame
                                    except Exception as frame_err:
                                        log_debug(room, f"Frame access error: {str(frame_err)}")
                    except Exception as e:
                        log_warn(room, f"Motion processing error: {str(e)}")
        
        except Exception as e:
            log_error(room, f"Session error: {str(e)}")

# ============ ENTRYPOINT ============
async def entrypoint(ctx: JobContext):
    log_info("AGENT", "🚀 Starting patient monitor agent v2...")
    log_info("AGENT", f"📡 Backend URL: {BACKEND_ALERT_URL}")
    log_info("AGENT", f"🎬 Motion detection: {bool(OVERSHOOT_API_KEY)}")
    log_info("AGENT", f"⚙️  Config: {DETECTION_CONFIG}")
    
    try:
        await ctx.connect()
        log_info("AGENT", "✅ Connected to LiveKit")
        await PatientMonitorAgent().run(ctx)
    except Exception as e:
        log_error("AGENT", f"Connection failed: {str(e)}")
        raise

if __name__ == "__main__":
    print("=" * 80)
    print("🏥 NEXHACKS PATIENT MONITOR AGENT - MOTION & VOICE DETECTION")
    print("=" * 80)
    print("✅ Environment Check:")
    print(f"   LiveKit URL: {bool(os.getenv('LIVEKIT_URL'))}")
    print(f"   LiveKit API Key: {bool(os.getenv('LIVEKIT_API_KEY'))}")
    print(f"   Overshoot API Key: {bool(OVERSHOOT_API_KEY)}")
    print(f"   Backend URL: {BACKEND_ALERT_URL}")
    print(f"   Motion Detection URL: {BACKEND_MOTION_URL}")
    print("✅ Detection Modes Active:")
    print(f"   Voice Distress: YES")
    print(f"   Motion/Fall: {'YES' if OVERSHOOT_API_KEY else 'NO (API key missing)'}")
    print(f"   Choking Detection: {'YES' if OVERSHOOT_API_KEY else 'NO'}")
    print(f"   Inactivity Detection: {'YES' if OVERSHOOT_API_KEY else 'NO'}")
    print("✅ Configuration:")
    for key, val in DETECTION_CONFIG.items():
        print(f"   {key}: {val}")
    print("=" * 80)
    
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="patient-monitor-v2-motion",
        )
    )