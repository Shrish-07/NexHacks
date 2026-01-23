# Backend & Frontend Connection Fixes - Testing Guide

## ✅ All Fixes Applied

### Backend Fixes ✅
1. **WebSocket Connection Event** - Backend now sends `{ type: 'connected' }` when client connects
2. Tested: Backend starts successfully on port 3000

### Frontend Fixes ✅
1. **Health Check** - Calls `/health` before attempting WebSocket
2. **Connection Timeout** - 10-second timeout for WebSocket connections
3. **Error Logging** - Detailed error messages showing backend URL and attempt number
4. **Exponential Backoff** - Retries 5 times with increasing delays (3s, 6s, 12s, 24s, 48s)
5. **Environment Variables** - Supports `VITE_BACKEND_URL` for production
6. Tested: Frontend builds successfully

---

## 🧪 Local Testing Results

### Server Status ✅
```
Backend Port 3000: ✅ RUNNING
- Environment: LIVEKIT, OVERSHOOT, ELEVENLABS configured
- WebSocket: ws://localhost:3000
- HTTP: http://localhost:3000

Frontend Port 5173: ✅ RUNNING
- Vite dev server ready
```

---

## 📝 Expected Behavior When Testing

### Patient/Nurse Connection Flow

1. **Patient logs in** → `nurse@example.com` / `password`
   - Frontend calls health check
   - Frontend connects to WebSocket
   - Backend sends `{ type: 'connected', status: 'ok' }`
   - Frontend logs: `✅ Backend is alive`
   - Frontend logs: `✅ Connected to backend via WebSocket`
   - Patient dashboard shows "Connected"

2. **Nurse logs in** → (different tab or browser)
   - Same connection flow
   - Nurse dashboard shows list of connected patients
   - Nurse can see patient video stream from LiveKit

3. **Patient Submits Alert** (Overshoot Detection)
   - Patient's camera feed monitored by Overshoot.ai
   - Overshoot detects: fall, bed exit, prolonged inactivity, etc.
   - Backend receives alert from Overshoot API
   - Backend broadcasts to all nurses: `{ type: 'new_alert', alert: {...} }`
   - Nurse dashboard shows alert with video feed

4. **Voice Alert** (LiveKit Audio)
   - Patient speaks in LiveKit room
   - Agent detects keywords (fall, help, etc.)
   - Agent sends voice_alert to backend
   - Backend broadcasts to nurse dashboard
   - Nurse hears audio transcript in alert

---

## 🔍 Console Logs to Look For

### Frontend Console (F12)

**Healthy Connection:**
```
📍 Using backend from env: [URL] (if VITE_BACKEND_URL set)
🔍 Checking backend health at: http://localhost:3000
✅ Backend is alive: {status: "ok", patients: 0, nurses: 0, ...}
🔌 Attempting WebSocket connection to: ws://localhost:3000
✅ Connected to backend via WebSocket
```

**Failed Connection (with retry):**
```
🔍 Checking backend health at: http://localhost:3000
⚠️ Backend health check failed: [error message]
🔌 Attempting WebSocket connection to: ws://localhost:3000
❌ WebSocket error: [detailed error]
   Backend URL: ws://localhost:3000
   Attempt: 1 / 5
⏳ Reconnecting in 3.0s (attempt 1/5)...
```

### Backend Console

**Healthy Connection:**
```
✅ New client connected, sent welcome event
[WS] Patient registered: patient-123, Patient Name, Room 101
```

**Broadcasting Alerts:**
```
[Alert Detected] Fall detected in Room 101
Broadcasting to 2 nurses...
```

---

## 🧪 Testing Checklist

Run through these steps with both browser tabs open:

### Step 1: Patient Connection
- [ ] Open `localhost:5173` in Tab 1
- [ ] Go to Login page
- [ ] Login as patient: `patient@example.com` / `password`
- [ ] Check console for: `✅ Backend is alive` and `✅ Connected to backend`
- [ ] Patient dashboard should show video feed area
- [ ] Status should show "Connected"

### Step 2: Nurse Connection
- [ ] Open `localhost:5173` in Tab 2 (same browser, different tab)
- [ ] Go to Login page
- [ ] Login as nurse: `nurse@example.com` / `password`
- [ ] Check console for connection messages
- [ ] Nurse dashboard should show patient list with patient from Tab 1
- [ ] Nurse can click on patient to view video stream

