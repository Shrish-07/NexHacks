# 🚀 Local Development & Deployment Guide

## Overview

Your system uses **environment-aware configuration** - it automatically detects where it's running and connects to the appropriate backend.

### Current Configuration:
- **Local (localhost)**: Frontend → `http://localhost:3000` backend
- **Production**: Frontend → Same domain backend (via Render/Vercel)

---

## 🛠️ Part 1: Local Development Setup

### Terminal 1: Start Backend (Port 3000)
```bash
cd backend
npm start
```

**Expected Output:**
```
✅ [INIT] LiveKit configured: wss://your-livekit-url
✅ [INIT] Overshoot API Key set
✅ [INIT] ElevenLabs API Key set
Server running on port 3000
```

### Terminal 2: Start Frontend (Port 5174)
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v7.3.1 ready
Local: http://localhost:5174/
```

### Terminal 3: Start Agent (Optional - for voice testing)
```bash
python agent.py
```

**Expected Output:**
```
PATIENT MONITOR AGENT - STARTING UP
✅ Connected to LiveKit!
```

---

## ✅ Testing Local Setup

### Test 1: Check Backend is Responding
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "patients": 0,
  "nurses": 0,
  "alerts": 0,
  "livekit": { "configured": true }
}
```

### Test 2: Frontend Auto-Detects Backend
1. Open `http://localhost:5174`
2. Open DevTools (F12)
3. Check Console - should show:
```
✅ Connected to backend
```

### Test 3: Full Flow
1. Patient window: Add patient (room 101)
2. Nurse window: Login as nurse
3. Patient window: Click "Test Alert"
4. Nurse dashboard: Red card appears ✅

---

## 🔍 How Frontend Detects Backend

The frontend automatically configures based on where it's running:

```typescript
// File: frontend/src/services/backendService.ts

getHttpBase(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000';  // LOCAL
  }
  // PRODUCTION: Same domain as frontend
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${window.location.host}`;
}

getWsUrl(): string {
  if (window.location.hostname === 'localhost') {
    return 'ws://localhost:3000';    // LOCAL
  }
  // PRODUCTION: Same domain as frontend
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}`;
}
```

**No configuration needed!** It just works. ✅

---

## 🚢 Part 2: Deploying to Production

### Step 1: Deploy Backend to Render

1. **Push code to GitHub**
   ```bash
   git add backend/
   git commit -m "Backend ready for production"
   git push
   ```

2. **Create Render Service**
   - Go to https://render.com
   - New → Web Service
   - Connect GitHub repo
   - Settings:
     - Runtime: Node
     - Build command: `cd backend && npm install`
     - Start command: `cd backend && npm start`
     - Environment variables:
       - `LIVEKIT_URL=<your-url>`
       - `LIVEKIT_API_KEY=<your-key>`
       - `LIVEKIT_API_SECRET=<your-secret>`
       - `OVERSHOOT_API_KEY=<your-key>`
       - `ELEVENLABS_API_KEY=<your-key>`

3. **Get Render Backend URL**
   - After deployment: `https://your-backend.onrender.com`

### Step 2: Deploy Frontend to Vercel

1. **Push code to GitHub**
   ```bash
   git add frontend/
   git commit -m "Frontend ready for production"
   git push
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Import your GitHub project
   - Select `frontend` folder as root
   - Deploy

3. **Get Vercel Frontend URL**
   - After deployment: `https://your-frontend.vercel.app`

### Step 3: Frontend Automatically Connects

✅ **No configuration needed!**

When deployed:
- Frontend runs on: `https://your-frontend.vercel.app`
- `window.location.hostname` = `your-frontend.vercel.app`
- Frontend connects to: `https://your-frontend.vercel.app` (same domain)
- Backend must be hosted on same domain OR...

---

## 🔗 Important: Backend & Frontend Deployment

### Option A: Same Domain (Recommended)
Both frontend and backend hosted at same domain:
- Frontend: `https://your-site.vercel.app/`
- Backend: `https://your-site.vercel.app/api/*`

**Current code supports this** - no changes needed.

### Option B: Different Domains (Current Setup)
Frontend and backend on different domains:
- Frontend: `https://your-frontend.vercel.app`
- Backend: `https://your-backend.onrender.com`

**Need to update frontend config:**

Edit `frontend/src/services/backendService.ts`:

```typescript
private getHttpBase(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  // PRODUCTION: Use Render backend
  return 'https://your-backend.onrender.com';
}

private getWsUrl(): string {
  if (window.location.hostname === 'localhost') {
    return 'ws://localhost:3000';
  }
  // PRODUCTION: Use Render backend WebSocket
  return 'wss://your-backend.onrender.com';
}
```

---

## ⚙️ Environment Variables

### Backend Environment Variables
Create `.env` in `backend/` folder:

```
# LiveKit Configuration
LIVEKIT_URL=https://your-livekit-url
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# External APIs
OVERSHOOT_API_KEY=your-overshoot-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Server
PORT=3000
```

### Frontend Environment Variables
Create `.env` in `frontend/` folder (optional):

