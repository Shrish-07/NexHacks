# 🛠️ Complete Local Development Setup & Production Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Testing Everything Locally](#testing-everything-locally)
3. [How It Works (Auto-Detection)](#how-it-works-auto-detection)
4. [Production Deployment](#production-deployment)
5. [Configuration Reference](#configuration-reference)

---

## 🏠 Local Development

### Prerequisites
- Node.js 16+ installed
- Python 3.8+ installed (for agent)
- npm or yarn package manager
- Git installed

### Step 1: Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Root level (if needed)
cd ..
npm install
```

### Step 2: Set Up Environment Variables

Create `backend/.env`:
```
# LiveKit
LIVEKIT_URL=https://your-livekit-url
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# External Services
OVERSHOOT_API_KEY=your-overshoot-key
OVERSHOOT_API_URL=https://cluster1.overshoot.ai/api/v0.2

# Voice AI
ELEVENLABS_API_KEY=your-elevenlabs-key

# Server
PORT=3000
NODE_ENV=development
```

### Step 3: Start All Services

**Option A: Three Separate Terminals**

```bash
# Terminal 1: Backend
cd backend
npm start
# Should show:
# ✅ [INIT] LiveKit configured
# ✅ [INIT] Overshoot API Key set
# ✅ [INIT] ElevenLabs API Key set
# Server running on port 3000
```

```bash
# Terminal 2: Frontend
cd frontend
npm run dev
# Should show:
# VITE v7.3.1 ready
# Local: http://localhost:5174/
```

```bash
# Terminal 3: Agent (optional, for voice testing)
python agent.py
# Should show:
# PATIENT MONITOR AGENT - STARTING UP
# ✅ Connected to LiveKit!
```

**Option B: All in One (Using npm-run-all or Concurrently)**

Install:
```bash
npm install -D concurrently
```

Add to root `package.json`:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run dev:agent\"",
    "dev:backend": "cd backend && npm start",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:agent": "python agent.py"
  }
}
```

Then run:
```bash
npm run dev
```

---

## ✅ Testing Everything Locally

### Access Points
```
Frontend:  http://localhost:5174
Backend:   http://localhost:3000
WebSocket: ws://localhost:3000
Agent:     (Connects to LiveKit room)
```

### Test 1: Backend is Running

```bash
curl http://localhost:3000/health
```

Expected response:
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

### Test 2: Frontend Loads

Open browser: `http://localhost:5174`

Should see: Login page with "Add Patient" and "Nurse Login" buttons

### Test 3: Frontend Connects to Backend

Open DevTools (F12) → Console

Should see:
```
✅ Connected to backend
```

### Test 4: Manual Alert Flow

**Patient Window:**
```
1. Login → "Add Patient"
2. Enter name: "Test Patient"
3. Enter room: "101"
4. Click "Start Monitoring"
5. Click "Test Alert" button
```

**Nurse Window:**
```
1. Login → "Nurse Login" (PIN: 1234)
2. See red alert card appear
3. Hear TTS audio play
```

**Backend Console Should Show:**
```
📨 [ALERT] Test alert from patient
✅ [ALERT] Patient found: Test Patient
📢 [BROADCAST] Broadcasting to 1 nurses
✅ [ALERT] TEST: TEST_ALERT
```

### Test 5: Voice Alert Flow (If Agent Running)

**Prerequisites:** Agent running (`python agent.py`)

**Steps:**
```
1. Patient speaks: "HELP"
2. Wait 2-3 seconds for transcription
3. Agent console shows: "DISTRESS KEYWORD DETECTED!"
4. Nurse console shows: Red alert card
5. Hear TTS announcement
```

**Check Agent Console:**
```
🟢 [AGENT] Monitoring room: patient-101
🗣️  [patient-101] Detected: 'help'
✅ [AGENT] DISTRESS KEYWORD DETECTED!
📤 [AGENT] ALERT SENT - Status: 200
```

### Test 6: Visual Alert Flow

```bash
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_TEST",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.95,
    "description": "Fall detected"
  }'
```

Expected response:
```json
{
  "success": true,
  "alert": {
    "id": "alert_...",
    "patientId": "PATIENT_TEST",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.95,
    "urgency": "critical",
    "source": "overshoot"
  }
}
```

**Nurse Dashboard:** Red alert card appears + TTS plays

---

## 🔍 How It Works: Auto-Detection

### Frontend Auto-Detects Backend

The frontend has smart logic that automatically detects which backend to use:

**File:** `frontend/src/services/backendService.ts`

```typescript
constructor() {
  this.httpBase = this.getHttpBase();
  this.wsUrl = this.getWsUrl();
}

private getHttpBase(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000';  // ← LOCAL
  }
  // PRODUCTION: Same domain as frontend
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${window.location.host}`;
}

private getWsUrl(): string {
  if (window.location.hostname === 'localhost') {
    return 'ws://localhost:3000';    // ← LOCAL
  }
  // PRODUCTION: Same domain as frontend
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}`;
}
```

### How It Works
1. Frontend checks: Is `window.location.hostname === 'localhost'`?
2. **If YES:** Use `http://localhost:3000` (local backend)
3. **If NO:** Use same domain as frontend (production backend)

**Result:** No configuration needed! Works automatically! ✅

---

## 🚢 Production Deployment

### Architecture Options

#### Option 1: Same Domain (Recommended)
```
Frontend:  https://your-app.vercel.app/
Backend:   https://your-app.vercel.app/api/
Agent:     Separate server or local
```

✅ No code changes needed (automatic)

#### Option 2: Different Domains
```
Frontend:  https://your-frontend.vercel.app
Backend:   https://your-backend.onrender.com
Agent:     Separate server or local
```

⚠️ Need to update frontend config (see below)

### Step 1: Deploy Backend to Render

**1a. Push to GitHub**
```bash
git add backend/
git commit -m "Deploy backend to Render"
git push origin main
```

**1b. Create Render Service**
- Go to https://render.com
- New → Web Service
- Connect your GitHub repository
- Configure:
  - **Name:** nexhacks-backend
  - **Runtime:** Node
  - **Build Command:** `cd backend && npm install && npm build`
  - **Start Command:** `cd backend && npm start`
  - **Environment Variables:**
    ```
    LIVEKIT_URL=https://your-livekit-url
    LIVEKIT_API_KEY=your-api-key
    LIVEKIT_API_SECRET=your-api-secret
    OVERSHOOT_API_KEY=your-overshoot-key
    ELEVENLABS_API_KEY=your-elevenlabs-key
    NODE_ENV=production
    PORT=3000
    ```

**1c. Get Render URL**
After deployment completes: `https://nexhacks-backend.onrender.com`

**Test it:**
```bash
curl https://nexhacks-backend.onrender.com/health
```

### Step 2: Deploy Frontend to Vercel

**2a. Push to GitHub**
```bash
git add frontend/
git commit -m "Deploy frontend to Vercel"
git push origin main
```

**2b. Deploy on Vercel**
- Go to https://vercel.com
- Import GitHub project
- Configure:
  - **Root Directory:** `frontend`
  - **Framework:** Vite
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
  - (No environment variables needed if using same domain)

**2c. Get Vercel URL**
After deployment: `https://nexhacks.vercel.app`

### Step 3: Configure Frontend for Different Domain (If Needed)

If backend is on different domain than frontend:

**Edit:** `frontend/src/services/backendService.ts`

```typescript
private getHttpBase(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  // Production: Use Render backend
  return 'https://nexhacks-backend.onrender.com';
}

private getWsUrl(): string {
  if (window.location.hostname === 'localhost') {
    return 'ws://localhost:3000';
  }
  // Production: Use Render backend with WSS
  return 'wss://nexhacks-backend.onrender.com';
}
```

Then push and redeploy:
```bash
git add frontend/
git commit -m "Update backend URL for production"
git push
# Vercel auto-deploys
```

### Step 4: Test Production

```bash
# Test backend
curl https://nexhacks-backend.onrender.com/health

# Open frontend in browser
https://nexhacks.vercel.app

# Open DevTools (F12)
# Should show: ✅ Connected to backend

# Test full flow
# Patient login → Nurse login → Test alert
```

---

## ⚙️ Configuration Reference

### Frontend Configuration

**File:** `frontend/src/services/backendService.ts`

| Environment | HTTP URL | WebSocket URL |
|-------------|----------|---------------|
| Local | `http://localhost:3000` | `ws://localhost:3000` |
| Production (same domain) | `https://your-domain.com` | `wss://your-domain.com` |
| Production (different domain) | `https://your-backend.onrender.com` | `wss://your-backend.onrender.com` |

### Backend Configuration

**File:** `backend/.env`

```
LIVEKIT_URL=<your-livekit-server>
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
OVERSHOOT_API_KEY=<your-overshoot-key>
OVERSHOOT_API_URL=https://cluster1.overshoot.ai/api/v0.2
ELEVENLABS_API_KEY=<your-elevenlabs-key>
PORT=3000
NODE_ENV=development
```

### Agent Configuration

**File:** `agent.py`

Uses environment variables (same as backend):
```
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
```

Agent always connects to backend at: `http://127.0.0.1:3000/alert` (local)

For production agent, update:
```python
BACKEND_ALERT_URL = "https://your-backend.onrender.com/alert"
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Manual alert works
- [ ] Voice detection works (with agent)
- [ ] Visual alert works
- [ ] All env vars are set in `.env`
- [ ] Code is committed to GitHub

### Backend Deployment
- [ ] Render service created
- [ ] All env vars configured in Render
- [ ] Build completes successfully
- [ ] Health endpoint responds: `curl https://your-backend.onrender.com/health`
- [ ] Other endpoints respond

### Frontend Deployment
- [ ] Vercel deployment created
- [ ] Builds successfully
- [ ] Loads at `https://your-frontend.vercel.app`
- [ ] Console shows: `✅ Connected to backend`

### Post-Deployment
- [ ] Test all three alert types
- [ ] Verify audio works
- [ ] Check backend logs for errors
- [ ] Monitor for issues

---

## 🔄 Development Workflow

### Daily Development
```bash
# Start everything
Terminal 1: cd backend && npm start
Terminal 2: cd frontend && npm run dev
Terminal 3: python agent.py (optional)

# Test in browser: http://localhost:5174
# Make changes as needed (hot reload works)
# Commit when done
git add .
git commit -m "Feature: description"
git push
```

### Before Pushing to Production
```bash
# Test everything locally
# Verify all three alert types work
# Check console for errors
# Then push to GitHub
git push origin main

# Vercel/Render auto-deploy (if configured)
# Or manually trigger deployment
```

### After Production Deployment
```bash
# Test at production URLs
# Check health endpoints
# Verify frontend connects to backend
# Test all features in production
# Monitor logs for issues
```

---

## 🐛 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Frontend can't connect to backend | Wrong URL or backend not running | Check `getHttpBase()` in backendService.ts |
| "Port already in use" | Another app using port 3000/5174 | Kill process or use different port |
| CORS errors | Frontend domain not allowed | Check `app.use(cors())` in backend |
| WebSocket fails | Wrong protocol (ws vs wss) | Use `ws://` local, `wss://` production |
| Env vars not set | Missing `.env` file | Create `backend/.env` with all vars |
| Agent can't connect | Backend unreachable | Update `BACKEND_ALERT_URL` in agent.py |

---

## 💡 Pro Tips

1. **Keep localhost detection** - Never remove the `localhost` check in frontend
2. **Use environment variables** - Easy to switch between environments
3. **Test both locally and production** - They sometimes behave differently
4. **Monitor backend logs** - Helps identify issues quickly
5. **Use Vercel/Render dashboards** - Monitor deployments and logs
6. **Git workflow** - Main branch auto-deploys in Vercel/Render

---

**Ready to start?** Follow [RUN_LOCAL_QUICK.md](RUN_LOCAL_QUICK.md) to get up and running in 5 minutes!

