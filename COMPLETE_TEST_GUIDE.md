# Complete System Test Guide

## ALL SYSTEMS RUNNING ✅
- Backend: http://localhost:3000 (WebSocket: ws://localhost:3000)
- Frontend: http://localhost:5173
- All environment variables configured
- All APIs responding

---

## TEST 1: Complete Patient-to-Nurse Video Flow (5 minutes)

### Step 1: Open Two Browser Windows
```
Window 1: http://localhost:5173 (Patient)
Window 2: http://localhost:5173 (Nurse)
```

### Step 2: Patient Login
- Window 1 → Click [Not shown, auto on landing]
- Enter Patient Name: `TestPatient1`
- Enter Room: `101`
- Click Login
- **Expected**: Black video box appears, "Waiting for nurse request..."

### Step 3: Nurse Login  
- Window 2 → Land on patient-only page
- Press `N` key (hidden nurse login)
- Enter Nurse ID: `NURSE_ADMIN`
- Click Login as Nurse
- **Expected**: Patient card appears with "TestPatient1 - Room 101" and "Request Video" button

### Step 4: Request & Stream
- Window 2 (Nurse) → Click "Request Video" on patient card
- **Expected**: Button disappears, status changes to "Live"
- Window 1 (Patient) → Browser prompts for camera access
- Click "Allow"
- **Expected**: 
  - Patient sees own camera feed
  - "LIVE" badge appears
  - Nurse sees patient's camera (NOT BLACK SCREEN) ✅

### Verification Checklist
- [ ] Patient sees camera feed
- [ ] Nurse sees patient's camera (confirm it's NOT black)
- [ ] Status shows "Live" on nurse side
- [ ] Smooth video without artifacts
- [ ] Both see "LIVE" indicator

### Console Logs to Look For (Press F12)
**Patient Console**:
- "✅ Local description set (offer)"
- "📤 Offer sent to nurse"

**Nurse Console**:
- "🎬 ontrack fired!"
- "💾 Remote stream stored"
- "✅ Stored stream applied"

---

## TEST 2: Voice-Activated Alert Flow (5 minutes)

### Step 1: Setup
- Keep patient logged in from Test 1
- Keep nurse logged in from Test 1
- Open DevTools on nurse window (F12 → Console)

### Step 2: Trigger Voice Alert
- Window 1 (Patient) → Make sure speaker/mic volume up
- Say near your mic: **"HELP"** or **"CALL NURSE"**
- Agent should detect and send alert

### Expected Result
- Nurse console shows: WebSocket alert message
- Nurse dashboard top shows RED ALERT box
- Nurse browser plays sound effect
- Nurse hears spoken alert: "ALERT: TestPatient1 in room 101..."

### Voice Keywords That Work
- "help"
- "help me"
- "can't breathe"
- "cannot breathe"
- "choking"
- "pain"
- "emergency"

### Verification Checklist
- [ ] Alert appears in nurse dashboard (red box at top)
- [ ] Sound effect plays
- [ ] Spoken alert plays (if speaker enabled)
- [ ] Alert shows patient name and room
- [ ] Alert shows in alert history

---

## TEST 3: Multiple Patients (10 minutes)

### Step 1: Login Multiple Patients
- Open 3+ browser windows
- Each logs in as different patient
  - Patient1: Room 101
  - Patient2: Room 102
  - Patient3: Room 103

### Step 2: Nurse Dashboard
- All patient cards appear
- Each shows name and room

### Step 3: Request Video from Each
- Request video from Patient1 → video displays ✅
- Request video from Patient2 → video displays ✅
- Request video from Patient3 → video displays ✅

### Verification
- [ ] All patient cards render correctly
- [ ] No overlapping video feeds
- [ ] Each feed independent
- [ ] Can switch between patients
- [ ] No performance degradation

---

## TEST 4: UI/UX Verification (5 minutes)

### Login Page
- [ ] Page has smooth animations
- [ ] Hover effects work on login button
- [ ] Form inputs have focus states (blue border)
- [ ] Error messages display in red
- [ ] Patient button is prominent
- [ ] Nurse login accessible via 'N' press

### Nurse Dashboard
- [ ] Patient cards have gradient backgrounds
- [ ] Cards scale on hover
- [ ] Status badge glows when "Live"
- [ ] Alert box is eye-catching (red with glow)
- [ ] Video area shows proper placeholder when no stream
- [ ] Header connection status displays correctly

