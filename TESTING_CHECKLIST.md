# 🧪 ATTUNE Quick Testing Checklist

## 🚀 START HERE

### Prerequisites
- [ ] Backend running: `http://localhost:3000` (WebSocket: `ws://localhost:3000`)
- [ ] Frontend running: `http://localhost:5174`
- [ ] Two browser windows open (or tabs)

---

## Test 1: Nurse Login & Dashboard

**Browser 1:**
```
1. Go to http://localhost:5174/login
2. Click "Nurse" button
3. Enter Nurse ID: NURSE_001
4. Enter Name: John (optional)
5. Click "Login as Nurse"
```

**Verify:**
- [ ] Redirected to `/dashboard`
- [ ] "ATTUNE Nurse Station" header visible
- [ ] Connection status shows green dot with "connected"
- [ ] Three patient cards displayed
- [ ] No errors in browser console (F12)

**Expected UI:**
```
┌─────────────────────────────────────────────┐
│ ATTUNE Nurse Station      [⚫ connected]     │
│ [Logout]                                    │
├─────────────────────────────────────────────┤
│  ⚠️  0 Alerts                                │
├─────────────────────────────────────────────┤
│  ┌─ John Doe (Room 305)  ┌─ Rayhan (42B)   │
│  │ [video]               │ [video]         │
│  └─────────────────────  └────────────────  │
│  ┌─ Sourish (Room 17C)                      │
│  │ [video]                                 │
│  └─────────────────────────────────────────┘
```

---

## Test 2: Patient Login

**Browser 2:**
```
1. Go to http://localhost:5174/login
2. Click "Patient" button
3. Select: John Doe (or another from dropdown)
4. Room: 305
5. Click "Login as Patient"
```

**Verify:**
- [ ] Login successful
- [ ] Backend logs show: "[WS] Patient registered: PATIENT_001"
- [ ] No errors in browser console

**In Nurse Dashboard (Browser 1):**
- [ ] Patient card status updates to "Live" or "Connected"
- [ ] Still shows "Waiting for video..." (expected - no video source yet)

---

## Test 3: WebRTC Handshake

**Check Backend Logs:**
```
✅ [WS] Offer → patient PATIENT_001
✅ [WS] Answer → nurse NURSE_001
✅ [WS] ICE candidates exchanged
```

**Check Browser Console (Nurse Dashboard - F12):**
```
✅ handleWebRtcOffer called
✅ RTCPeerConnection created
✅ Answer sent
✅ ICE candidates being processed
```

---

## Test 4: Simulate Alert

**In Nurse Dashboard Console (F12):**
```javascript
// Manually send a test alert
backendService.send(JSON.stringify({
  type: 'alert',
  patientId: 'PATIENT_001',
  patientName: 'John Doe',
  roomNumber: '305',
  condition: 'FALL_ALERT',
  confidence: 0.95,
  description: 'Patient fell near bed',
  urgency: 'immediate',
  source: 'vision'
}))
```

**Verify:**
- [ ] Red alert box appears at top of dashboard
- [ ] Alert sound plays (if not muted)
- [ ] Patient card shows red border
- [ ] Alert shows: Patient name, room, condition, description
- [ ] "Acknowledge" button present

**Alert Box Should Show:**
```
┌──────────────────────────────────────────┐
│ 🚨 1 Alert(s)                            │
├──────────────────────────────────────────┤
│ John Doe - Room 305                      │
│ FALL_ALERT                               │
│ Patient fell near bed                    │
│ [Acknowledge] button                     │
└──────────────────────────────────────────┘
```

---

## Test 5: Alert Acknowledgment

**In Nurse Dashboard:**
```
1. Click "Acknowledge" button on alert
2. Watch console for confirmation
3. Alert should disappear or change color
```

**Verify:**
- [ ] Alert box closes or shows "Acknowledged by NURSE_001"
- [ ] Backend logs show: "[POST] Alert acknowledged"
- [ ] No errors in console

---

## Test 6: Connection & Disconnect

### Disconnect Test
**Patient Browser (Browser 2):**
```
1. Close the tab/window
2. OR Press F12, go to Network, throttle to "Offline"
```

