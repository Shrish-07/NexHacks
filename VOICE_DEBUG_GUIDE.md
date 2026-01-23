# 🎤 VOICE DETECTION DEBUGGING GUIDE

## System Updated ✅

### Changes Made
1. ✅ Landing page removed (/ → /login)
2. ✅ "Add Patient" instead of "Patient Login"  
3. ✅ Login page animations enhanced
4. ✅ Nurse dashboard cards enlarge when alerts exist
5. ✅ Full console logging added for debugging
6. ✅ Test button on patient dashboard

---

## Why Voice Detection May Not Be Working

### Possible Reasons

1. **Agent not running** - Python agent.py needs to be actively running
2. **LiveKit connection issue** - Patient not connected to LiveKit room
3. **Backend alert endpoint not receiving requests** - Check backend logs
4. **Room number mismatch** - Backend looking for room "101", agent sending "101"
5. **Keywords not matching** - Check exact transcript vs keywords

---

## How to Test & Debug

### Step 1: Check Backend is Running
```
Terminal 1: Backend should show "🚀 Server running on port 3000"
```

### Step 2: Check Frontend is Running
```
Terminal 2: Frontend should show "Local: http://localhost:5174/"
```

### Step 3: Login to Patient Dashboard
```
1. Go to http://localhost:5174/login
2. Click [Add Patient]
3. Name: "TestPatient"
4. Room: "101"
5. Click "Add Patient"
6. You should see camera feed
```

### Step 4: Check Patient Console (F12 → Console)
Look for these logs:
```
✅ [PATIENT] Connected to backend
👁️  [PATIENT] Room: 101 Patient: TestPatient
```

### Step 5: Test Manual Alert (EASIEST WAY)
Patient dashboard has a **🧪 Test Alert** button at bottom.
```
1. Click button
2. Check backend terminal - should see:
   📨 [ALERT] Received alert request
   🔍 [ALERT] Searching for patient in room: 101
   ✅ [ALERT] Found patient: TestPatient
   📢 [ALERT] Broadcasting to X nurses
```

If backend shows alert received, problem is with VOICE DETECTION, not backend.

---

## Debug Voice Detection (If Manual Test Works But Voice Doesn't)

### The Voice Flow

```
Patient speaks "HELP"
    ↓
LiveKit captures audio
    ↓
agent.py runs distress detection
    ↓
Agent sends POST to /alert endpoint
    ↓
Backend receives alert
    ↓
Backend broadcasts to nurses
    ↓
Nurse sees red alert + hears TTS
```

### Check Each Step

**Step 1: Is agent.py running?**
- Look for terminal with Python output
- Should show: `🟢 Monitoring room: 101`
- When patient speaks, should show: `🗣️ Detected: '[transcript]'`

**Step 2: Is patient in LiveKit?**
- Check backend logs when patient logs in
- Should show WebRTC connection
- Look for: `🔄 Setting remote description (offer)`

**Step 3: Does agent detect keywords?**
- Patient speaks: "HELP"
- Agent terminal should show: `✅ DISTRESS KEYWORD DETECTED!`
- Then: `📤 ALERT SENT for room 101`

**Step 4: Does backend receive alert?**
- Backend terminal should show:
  ```
  📨 [ALERT] Received alert request: ...
  🔍 [ALERT] Searching for patient in room: 101
  ✅ [ALERT] Found patient: TestPatient
  📢 [ALERT] Broadcasting to 1 nurses
  🚨 [ALERT] VOICE: PATIENT_DISTRESS - Room 101 - TestPatient
  ```

**Step 5: Does nurse receive alert?**
- Nurse console (F12) should show:
  ```
  🚨 [NURSE] New alert received: {alert object}
  🔊 [NURSE] Alert SFX playing
  🎤 [NURSE] Generating TTS for: ALERT: TestPatient...
  ✅ [NURSE] TTS audio generated
  🎵 [NURSE] TTS audio playing
  ```

---

## Common Issues & Fixes

### Issue: Agent says `ℹ️  No keywords found`

**Problem:** Patient said something but keywords don't match

**Fix:**
- Check exact keywords in agent.py:
  ```
  DISTRESS_KEYWORDS = [
    "help",
    "help me",
    "choking",
    "can't breathe",
    "cannot breathe",
    "pain",
    "emergency",
  ]
  ```
- Say EXACTLY: "help" or "help me" (lowercase)
- Not: "can you help me?" (too many words)
- Not: "HELP!!!" (capital letters should still work due to .lower())

### Issue: `❌ ALERT FAILED: Connection refused`

**Problem:** Backend not running on port 3000

