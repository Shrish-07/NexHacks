# 🏥 Complete Integration Testing Guide

## Overview
This guide walks through testing all three alert types:
1. ✅ **Manual Alerts** (Test button) - Already working
2. ❓ **Voice Alerts** (Agent voice detection) - Just fixed LiveKit connection
3. ❓ **Visual Alerts** (Overshoot biosensor) - Just enhanced logging

---

## Prerequisites

### ✅ Services Running
```bash
# Backend (Node.js on :3000)
npm start  # in backend/ folder

# Frontend (Vite on :5174)
npm run dev  # in frontend/ folder

# Agent (Python - optional for voice testing)
python agent.py  # in root folder
```

### ✅ Environment Variables Set
```
LIVEKIT_URL=<your-livekit-url>
LIVEKIT_API_KEY=<your-api-key>
LIVEKIT_API_SECRET=<your-api-secret>
OVERSHOOT_API_KEY=<your-overshoot-key>
OVERSHOOT_API_URL=<your-overshoot-url>
ELEVENLABS_API_KEY=<your-elevenlabs-key>
```

Check backend startup logs:
```
✅ [INIT] LiveKit configured: <url>
✅ [INIT] Overshoot API Key set
✅ [INIT] ElevenLabs API Key set
```

---

## Test 1: Manual Alert ✅ (Already Working)

