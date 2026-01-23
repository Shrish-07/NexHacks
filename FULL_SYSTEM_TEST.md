# FULL SYSTEM TEST GUIDE

## 🚀 STARTUP

### Terminal 1 - Backend
```powershell
cd backend
npm run dev
```
**Expected:** `🚀 Server running on port 3000`

### Terminal 2 - Frontend
```powershell
cd frontend
npm run dev
```
**Expected:** `Local: http://localhost:5174/` (or another port if 5174 is busy)

### Terminal 3 - Python Agent (Optional - for voice alerts)
```powershell
cd venv\Scripts\Activate
cd ..
python -m livekit.agents create-proc
```

---

## 📋 LANDING PAGE FIX ✅

Go to: `http://localhost:5174/login`

### What You Should See
- **Top Left:** Logo + "ATTUNE Nurse Station" (NOT just "NurseDashboard")
- **Landing Page:** Shield icon with "ATTUNE" title
- **Two Side-by-Side Buttons:**
  - Left: **PATIENT** (Blue) - "Monitor yourself"
  - Right: **NURSE** (Cyan/Teal) - "Monitor patients"
- **NO "Press N" text** - Both buttons visible and equal
- **Smooth animations:** Fade-in, slide-in effects on load
- **Hover effects:** Both buttons scale up (105%) and glow

### Test Flow
1. Click **PATIENT** button
2. Should go to patient login form (distinct, labeled clearly)
3. Go back, click **NURSE** button
4. Should go to nurse login form (different colors - cyan instead of blue)

---

## 🔄 SESSION SYNC TEST ✅

### What This Fixes
- **Before:** Opening 2 tabs and logging in one would log out the other
- **After:** Each tab has independent session - both can be logged in simultaneously

### How to Test

**Tab 1:**
```
1. Open http://localhost:5174/login
2. Click PATIENT
3. Enter: Name="Patient1", Room="101"
4. Login
5. You see YOUR camera
6. KEEP THIS TAB OPEN
```

**Tab 2 (in SAME browser):**
```
1. Open http://localhost:5174/login in NEW TAB
2. Click NURSE
3. Enter: Nurse ID="NURSE_001"
4. Login
5. You see patient card with "Request Video" button
6. KEEP THIS TAB OPEN
```

**Success Criteria:**
- ✅ Both tabs stay logged in
- ✅ No auto-logout when refreshing either tab
- ✅ Different sessions maintained
- ✅ Nurse sees patient card
- ✅ Nurse sees "Request Video" button

**If "Request Video" button not showing:**
- Check browser console (F12) for errors
- Look for "patient.hasVideo" state
- Should show: `{patientId: "PATIENT_...", hasVideo: false, ...}`

---

## 🎥 VIDEO STREAMING TEST ✅

### Patient Side
1. Tab 1 (Patient): Should see your camera feed
2. Status badge in patient's room should show your face
3. No black screen ✅

### Nurse Side
1. Tab 2 (Nurse): Click "Request Video" button on Patient1 card
2. **CRITICAL:** Check for black screen - should NOT be black
3. Should see patient's camera feed
4. Status badge should change to "Live" (green pulse)
5. "Request Video" button should disappear

**If black screen:**
```
Check browser console (F12 → Console):
- Look for: "🎬 ontrack fired!"
- Look for: "💾 Stored stream applied"
- If NOT there: WebRTC connection issue
- If there: Video element rendering issue
```

---

## 🎤 VOICE ALERT TEST (Type 1: Voice Detection)

### Requirements
- Both tabs still logged in and connected
- Speaker volume ON (or headphones)
- Microphone enabled for patient tab

### Test Script

**Patient Tab:**
1. Speak clearly: **"HELP"** (into microphone/speaker)
2. Or say: "CALL NURSE", "CHOKING", "CAN'T BREATHE", "FALLING", "SEIZURE", "PAIN", "EMERGENCY"

**Nurse Tab - Expected:**
1. Red alert box appears at top with animation ↑
2. Message shows: "ALERT: Patient1 in room 101. PATIENT_DISTRESS. Patient distress detected by voice analysis"
3. **Speaker plays TTS audio:** "ALERT: Patient1 in room 101. PATIENT DISTRESS. Patient distress detected by voice analysis"
4. Alert appears in list below

### Voice Keywords That Trigger
```
- help
- help me
- choking
- can't breathe
- cannot breathe
- pain
- emergency
- call nurse
```

### Console Logs to See
Patient tab (F12 → Console):
```
[Room] detected distress keyword
🎤 Voice detected: "HELP"
```

Backend terminal:
```
[ALERT] VOICE: PATIENT_DISTRESS - Room 101 - Patient1
```

Nurse tab (F12 → Console):
```
🔊 Alert audio generated
🎵 Alert audio playing
```

---

## 📹 OVERSHOOT/VIDEO ALERT TEST (Type 2: Video-Based Detection)

### Requirements
- Both tabs still connected
- curl or Postman installed (to simulate Overshoot detection)
- Or write a test script

### Simulating Overshoot Detection

Open a new terminal and run:

```bash
# Test FALLING detection
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_...",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.92,
    "description": "Patient detected falling by Overshoot computer vision"
  }'
```

Replace `PATIENT_...` with actual patient ID from nurse tab console.

### What Happens