**Fix:**
```
1. Check Terminal 1: Is backend running?
2. If not: cd backend; npm run dev
3. If yes: Check if port 3000 is in use: netstat -ano | findstr :3000
```

### Issue: Agent shows `🟢 Monitoring` but patient transcript never appears

**Problem:** LiveKit connection not set up properly

**Fix:**
```
1. Check LIVEKIT_URL env var is set
2. Check LIVEKIT_API_KEY and LIVEKIT_API_SECRET
3. Restart agent.py
4. Make sure patient is streaming (video shows in nurse dashboard)
```

### Issue: Nurse receives alert but NO TTS audio

**Problem:** ElevenLabs API issue

**Fix:**
- Check ELEVENLABS_API_KEY env var is set
- Check backend terminal for errors
- Look for: `❌ [NURSE] TTS generation failed`
- Try manual test:
  ```bash
  curl -X POST http://localhost:3000/api/alert-audio \
    -H "Content-Type: application/json" \
    -d '{"text":"Test alert message"}'
  ```
  Should return base64 audio data

---

## Quick Test Checklist

- [ ] Backend running on :3000
- [ ] Frontend running on :5174
- [ ] Patient logged in to room 101
- [ ] Patient console shows: "✅ [PATIENT] Connected to backend"
- [ ] Click 🧪 Test Alert button
- [ ] Backend console shows alert received ✓
- [ ] Nurse dashboard shows red alert box ✓
- [ ] Nurse hears TTS audio ✓

**All checked = System working!**

---

## Advanced: Test Each Component Separately

### Test Backend Alert Endpoint
```bash
curl -X POST http://localhost:3000/alert \
  -H "Content-Type: application/json" \
  -d '{
    "room": "101",
    "event": "PATIENT_DISTRESS",
    "transcript": "Test voice alert",
    "source": "voice",
    "severity": "high"
  }'

# Should return: {"success":true,"alert":{...}}
```

### Test ElevenLabs Audio Generation
```bash
curl -X POST http://localhost:3000/api/alert-audio \
  -H "Content-Type: application/json" \
  -d '{"text":"Alert test message"}'

# Should return: {"audioBase64":"...","contentType":"audio/mp3"}
```

### Test Overshoot Alert (Visual Detection)
```bash
# First get patient ID from nurse console
# Then run:

curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_1234567890",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.92,
    "description": "Patient detected falling by vision system"
  }'
```

---

## Console Log Legend

### Backend Logs
```
📨 Alert request received
🔍 Searching for patient
✅ Patient found
📢 Broadcasting to nurses
🚨 Alert sent
❌ Error occurred
```

### Agent Logs
```
🟢 Monitoring started
🗣️ Voice detected
✅ Keyword matched
❌ Keyword not found
📤 Alert sent
❌ Alert failed
```

### Nurse Console Logs
```
🚨 Alert received
🔊 Alert SFX playing
🎤 Generating TTS
✅ TTS generated
🎵 TTS playing
❌ TTS failed
```

### Patient Console Logs
```
👤 User authenticated
🔗 Connecting to backend
✅ Connected
👁️ Room/Patient info
🧪 Test alert sent
```

---

## If Everything Fails

### Nuclear Option: Manual Alert
```
1. Patient dashboard: Click 🧪 Test Alert button
2. This bypasses voice detection entirely
3. If this works: Voice detection is problem
4. If this fails: Backend/Frontend issue
```

### Check All Env Vars
```bash
echo $LIVEKIT_URL
echo $LIVEKIT_API_KEY
echo $LIVEKIT_API_SECRET
echo $OVERSHOOT_API_KEY
echo $ELEVENLABS_API_KEY
```

All should return values.

### Restart Everything
```
1. Kill backend (Ctrl+C in Terminal 1)
2. Kill frontend (Ctrl+C in Terminal 2)
3. Kill agent (Ctrl+C in Terminal 3)
4. Wait 5 seconds
5. Restart all 3
6. Test again
```

---

## What's Integrated & Working

✅ Voice detection (agent.py listening)
✅ Visual detection (Overshoot endpoint ready)
✅ ElevenLabs TTS (audio generation)
✅ Alert broadcasting (WebSocket to nurses)
✅ Alert storage (last 200 alerts)
✅ Patient video streaming (no black screen fix)
✅ Nurse dashboard (shows alerts with priority)

---

## Next: If Voice Still Doesn't Work

1. Check agent.py is actually running
2. Check agent can access patient's room
3. Verify LiveKit connectivity
4. Test with manual curl commands
5. If manual works, problem is voice detection chain

The **Test Alert button** confirms backend is working - use that to narrow down the problem!