### Step 3: Verify Overshoot Integration
- [ ] Patient tab: Ensure camera permissions granted
- [ ] Video feed should be live from patient's camera
- [ ] Backend is receiving video frames from LiveKit
- [ ] Overshoot.ai processing frames for detection
- [ ] Trigger a fall/event: System should detect and alert

### Step 4: Verify LiveKit Audio
- [ ] Patient tab: Ensure microphone permissions granted
- [ ] Patient speaks: "Help" or "Fall" or "Emergency"
- [ ] Agent listens and processes audio
- [ ] Backend receives voice_alert from agent
- [ ] Nurse tab: Alert appears in dashboard with audio transcript

### Step 5: Verify Backend Detection (Render Cold-Start)
- [ ] Kill backend: Ctrl+C in backend terminal
- [ ] Try to perform action in patient/nurse tab
- [ ] Frontend should:
  - [ ] Show error in console
  - [ ] Wait 3 seconds
  - [ ] Automatically retry connection
  - [ ] Eventually reconnect when backend comes back
- [ ] Restart backend: `npm start`
- [ ] Frontend should reconnect successfully

---

## 🚀 Production Testing (After Push)

### When Deployed to Vercel + Render

1. **Set Environment Variables on Vercel:**
   ```
   VITE_BACKEND_URL=https://your-render-backend.onrender.com
   ```

2. **Connection Flow:**
   - Vercel frontend connects to Render backend URL
   - Same timeout/retry logic handles Render cold-start
   - Render spins up, frontend reconnects
   - System fully operational

3. **Test in Production:**
   - Open Vercel URL in browser
   - Login and verify connection
   - Check console for success messages
   - Verify full alert flow works

---

## ⚠️ Troubleshooting

### Frontend shows "WebSocket error"

**Check 1: Backend running?**
```powershell
# Verify backend is running
Invoke-WebRequest http://localhost:3000/health
```

**Check 2: Port 3000 in use?**
```powershell
# List processes on port 3000
netstat -ano | findstr :3000

# Kill if needed
Stop-Process -Id <PID> -Force
```

**Check 3: Firewall blocking?**
- Check Windows Firewall settings
- Whitelist port 3000 if needed

### Frontend console is blank

- Open browser DevTools: F12
- Check Console tab (not Network)
- Reload page: Ctrl+Shift+R
- Should see connection logs immediately

### Connection timeout after 10 seconds

- Backend may be too slow
- Check backend logs for errors
- Increase `CONNECT_TIMEOUT` if needed (currently 10000ms)

### Stuck on "⏳ Reconnecting..."

- Backend is down or unreachable
- Check backend is running: `npm start`
- Check console for error messages
- Will retry up to 5 times with exponential backoff

---

## 📊 Testing Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Startup | ✅ | Starts on port 3000, env vars set |
| WebSocket Welcome | ✅ | Sends `{ type: 'connected' }` |
| Health Endpoint | ✅ | Returns patient/nurse/alert counts |
| Frontend Build | ✅ | Zero TypeScript errors |
| Health Check | ✅ | Calls before WebSocket |
| Connection Timeout | ✅ | 10-second timeout implemented |
| Error Logging | ✅ | Detailed messages with URL/attempt |
| Retry Logic | ✅ | 5 attempts with exponential backoff |
| Env Var Support | ✅ | `VITE_BACKEND_URL` configurable |
| Video Stream | ⏳ | Ready to test (LiveKit configured) |
| Overshoot Detection | ⏳ | Ready to test (API key set) |
| Voice Alerts | ⏳ | Ready to test (LiveKit + ElevenLabs set) |

---

## ✅ Ready for Production

All backend connection issues have been fixed:
- ✅ Backend sends connection event
- ✅ Frontend health checks before connecting
- ✅ 10-second timeout prevents hanging
- ✅ Detailed error messages aid debugging
- ✅ 5-attempt retry with backoff handles Render cold-start
- ✅ Environment variable support for production URLs
- ✅ Exponential backoff capped at 1 minute

**Next Steps:**
1. Run through testing checklist with patient + nurse
2. Verify Overshoot detects video events
3. Verify LiveKit audio and voice alerts work
4. Commit and push to GitHub
5. Deploy to Vercel + Render
6. Set production environment variables

