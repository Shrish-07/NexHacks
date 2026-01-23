# 🧪 Local Testing Guide - Complete Verification

All errors fixed! ✅ Here's how to test everything locally before pushing to production.

## 📊 Testing Checklist

### Phase 1: Connection Tests (5 minutes)
- [ ] Backend starts without errors on port 3000
- [ ] Frontend loads and auto-detects backend at localhost:3000
- [ ] WebSocket connection established between frontend and backend
- [ ] Nurse dashboard loads with patient list

### Phase 2: Manual Alert Tests (5 minutes)
- [ ] Create manual alert via curl
- [ ] Alert appears in nurse dashboard immediately
- [ ] Alert sound plays
- [ ] Alert TTS message generated
- [ ] Alert can be acknowledged

### Phase 3: Voice Detection Tests (10 minutes)
- [ ] Agent connects to LiveKit
- [ ] Agent detects distress keywords ("help", "pain", etc.)
- [ ] Voice alert sent to backend
- [ ] Alert appears in nurse dashboard
- [ ] Correct confidence and transcript recorded

### Phase 4: Visual Detection Tests (10 minutes)
- [ ] Visual alert endpoint accepts POST requests
- [ ] Alert with CHOKING condition processed
- [ ] Alert with SEIZURE condition processed
- [ ] Alert with FALL condition processed
- [ ] Confidence score properly recorded

### Phase 5: End-to-End Flow (10 minutes)
- [ ] Multiple alerts can be created rapidly
- [ ] All alerts broadcast to all connected nurses
- [ ] Patients connect properly
- [ ] Video stream setup works
- [ ] Dashboard remains responsive under load

---

## 🚀 Testing Instructions

### Test 1: Backend Health
```bash
# Terminal 1 - Backend
cd backend
npm start

# Should see:
# ✅ Server running on port 3000
# ✅ Connected to services
# ✅ Ready for patient/nurse connections
```

### Test 2: Frontend Connection
```bash
# Terminal 2 - Frontend  
cd frontend
npm run dev

# Should see:
# ✅ VITE ready on http://localhost:5173/
# ✅ No compilation errors
```

### Test 3: Check Backend Health (Terminal 3)
```bash
# Verify backend is responding
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "patients": 0,
#   "nurses": 0,
#   "alerts": [],
#   "livekit": { "configured": true }
# }
```

### Test 4: Create Manual Alert
```bash
# Create a test alert
curl -X POST http://localhost:3000/alert \
  -H "Content-Type: application/json" \
  -d '{
    "room": "305",
    "event": "TEST_ALERT",
    "transcript": "Patient falling off bed",
    "severity": "high",
    "source": "manual"
  }'

# Expected response:
# { "success": true, "alert": { ... } }

# Check nurse dashboard at http://localhost:5173/
# Alert should appear in real-time
```

### Test 5: Test Visual Alert Endpoint
```bash
# Test Overshoot/Visual alert endpoint
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_001",
    "roomNumber": "305",
    "condition": "CHOKING",
    "confidence": 0.92,
    "description": "Patient clutching throat, unable to speak, face turning red"
  }'

# Expected response:
# { "success": true, "alert": { ... } }
```

### Test 6: Check Alerts Endpoint
```bash
# Get all alerts
curl http://localhost:3000/api/alerts

# Should return array of recent alerts
```

### Test 7: Voice Detection Setup
```bash
# Terminal 3 - Start agent (if testing voice)
python agent.py

# Should see:
# ✅ PATIENT MONITOR AGENT - STARTING UP
# ✅ LiveKit URL set: true
# ✅ API Key set: true
# 🔊 Starting agent worker...
# ✅ Agent ready for patient connections
```

### Test 8: Test Alert Acknowledgement
```bash
# Get alert ID from previous tests, then acknowledge it
curl -X POST http://localhost:3000/api/alerts/<alert-id>/acknowledge \
  -H "Content-Type: application/json" \
  -d '{ "nurseId": "NURSE_001" }'

# Expected response:
# { "success": true }
```

