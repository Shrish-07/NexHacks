# 🔌 Backend API Reference

## Base URL
```
http://localhost:3000
```

---

## ✅ Health & Status Endpoints

### GET /health
Check backend status and configuration.

**Response:**
```json
{
  "status": "ok",
  "patients": 0,
  "nurses": 0,
  "alerts": 0,
  "livekit": {
    "configured": true
  }
}
```

---

## 🎤 LiveKit Integration Endpoints

### POST /api/livekit-token
Generate JWT token for patient to connect to LiveKit room.

**Request:**
```json
{
  "roomName": "patient-101",
  "participantName": "John Doe"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "url": "wss://your-livekit-server.com"
}
```

**Status Codes:**
- `200` - Token generated successfully
- `400` - Missing roomName or participantName
- `500` - LiveKit not configured

**Frontend Usage:**
```typescript
// PatientDashboard.tsx
const response = await fetch('/api/livekit-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomName: `patient-${roomNumber}`,
    participantName: patientName,
  }),
});

const { token, url } = await response.json();
const room = await connect(url, token);
await room.localParticipant.setMicrophoneEnabled(true);
```

---

## 🚨 Alert Endpoints

### POST /alert
Voice alert from agent.py when distress keywords detected.

**Request:**
```json
{
  "room": "patient-101",
  "event": "PATIENT_DISTRESS",
  "transcript": "help",
  "source": "voice",
  "severity": "high"
}
```

**Response:**
```json
{
  "success": true,
  "alert": {
    "id": "alert_1234567890_abc123",
    "patientId": "PATIENT_123",
    "patientName": "John Doe",
    "roomNumber": "101",
    "condition": "PATIENT_DISTRESS",
    "source": "voice",
    "timestamp": "2024-01-23T22:55:23.456Z"
  }
}
```

**Status Codes:**
- `200` - Alert created and broadcasted
- `404` - Patient not found in specified room

**Console Output:**
```
📨 [ALERT] Alert received: {room, event, transcript}
🔍 [ALERT] Searching for patient in room: 101
✅ [ALERT] Patient found: John Doe
📢 [BROADCAST] Broadcasting to 1 nurses
✅ [ALERT] VOICE: PATIENT_DISTRESS
```

---

### POST /api/overshoot-alert
Visual alert from Overshoot biosensor network (falling, choking, etc).

**Request:**
```json
{
  "patientId": "PATIENT_123",
  "roomNumber": "101",
  "condition": "PATIENT_FALLING",
  "confidence": 0.95,
  "description": "Fall detected by Overshoot biosensor"
}
```

**Response:**
```json
{
  "success": true,
  "alert": {
    "id": "alert_1234567890_xyz789",
    "patientId": "PATIENT_123",
    "patientName": "John Doe",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.95,
    "urgency": "critical",
    "source": "overshoot",
    "description": "Fall detected by Overshoot biosensor",
    "timestamp": "2024-01-23T22:55:23.456Z"
  }
}
```

**Status Codes:**
- `200` - Alert created and broadcasted
- `400` - Missing patientId or roomNumber
- `404` - Patient not found

**Console Output:**
```
📨 [OVERSHOOT] Alert received: {patientId, roomNumber, condition}
📢 [OVERSHOOT] Broadcasting to 1 nurses
✅ [OVERSHOOT] PATIENT_FALLING - John Doe (Room 101) - Confidence: 0.95
```

**Urgency Levels:**
- `confidence > 0.85` → `critical` (red alert, immediate response)
- `confidence <= 0.85` → `high` (red alert, normal response)

---

### POST /api/test-alert
Manual test alert (for testing without real biosensors).

**Request:**
```json
{
  "patientId": "PATIENT_123",
  "roomNumber": "101"
}
```

**Response:**
```json
{
  "success": true,
  "alert": { /* alert object */ }
}
```

---

## 🔧 Configuration Endpoints

### GET /api/overshoot-config
Get Overshoot API configuration (for frontend integration).

**Response:**
```json
{
  "apiKey": "sk_live_...",
  "apiUrl": "https://api.overshoot.ai"
}
```

**Status Codes:**
- `200` - Configuration returned
- `500` - API key not configured

---

### POST /api/check-overshoot
Check if Overshoot integration is ready.

**Request:**
```json
{
  "patientId": "PATIENT_123",
  "roomNumber": "101"
}
```