**Nurse Tab - Expected:**
1. Red alert appears: "ALERT: Patient1 in room 101. PATIENT_FALLING..."
2. Speaker plays: "ALERT: Patient1 in room 101. PATIENT FALLING. Patient detected falling by Overshoot computer vision"
3. Alert in list shows source: "overshoot"
4. Confidence score shown: 0.92

### Test All Overshoot Events

```bash
# CHOKING detection
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"PATIENT_...","roomNumber":"101","condition":"PATIENT_CHOKING","confidence":0.88,"description":"Choking detected by computer vision"}'

# SEIZURE detection
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"PATIENT_...","roomNumber":"101","condition":"PATIENT_SEIZURE","confidence":0.95,"description":"Seizure activity detected"}'
```

### Backend Log Expected
```
[ALERT] OVERSHOOT: PATIENT_FALLING - Patient1 (Room 101) - Confidence: 0.92
[ALERT] OVERSHOOT: PATIENT_CHOKING - Patient1 (Room 101) - Confidence: 0.88
[ALERT] OVERSHOOT: PATIENT_SEIZURE - Patient1 (Room 101) - Confidence: 0.95
```

---

## 📊 ALERT SYSTEM COMPREHENSIVE TEST

### Test Case Matrix

| Scenario | Input | Expected Output | Status |
|----------|-------|-----------------|--------|
| Voice: Help | Patient says "HELP" | Red alert + TTS | ✅ |
| Voice: Choking | Patient says "CHOKING" | Red alert + TTS | ✅ |
| Voice: Falling | Patient says "FALLING" | Red alert + TTS | ✅ |
| Voice: Seizure | Patient says "SEIZURE" | Red alert + TTS | ✅ |
| Overshoot: Fall | curl POST /api/overshoot-alert (PATIENT_FALLING) | Red alert + TTS | ✅ |
| Overshoot: Choking | curl POST /api/overshoot-alert (PATIENT_CHOKING) | Red alert + TTS | ✅ |
| Overshoot: Seizure | curl POST /api/overshoot-alert (PATIENT_SEIZURE) | Red alert + TTS | ✅ |
| Multiple Alerts | 3+ alerts in quick succession | All appear in list | ✅ |
| Alert Persistence | Refresh nurse tab | Alerts stay visible | ✅ |

---

## 🔍 DEBUG CONSOLE LOGS

### Patient Tab Console
```
✅ Patient logged in
✅ WebSocket connected
🎤 [Room 101] {transcript}
🎤 Distress detected: HELP
📤 Alert sent to backend
```

### Backend Terminal
```
✅ Patient registered: PATIENT_... Patient1 Room 101
✅ Nurse registered: NURSE_001
[ALERT] VOICE: PATIENT_DISTRESS - Room 101 - Patient1
[ALERT] OVERSHOOT: PATIENT_FALLING - Room 101 - Patient1
```

### Nurse Tab Console
```
✅ Nurse logged in
✅ WebSocket connected
🔊 Alert audio generated
🎵 Alert audio playing: "ALERT: Patient1..."
✅ New alert received
```

---

## ❌ TROUBLESHOOTING

### Black Screen on Nurse Side
```
Solution:
1. Check if patient tab shows camera
2. Check if "Request Video" button exists
3. Click "Request Video" again
4. Wait 3 seconds
5. Check browser console for "🎬 ontrack fired!"
```

### No Voice Detection
```
Solution:
1. Check microphone is enabled in browser settings
2. Try saying keyword louder and clearer
3. Check agent.py is running (if using voice)
4. Check backend log for voice keywords
5. Try manual curl command for Overshoot alert
```

### No Audio Alert Playing
```
Solution:
1. Check speaker volume
2. Check browser audio permissions (F12 → Settings)
3. Try refreshing page
4. Check "🔊 Alert audio generated" in console
5. Try manual curl to test /api/alert-audio endpoint
```

### Sessions Logging Out
```
Solution:
1. Check that sessionStorage is used (not localStorage)
2. Try in private/incognito window (no extensions)
3. Check browser console for storage errors
4. Clear browser storage (F12 → Application → Clear)
```

---

## ✅ SUCCESS CHECKLIST

All tests passing if:
- ✅ Landing page shows 2 equal buttons (Patient + Nurse)
- ✅ Both tabs can stay logged in simultaneously
- ✅ Video streams without black screen
- ✅ Status changes to "Live" when video requested
- ✅ Voice alerts trigger red alert + TTS
- ✅ Overshoot alerts trigger red alert + TTS
- ✅ All alert types show in nurse dashboard
- ✅ No console errors in either tab
- ✅ Backend logs show all alert types
- ✅ TTS audio plays on nurse side

**System is READY FOR PRODUCTION when all above pass!** 🎉

---

## 🚀 NEXT STEPS

### After Verification
1. Deploy frontend to Vercel
2. Deploy backend to Render/Railway
3. Set up database (PostgreSQL) for persistence
4. Configure HTTPS/WSS certificates
5. Update environment variables in production

### Production Checklist
- [ ] Remove debug console.logs
- [ ] Add authentication tokens
- [ ] Set up error logging (Sentry)
- [ ] Configure CORS properly
- [ ] Set up monitoring/uptime alerts
- [ ] Test with real Overshoot API
- [ ] Test with real LiveKit cloud
- [ ] Load testing (multiple patients/nurses)
