# 🚀 Quick Start: Run Local & Test

## Run Everything (5 minutes)

### Open 3 Terminals

**Terminal 1: Backend (Port 3000)**
```bash
cd backend
npm start
```
Wait for: `Server running on port 3000`

**Terminal 2: Frontend (Port 5174)**
```bash
cd frontend
npm run dev
```
Wait for: `Local: http://localhost:5174/`

**Terminal 3: Agent (Optional - for voice testing)**
```bash
python agent.py
```
Wait for: `✅ Connected to LiveKit!`

---

## Test It

### Browser Window 1: Patient
```
Open: http://localhost:5174/login
Login: "Add Patient"
Name: "Test Patient"
Room: "101"
Click: "Start Monitoring"
```

### Browser Window 2: Nurse  
```
Open: http://localhost:5174/login (different window)
Login: "Nurse Login"
PIN: 1234
Click: "Access Dashboard"
```

### Test 1: Manual Alert (1 minute)
```
Patient Window: Click "Test Alert" button
Nurse Window: Red card appears ✅
Listen: TTS audio plays ✅
```

### Test 2: Voice Alert (5 minutes - if agent running)
```
Patient Window: Speak "HELP"
Agent Console: Should show "DISTRESS KEYWORD DETECTED!"
Nurse Window: Red card appears ✅
Listen: TTS audio plays ✅
```

### Test 3: Visual Alert (1 minute)
```bash
# In any terminal:
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"TEST","roomNumber":"101","condition":"PATIENT_FALLING","confidence":0.95}'

# Result:
Nurse Window: Red card appears ✅
Listen: TTS audio plays ✅
```

---

## How It Works

```
Frontend (http://localhost:5174)
    ↓
Detects: hostname = 'localhost'
    ↓
Auto-connects to: http://localhost:3000
    ↓
Backend responds
    ↓
Everything works! ✅
```

**No configuration needed!** It's automatic.

---

## Verify Connection

### Browser Console (F12)
Should show:
```
✅ Connected to backend
```

### Test Endpoint
```bash
curl http://localhost:3000/health
```

Should return:
```json
{"status":"ok","patients":0,"nurses":0,"alerts":0}
```

---

## For Production (Later)

When you deploy to Vercel + Render:

1. Backend → Render (gets URL like `https://your-backend.onrender.com`)
2. Frontend → Vercel (gets URL like `https://your-frontend.vercel.app`)
3. Frontend auto-detects it's not localhost
4. Frontend connects to same domain: `https://your-frontend.vercel.app`

**Or manually configure:**
```typescript
// frontend/src/services/backendService.ts
private getHttpBase(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://your-backend.onrender.com';  // Add this
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend won't load | Check port 5174 is free |
| Backend won't start | Check port 3000 is free |
| Can't connect | Check both ports in use: `netstat -an \| findstr :3000` |
| Console shows errors | Check F12 console for details |
| Voice not working | Start agent: `python agent.py` |

---

## Kill Processes (If Stuck)

```bash
# Kill specific port
lsof -ti:3000 | xargs kill -9      # Kill backend
lsof -ti:5174 | xargs kill -9      # Kill frontend

# Or restart terminal and try again
```

---

**All set! Follow the steps above and everything works locally! ✅**