```
# Only needed if backend is different domain
VITE_BACKEND_URL=https://your-backend.onrender.com
```

Then update frontend to use it:
```typescript
private getHttpBase(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return import.meta.env.VITE_BACKEND_URL || 'https://your-backend.onrender.com';
}
```

---

## 🔄 Workflow: Local → Production

### During Development (Local)
```
Frontend: http://localhost:5174
Backend:  http://localhost:3000
→ Auto-detected, works immediately
```

### Before Deployment
1. Test everything locally
2. Verify all endpoints working
3. Test voice detection with agent.py
4. Ensure all env vars are set

### Deploy Backend First
```bash
git push  # Push to GitHub
# Then deploy on Render
# Wait for it to be live
# Get URL: https://your-backend.onrender.com
```

### Update Frontend Config (If Different Domain)
```typescript
// frontend/src/services/backendService.ts
private getHttpBase(): string {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://your-backend.onrender.com';
}
```

### Deploy Frontend
```bash
git push  # Push to GitHub
# Vercel auto-deploys
# Get URL: https://your-frontend.vercel.app
```

### Verify Production
```bash
# Test endpoints
curl https://your-backend.onrender.com/health

# Test frontend connects
# Open https://your-frontend.vercel.app
# Check console for connection
```

---

## 🐛 Debugging Connection Issues

### Frontend Can't Connect to Backend?

**Step 1: Check Console Logs**
```javascript
// In browser console (F12)
// Should show:
✅ Connected to backend
```

**Step 2: Check Backend URL**
```javascript
// In browser console
console.log(localStorage.getItem('backendUrl'))
// Or check what the service is using
```

**Step 3: Check CORS Headers**
Backend should return:
```
Access-Control-Allow-Origin: *
```

**Step 4: Test Endpoint Directly**
```bash
# Test from command line
curl https://your-backend.onrender.com/health
```

---

## 📋 Checklist: Production Deployment

- [ ] Backend pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Render env vars configured:
  - [ ] LIVEKIT_URL
  - [ ] LIVEKIT_API_KEY
  - [ ] LIVEKIT_API_SECRET
  - [ ] OVERSHOOT_API_KEY
  - [ ] ELEVENLABS_API_KEY
- [ ] Backend `/health` endpoint responds
- [ ] Frontend pushed to GitHub
- [ ] Frontend deployed to Vercel
- [ ] Frontend config updated (if different domain)
- [ ] Frontend can access backend
- [ ] Test manual alert works
- [ ] Test voice alert works
- [ ] Test visual alert works

---

## 🚀 Quick Deployment Commands

### Local Development (All at Once)
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Agent (optional)
python agent.py
```

### Deploy to Production
```bash
# Commit everything
git add .
git commit -m "Ready for production"
git push

# Then:
# 1. Deploy backend on Render (auto from GitHub)
# 2. Deploy frontend on Vercel (auto from GitHub)
# 3. Test at production URLs
```

---

## 💡 Pro Tips

1. **Keep local backend URL in code** - Never remove the localhost check
2. **Use environment variables** - For different deployment URLs
3. **Test both locally and production** - Different behavior sometimes
4. **CORS headers matter** - Backend must allow frontend domain
5. **WebSocket needs upgrade** - From HTTP to WSS for production

---

## 🔗 Production URLs Example

After deployment, you'll have:
```
Frontend: https://nexhacks-monitoring.vercel.app
Backend:  https://nexhacks-api.onrender.com

Frontend auto-connects to backend ✅
```

---

## ❓ Common Issues & Solutions

### "Cannot connect to backend"
- [ ] Backend running? Check port 3000
- [ ] Backend URL correct in frontend config?
- [ ] CORS headers enabled?

### "WebSocket connection failed"
- [ ] Using `ws://` for local, `wss://` for production?
- [ ] Port correct? (3000)
- [ ] URL correct in config?

### "Frontend shows old backend URL"
- [ ] Clear browser cache: Ctrl+Shift+Delete
- [ ] Hard refresh: Ctrl+Shift+R
- [ ] Check if .env is being used

### "Environment variables not set"
- [ ] Backend: Check `backend/.env`
- [ ] Render: Check Settings → Environment
- [ ] Agent: Check system env vars

---

## ✅ Testing Checklist

### Local Testing
- [ ] Backend health check: `curl http://localhost:3000/health`
- [ ] Frontend loads: `http://localhost:5174`
- [ ] Console shows: `✅ Connected to backend`
- [ ] Test alert works
- [ ] Voice detection works (with agent)
- [ ] Visual alert works

### Production Testing
- [ ] Backend health check: `curl https://your-backend.onrender.com/health`
- [ ] Frontend loads: `https://your-frontend.vercel.app`
- [ ] Console shows: `✅ Connected to backend`
- [ ] Test alert works
- [ ] Voice detection works
- [ ] Visual alert works

---

## 📞 Need Help?

1. **Local connection issues?** → Check backendService.ts configuration
2. **Production deployment?** → Check environment variables on Render/Vercel
3. **WebSocket issues?** → Ensure proper protocol (ws/wss)
4. **CORS issues?** → Check backend CORS headers