### Patient Dashboard
- [ ] Camera feed displays clearly
- [ ] "LIVE" badge appears when streaming
- [ ] Video area shows waiting state nicely
- [ ] Overshoot integration message displays
- [ ] Logout button accessible

---

## TEST 5: Connection Stability (10 minutes)

### Step 1: Monitor Connections
- Keep test setup running from Test 1
- Open Browser DevTools Network tab
- Look for WebSocket connection (green, persistent)

### Step 2: Test Reconnection
- Close Patient browser → Reconnect
  - Patient should show "Connecting..." then "Connected"
- Close Nurse browser → Reconnect
  - Nurse should see "Connecting..." then "Connected"
  - Patient list should repopulate

### Step 3: Network Tab Analysis
- WebSocket connection shows as active (blue)
- No errors (red 500s)
- Messages flowing regularly (not stalled)

### Verification
- [ ] WebSocket stays connected
- [ ] Reconnection works smoothly
- [ ] No message loss
- [ ] State preserved after reconnect

---

## TEST 6: Backend Health Check

### Run Health Check
```powershell
# In any terminal
curl http://localhost:3000/health
```

### Expected Response
```json
{
  "status": "ok",
  "patients": 1,
  "nurses": 1,
  "alerts": 2,
  "livekit": {
    "configured": true
  }
}
```

### Verification
- [ ] Status shows "ok"
- [ ] Patient/nurse counts correct
- [ ] Alert count increases
- [ ] LiveKit shows configured

---

## TROUBLESHOOTING

### Black Screen on Nurse Video
- Check nurse console for "🎬 ontrack fired!"
  - If not present: Check patient console for "offer sent"
  - If not sent: Check WebSocket connection
  - If ok: ICE connectivity issue

### No Voice Detection
- Check if patient room is in LiveKit room
- Check if agent.py is running
- Check backend logs for distress keyword match

### Audio Not Playing
- Check speaker volume
- Check browser permissions (audio playback)
- Check ElevenLabs API key is valid
- Check backend `/api/alert-audio` endpoint

### Nurse Can't Login
- Press `N` on landing page (hidden nurse mode)
- If still not working: Clear browser storage (F12 → Application → Clear)

### Video Lag
- Check network speed (Network tab)
- Check video resolution (patient console shows ideal 1280x720)
- Check CPU usage (may need to reduce resolution)

---

## FULL FLOW TEST (20 minutes)

1. ✅ Start backend (Terminal 1) - Already running
2. ✅ Start frontend (Terminal 2) - Already running
3. ✅ Open two browser windows
4. ✅ Patient login as "TestPatient1", Room "101"
5. ✅ Nurse login (press N), ID "NURSE_ADMIN"
6. ✅ Nurse requests video
7. ✅ Patient allows camera
8. ✅ Verify video displays (not black)
9. ✅ Patient says "help"
10. ✅ Verify alert appears
11. ✅ Verify alert sound plays
12. ✅ Verify spoken alert plays
13. ✅ Check console logs for debug info
14. ✅ Test disconnect/reconnect
15. ✅ Test with multiple patients

---

## SYSTEM STATUS

- Backend: ✅ Running (ws://localhost:3000)
- Frontend: ✅ Running (http://localhost:5173)
- Environment: ✅ All 5 vars set
- Database: ℹ️ In-memory (resets on restart)
- Auth: ✅ Custom names (no secure tokens yet)
- Video: ✅ WebRTC P2P streaming
- Audio: ✅ ElevenLabs alerts
- Vitals: ℹ️ Coming soon (Overshoot integration)

---

## SUCCESS CRITERIA

All of the following must work:
- [ ] Patient can login with custom name
- [ ] Nurse can login (via 'N' key)
- [ ] Nurse can request video
- [ ] Patient video displays without artifacts
- [ ] Nurse sees patient video (not black screen)
- [ ] Alerts show on nurse dashboard
- [ ] Alerts play audio on nurse side
- [ ] Multiple patients work independently
- [ ] System reconnects after disconnect
- [ ] No console errors in either browser

If all checkboxes pass → **SYSTEM READY FOR DEMO** ✅