**Response:**
```json
{
  "status": "configured",
  "apiUrl": "https://api.overshoot.ai",
  "apiKeySet": true,
  "message": "Ready to receive Overshoot alerts"
}
```

**Console Output:**
```
🔍 [OVERSHOOT] Checking for active alerts
📡 [OVERSHOOT] Would fetch from: https://api.overshoot.ai
🔑 [OVERSHOOT] Using API Key (first 10 chars): sk_live_...
```

---

## 🎵 Audio Endpoints

### POST /api/alert-audio
Generate TTS (text-to-speech) audio for alert announcements.

**Request:**
```json
{
  "text": "Alert: John Doe in room 101 - Patient Falling"
}
```

**Response:**
```json
{
  "audioBase64": "//NExAA...",
  "contentType": "audio/mpeg"
}
```

**Status Codes:**
- `200` - Audio generated
- `400` - Missing text field
- `500` - ElevenLabs API error

**Usage (Frontend):**
```typescript
const response = await fetch('/api/alert-audio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Alert message' })
});

const { audioBase64 } = await response.json();
const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
audio.play();
```

---

## 🔌 WebSocket Events

### Patient Registration
**Event:** Patient connects via WebSocket
```json
{
  "type": "patient_registration",
  "patientId": "PATIENT_123",
  "patientName": "John Doe",
  "roomNumber": "101"
}
```

### Nurse Registration
**Event:** Nurse connects via WebSocket
```json
{
  "type": "nurse_registration",
  "nurseName": "Jane Smith"
}
```

### New Alert Broadcast
**Event:** Alert created, broadcasted to all nurses
```json
{
  "type": "new_alert",
  "alert": {
    "id": "alert_1234567890_abc123",
    "patientId": "PATIENT_123",
    "patientName": "John Doe",
    "roomNumber": "101",
    "condition": "PATIENT_DISTRESS",
    "source": "voice",
    "timestamp": "2024-01-23T22:55:23.456Z"
  }
}
```

### Patient List Update
**Event:** Patient status changed
```json
{
  "type": "patient_list",
  "patients": [
    {
      "patientId": "PATIENT_123",
      "patientName": "John Doe",
      "roomNumber": "101",
      "hasVideo": true,
      "hasAlert": true
    }
  ]
}
```

---

## 🔐 Authentication

Currently using session-based authentication via sessionStorage (per-tab):

```
Patient: sessionStorage.getItem('auth')
  {
    "role": "patient",
    "patientId": "PATIENT_123",
    "name": "John Doe",
    "roomNumber": 101
  }

Nurse: sessionStorage.getItem('auth')
  {
    "role": "nurse",
    "name": "Jane Smith",
    "pin": "1234"
  }
```

---

## 📊 Alert Storage

**Max Alerts Stored:** 200 (oldest removed when exceeded)
**Alert Lifetime:** Displayed on dashboard, cleared when acknowledged
**Persistence:** In-memory (resets on server restart)

---

## 🌍 CORS

All endpoints allow requests from:
```
Access-Control-Allow-Origin: *
```

---

## 📈 Monitoring

**Backend Logs with Emoji Indicators:**
- `🟢` Green: Normal operation
- `🔵` Blue: Information messages
- `🟡` Yellow: Warnings
- `🔴` Red: Errors/Alerts
- `📨` Message received
- `📢` Broadcasting
- `✅` Success
- `❌` Failure

---

## 🧪 Test Commands

### Test all endpoints:
```bash
# Health check
curl http://localhost:3000/health

# LiveKit token
curl -X POST http://localhost:3000/api/livekit-token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"patient-101","participantName":"John"}'

# Voice alert
curl -X POST http://localhost:3000/alert \
  -H "Content-Type: application/json" \
  -d '{"room":"patient-101","event":"PATIENT_DISTRESS","transcript":"help","source":"voice","severity":"high"}'

# Visual alert
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"PATIENT_123","roomNumber":"101","condition":"PATIENT_FALLING","confidence":0.95}'

# Overshoot config
curl http://localhost:3000/api/overshoot-config

# TTS audio
curl -X POST http://localhost:3000/api/alert-audio \
  -H "Content-Type: application/json" \
  -d '{"text":"Test alert message"}'
```

---

## 🔗 Related Files

- Backend: [backend/patient-monitor.js](backend/patient-monitor.js)
- Frontend Services: [frontend/src/services/](frontend/src/services/)
- Agent: [agent.py](agent.py)
- Testing Guide: [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md)