---

## 🎯 Expected Behaviors

### Manual Alerts Should:
- ✅ Appear in nurse dashboard within 100ms
- ✅ Trigger audio alert sound
- ✅ Generate TTS message
- ✅ Show in real-time without refresh
- ✅ Display all fields: patientName, roomNumber, condition, description

### Voice Alerts Should:
- ✅ Be created when agent detects keywords
- ✅ Include transcript of detected speech
- ✅ Include confidence score (0-1)
- ✅ Include urgency level (high/critical)
- ✅ Play audio notification

### Visual Alerts Should:
- ✅ Accept POST to /api/overshoot-alert
- ✅ Include condition (CHOKING, SEIZURE, FALL, DISTRESS)
- ✅ Include confidence (0-1)
- ✅ Include description text
- ✅ Broadcast to all connected nurses

---

## 🔍 Debugging

### If alerts don't appear in dashboard:
```bash
# Check browser console (F12) for errors
# Check if WebSocket is connected
# Verify backend is running on port 3000
# Check if nurse is logged in
```

### If audio doesn't play:
```bash
# Check browser audio permissions
# Verify audio file path is correct
# Check console for play() errors
```

### If agent crashes:
```bash
# Check .env has LIVEKIT_URL set
# Check agent.py BACKEND_ALERT_URL = "http://127.0.0.1:3000/alert"
# Verify LiveKit credentials are valid
```

### If frontend doesn't connect to backend:
```bash
# Check if backend is running: curl http://localhost:3000/health
# Check browser Network tab for failed requests
# Verify CORS is enabled (should be by default)
# Check if frontend is using correct URL: http://localhost:3000
```

---

## 📋 Test Results Template

```
Date: ___________
Tester: ___________

Phase 1 - Connection:
✅ Backend running on 3000: YES / NO
✅ Frontend loads: YES / NO  
✅ WebSocket connected: YES / NO
✅ Patients visible: YES / NO

Phase 2 - Manual Alert:
✅ Alert created: YES / NO
✅ Appears in dashboard: YES / NO
✅ Sound plays: YES / NO
✅ TTS generated: YES / NO

Phase 3 - Voice Detection:
✅ Agent connects: YES / NO
✅ Keyword detected: YES / NO
✅ Alert sent: YES / NO
✅ Dashboard receives: YES / NO

Phase 4 - Visual Detection:
✅ CHOKING detected: YES / NO
✅ SEIZURE detected: YES / NO
✅ FALL detected: YES / NO
✅ Confidence scores correct: YES / NO

Phase 5 - End-to-End:
✅ Multiple alerts simultaneous: YES / NO
✅ Broadcast to all nurses: YES / NO
✅ Dashboard responsive: YES / NO
✅ No console errors: YES / NO

READY FOR PRODUCTION: YES / NO
```

---

## 🎯 Quick Test (2 minutes)

If you just want quick confirmation everything works:

```bash
# Terminal 1
cd backend && npm start

# Terminal 2  
cd frontend && npm run dev

# Terminal 3
sleep 3 && curl http://localhost:3000/health && echo "✅ Backend OK"

# Terminal 3 (continued)
curl -X POST http://localhost:3000/alert \
  -H "Content-Type: application/json" \
  -d '{"room":"305","event":"QUICK_TEST","severity":"high","source":"test"}' && echo "✅ Alert created"
```

Then visit http://localhost:5173/ and check nurse dashboard for the alert.

---

## ✅ All Tests Passing?

Once all tests pass locally:

1. Push to GitHub: `git push`
2. Deploy backend to Render (I'll ask for the credentials)
3. Deploy frontend to Vercel (I'll ask for the credentials)
4. Update frontend to use Render URL if different domain
5. Test production deployment

Ready? Let me know! 🚀