**Nurse Dashboard (Browser 1):**
- [ ] Patient card status changes to "Disconnected"
- [ ] Backend logs: "[WS] Patient disconnected: PATIENT_001"

### Reconnect Test
**Patient Browser:**
```
1. Go back to http://localhost:5174/login
2. Login again
3. Watch for reconnection
```

**Verify:**
- [ ] Patient re-registers
- [ ] Backend shows new connection
- [ ] Nurse dashboard updates

---

## Test 7: Logout

**Nurse Dashboard:**
```
1. Click "Logout" button (top right)
2. Watch for redirect
```

**Verify:**
- [ ] Redirected to login page
- [ ] localStorage cleared (check console)
- [ ] Backend shows: "[WS] Nurse disconnected: NURSE_001"

---

## 🔍 Debugging Checklist

### If Frontend Won't Load
```bash
cd frontend
npm install --legacy-peer-deps
npx vite --host 0.0.0.0 --force
```

### If WebSocket Won't Connect
```javascript
// In console
backendService.ws  // Should exist and have OPEN state (1)
backendService.isConnected()  // Should be true
```

### If Alert Won't Trigger
```bash
# In backend terminal, check alert logs
# Should see: "[ALERT] VISION: FALL_ALERT"
```

### If Video Won't Stream
- Verify ICE candidates in console
- Check browser permissions (camera access)
- Verify Peer Connection state

---

## ✅ Full Test Suite Results

| Test | Status | Notes |
|------|--------|-------|
| Backend starts | ✅ | Port 3000 |
| Frontend loads | ✅ | Port 5174 |
| Nurse login | ✅ | Role-based |
| Patient login | ✅ | Demo patients |
| WebSocket connect | ✅ | Auto-reconnect |
| WebRTC signaling | ✅ | Offer/Answer/ICE |
| Alert trigger | ✅ | Manual test ready |
| Alert display | ✅ | Sound + UI |
| Alert acknowledge | ✅ | Backend API |
| Logout | ✅ | Session cleared |
| Error handling | ✅ | Graceful fallback |

---

## 🎯 Success Message

When everything works:
```
✅ Frontend connected to Backend
✅ WebSocket communication established
✅ Patient registered with Nurse
✅ WebRTC offer/answer exchanged
✅ ICE candidates flowing
✅ Alert system responsive
✅ Dashboard showing live data
```

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot GET /"
**Fix:** Make sure you're going to `/login`, not root
```
Wrong: http://localhost:5174
Right: http://localhost:5174/login
```

### Issue: "WebSocket is closed"
**Fix:** Backend isn't running
```bash
cd backend
npm run dev
```

### Issue: "Cannot find module"
**Fix:** Dependencies not installed
```bash
cd frontend
npm install --legacy-peer-deps
```

### Issue: "Port 5173 is in use"
**Fix:** Another process is using the port
```bash
# Kill the process or use different port
npx vite --host 0.0.0.0 --port 5174
```

---

## 🎓 Architecture Reference

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│ ┌─────────────────────────────────────┐ │
│ │ NurseDashboard                      │ │
│ │ ├─ authService (check user)        │ │
│ │ ├─ backendService (WebSocket)      │ │
│ │ ├─ WebRTC peer connections         │ │
│ │ └─ Video stream attachement        │ │
│ └─────────────────────────────────────┘ │
└────────────────┬────────────────────────┘
                 │ WebSocket
    ┌────────────┴────────────┐
    ▼                         ▼
Backend (Node + Express)  LiveKit
├─ WebSocket Server        (Voice/Video)
├─ WebRTC Signaling Hub
├─ Alert Routing
└─ API Endpoints
```

---

## 📞 Support

**If tests fail:**
1. Check browser console (F12)
2. Check backend terminal logs
3. Check network tab (DevTools → Network)
4. Verify all .env keys are set
5. Restart both backend and frontend

**Key files to check:**
- `frontend/src/services/backendService.ts` - Connection logic
- `backend/patient-monitor.js` - Server logs
- `.env` - API configuration

---

**Last Updated:** January 23, 2026
**Version:** 1.0 Production Ready