### Steps:
1. Open two browser windows
   - **Window 1**: Patient login (http://localhost:5174/login)
   - **Window 2**: Nurse login (http://localhost:5174/login)

2. **Patient Window:**
   - Click "Add Patient"
   - Enter name: "Test Patient"
   - Enter room: "101"
   - Click "Start Monitoring"

3. **Nurse Window:**
   - Click "Nurse Login"
   - Enter PIN: "1234"
   - Click "Access Dashboard"

4. **Send Test Alert:**
   - Patient Dashboard: Look for "Test Alert" button
   - Click "Test Alert" button
   - Should see:
     - 🔴 Red alert on Nurse Dashboard
     - 📢 Notification sound/popup
     - 🎵 TTS audio: "Alert: Test Patient in room 101"

### Expected Behavior:
```
Backend Logs:
📨 [ALERT] Test alert from patient
📢 [BROADCAST] Alert sent to 1 nurses
🎵 [TTS] Generated audio for alert

Frontend (Patient):
✅ Alert sent

Frontend (Nurse):
🚨 [ALERT] Test Patient - Room 101
   Red card with white text
   Hovering shows full details
   Hearing TTS audio playback
```

---

## Test 2: Voice Alert ❓ (LiveKit + Agent Voice Detection)

### Prerequisites:
- Agent running: `python agent.py`
- Both dashboards loaded (Patient + Nurse)
- Console open (F12 → Console tab)

### Check LiveKit Connection First:

**In Patient Dashboard Console (F12 → Console):**
```
Look for these logs:
🎤 [PATIENT] Getting LiveKit token...
✅ [PATIENT] LiveKit token received
✅ [PATIENT] Connected to LiveKit room: patient-101
🎤 [PATIENT] Microphone enabled for agent monitoring
```

**If NOT seeing these logs:**
1. Refresh browser (Ctrl+F5)
2. Login again as Patient
3. Open DevTools console
4. Try again

### Simulate Voice Alert (Using Agent):

**Step 1: Agent Terminal**
```
Should see startup:
═════════════════════════════════════════════════════
🏥 PATIENT MONITOR AGENT - STARTING UP
═════════════════════════════════════════════════════
🔑 LiveKit URL set: True
🔑 LiveKit API Key set: True
🔑 LiveKit API Secret set: True
📍 Backend Alert URL: http://127.0.0.1:3000/alert
═════════════════════════════════════════════════════

Then:
🚀 [AGENT] Starting patient monitor agent...
✅ [AGENT] Connected to LiveKit!
```

**Step 2: Agent Connects to Room**
```
After connecting, should see:
🟢 [AGENT] Monitoring room: patient-101
🎤 [AGENT] Listening for keywords: ['help', 'choking', ...]
```

**Step 3: Patient Speaks Keyword**
- In patient video window, speak clearly: **"HELP"** or **"I can't breathe"**
- Wait 2-3 seconds for transcription

**Step 4: Agent Terminal Should Show:**
```
[patient-101] 🗣️  Detected: 'help'
[patient-101] ✅ DISTRESS KEYWORD DETECTED!
📤 [AGENT] ALERT SENT for room patient-101 - Status: 200
```

**Step 5: Backend Logs Should Show:**
```
📨 [ALERT] Alert received: {room: 'patient-101', event: 'PATIENT_DISTRESS', ...}
🔍 [ALERT] Searching for patient in room: 101
✅ [ALERT] Patient found: Test Patient
📢 [BROADCAST] Broadcasting to 1 nurses
✅ [ALERT] VOICE: PATIENT_DISTRESS
```

**Step 6: Nurse Dashboard:**
- 🔴 Red alert card appears for Test Patient
- 🎵 Audio plays TTS announcement
- Alert details show "Voice Alert" as source

### Expected Output:
```
Patient Console: ✅ Connected to LiveKit + Microphone enabled
Agent Console: ✅ Detected keyword + Alert sent
Backend Console: ✅ Alert received + Broadcasted
Nurse Dashboard: 🔴 Red alert card + 🎵 TTS audio
```

---

## Test 3: Visual Alert (Overshoot API Integration) ❓

### Method A: Manual curl Test

**Terminal Command:**
```bash
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_TEST",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.95,
    "description": "Fall detected by Overshoot biosensor"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "alert": {
    "id": "alert_1234567890_abc123",
    "patientId": "PATIENT_TEST",
    "patientName": "Test Patient",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.95,
    "urgency": "critical",
    "source": "overshoot",
    "timestamp": "2024-01-15T12:34:56.789Z"
  }
}
```

**Backend Console Should Show:**
```
📨 [OVERSHOOT] Alert received: {patientId, roomNumber, condition}
📢 [OVERSHOOT] Broadcasting to 1 nurses
✅ [OVERSHOOT] PATIENT_FALLING - Test Patient (Room 101) - Confidence: 0.95
```

**Nurse Dashboard:**
- 🔴 Red alert card appears
- 🎵 TTS audio: "Alert: Test Patient in room 101 - Patient Falling"
- Alert source shows "Overshoot"

### Method B: Check Overshoot Config

**Terminal Command:**
```bash
curl http://localhost:3000/api/check-overshoot \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"patientId": "PATIENT_TEST", "roomNumber": "101"}'
```

**Expected Response:**
```json
{
  "status": "configured",
  "apiUrl": "https://api.overshoot.ai",
  "apiKeySet": true,
  "message": "Ready to receive Overshoot alerts"
}
```

**Backend Console:**
```
🔍 [OVERSHOOT] Checking for active alerts
📡 [OVERSHOOT] Would fetch from: https://api.overshoot.ai
🔑 [OVERSHOOT] Using API Key (first 10 chars): <abc123...>
```

---

## Complete Alert Flow Diagram

```
VOICE ALERT PATH:
Patient Speaks → Microphone Published to LiveKit
                ↓
            Agent.py Listens
                ↓
            Keyword Detected
                ↓
            POST /alert
                ↓
            Backend receives → Finds patient → Creates alert
                ↓
            WebSocket broadcast to nurses
                ↓
            Nurse Dashboard: Red card + TTS audio

VISUAL ALERT PATH:
Overshoot Biosensor → Detects fall/choking
                ↓
            POST /api/overshoot-alert (curl or real API)
                ↓
            Backend receives → Creates alert
                ↓
            WebSocket broadcast to nurses
                ↓
            Nurse Dashboard: Red card + TTS audio

MANUAL ALERT PATH:
Patient clicks "Test Alert"
                ↓
            POST /api/test-alert
                ↓
            Backend creates alert
                ↓
            WebSocket broadcast to nurses
                ↓
            Nurse Dashboard: Red card + TTS audio
```

---

## Troubleshooting

### Voice Alert Not Working?

**Check 1: LiveKit Connection**
```javascript
// Patient console (F12)
// Should see at least these lines:
🎤 [PATIENT] Getting LiveKit token...
✅ [PATIENT] LiveKit token received
✅ [PATIENT] Connected to LiveKit room
```

**Check 2: Agent Running**
```bash
# Terminal where agent is running
# Should see:
✅ [AGENT] Connected to LiveKit!
🟢 [AGENT] Monitoring room: patient-101
```

**Check 3: Backend Alert Endpoint**
```bash
# Test alert endpoint
curl -X POST http://localhost:3000/alert \
  -H "Content-Type: application/json" \
  -d '{"room":"patient-101","event":"PATIENT_DISTRESS","transcript":"help","source":"voice","severity":"high"}'
```

**Check 4: Network Logs**
- Backend console for: `📨 [ALERT]` messages
- Agent console for: `✅ DISTRESS KEYWORD DETECTED!`
- Patient console for: `🎤 [PATIENT]` messages

### Visual Alert Not Working?

**Check 1: Overshoot Config**
```bash
curl http://localhost:3000/api/overshoot-config
# Should return apiKey and apiUrl
```

**Check 2: Test Endpoint**
```bash
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"TEST","roomNumber":"101","condition":"TEST","confidence":0.9}'
```

**Check 3: Backend Logs**
- Should show: `📨 [OVERSHOOT] Alert received`
- Should show: `✅ [OVERSHOOT]` confirmation

---

## Success Criteria

### Test 1: Manual Alert ✅
- [ ] Patient dashboard has "Test Alert" button
- [ ] Clicking button creates alert
- [ ] Nurse sees red alert card
- [ ] TTS audio plays
- [ ] Alert disappears when acknowledged

### Test 2: Voice Alert ❓
- [ ] Patient console shows LiveKit connection
- [ ] Agent console shows room monitoring
- [ ] Patient speaks keyword ("HELP", "CHOKING", etc.)
- [ ] Agent detects keyword in console
- [ ] Backend receives alert
- [ ] Nurse sees red alert card
- [ ] TTS audio plays

### Test 3: Visual Alert ❓
- [ ] curl command to `/api/overshoot-alert` succeeds
- [ ] Backend logs show alert received
- [ ] Nurse sees red alert card
- [ ] TTS audio plays
- [ ] Alert contains Overshoot data

---

## Endpoints Reference

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/livekit-token` | POST | Get token for patient to connect to LiveKit | ✅ Working |
| `/alert` | POST | Voice alerts from agent.py | ✅ Working |
| `/api/overshoot-alert` | POST | Visual alerts from Overshoot | ✅ Ready |
| `/api/overshoot-config` | GET | Overshoot API credentials | ✅ Ready |
| `/api/check-overshoot` | POST | Check Overshoot status | ✅ Ready |
| `/api/alert-audio` | POST | TTS audio generation | ✅ Working |
| `/health` | GET | System status | ✅ Working |

---

## Quick Start Commands

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Agent (for voice testing)
python agent.py

# Terminal 4: Test Voice Alert
curl -X POST http://localhost:3000/alert \
  -H "Content-Type: application/json" \
  -d '{"room":"patient-101","event":"PATIENT_DISTRESS","transcript":"help","source":"voice","severity":"high"}'

# Terminal 4 (Alt): Test Visual Alert
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"PATIENT_TEST","roomNumber":"101","condition":"PATIENT_FALLING","confidence":0.95,"description":"Fall detected"}'
```

---

## Next Steps After Testing

1. If voice alerts work: Verify agent keyword detection with various phrases
2. If visual alerts work: Test with real Overshoot API (if available)
3. All working: Deploy to production environment
4. Monitor: Check logs regularly for any issues

