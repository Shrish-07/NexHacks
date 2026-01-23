# 🎯 Your Answer: Local Development & Production Deployment

## TL;DR (Too Long; Didn't Read)

### Run Locally (Right Now)
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend  
cd frontend
npm run dev

# Then: Open http://localhost:5174
```

**That's it!** Frontend automatically detects and connects to local backend. ✅

### Test Everything
```bash
# Patient window
http://localhost:5174/login → Add Patient → Room 101

# Nurse window (different browser window)
http://localhost:5174/login → Nurse Login (PIN: 1234)

# Test alert
Patient: Click "Test Alert"
Nurse: See red card + hear audio ✅
```

### When Ready for Production
```bash
# Push to GitHub
git push

# Deploy backend to Render (copy-paste env vars)
# Deploy frontend to Vercel (auto-deploys)

# Frontend auto-connects to Vercel domain ✅
```

---

## How It Works (The Magic)

Your frontend has **smart auto-detection**:

```typescript
// frontend/src/services/backendService.ts

// LOCAL DEVELOPMENT
if (window.location.hostname === 'localhost') {
  return 'http://localhost:3000';  // ← Use local backend
}

// PRODUCTION
return `${protocol}://${window.location.host}`;  // ← Use same domain
```

**Result:** No configuration needed! It just works locally AND in production! ✨

---

## Three Deployment Paths

### Path 1: Both on Same Domain (Easiest)
```
Frontend: https://your-app.vercel.app/
Backend:  https://your-app.vercel.app/api/
→ Frontend auto-connects ✅
```

### Path 2: Frontend on Vercel, Backend on Render (Current Plan)
```
Frontend: https://your-frontend.vercel.app
Backend:  https://your-backend.onrender.com
→ Update config and push ✅
```

### Path 3: Your Own Servers
```
Frontend: https://your-domain.com
Backend:  https://api.your-domain.com
→ Update config and push ✅
```

---

## Which Files Do What

### Frontend (React - Port 5174)
```
frontend/
├── src/pages/
│   ├── PatientDashboard.tsx    ← Patient UI
│   ├── NurseDashboard.tsx      ← Nurse UI
│   └── LoginPage.tsx           ← Login
├── src/services/
│   └── backendService.ts       ← Smart backend detection 🔑
└── src/App.tsx                 ← Main app
```

**Key File:** `backendService.ts` has the smart detection logic

### Backend (Node.js - Port 3000)
```
backend/
├── patient-monitor.js          ← Main server 🔑
├── package.json
└── .env                        ← Put API keys here
```

**Key File:** `patient-monitor.js` handles all endpoints

### Agent (Python - Voice Detection)
```
agent.py                        ← Listens to LiveKit room 🔑
```

**Connects to:** Backend at `http://127.0.0.1:3000/alert`

---

## Complete Setup Steps

### 1️⃣ Local Development (5 minutes)

**Terminal 1: Backend**
```bash
cd backend
npm start
```

Wait for:
```
✅ [INIT] LiveKit configured
✅ [INIT] Overshoot API Key set
✅ [INIT] ElevenLabs API Key set
Server running on port 3000
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
```

Wait for:
```
Local: http://localhost:5174/
```

**Test:** Open browser, should see login page

### 2️⃣ Verify Connection (1 minute)

```bash
# In browser console (F12):
console.log('Connected?')

# Should show: ✅ Connected to backend
```

Or test endpoint:
```bash
curl http://localhost:3000/health
```

### 3️⃣ Test Everything (10 minutes)

See [RUN_LOCAL_QUICK.md](RUN_LOCAL_QUICK.md)

### 4️⃣ Deploy to Production (When Ready)

**Backend → Render:**
1. Push code: `git push`
2. Go to https://render.com
3. New Web Service → Connect GitHub
4. Add env vars (LIVEKIT_URL, API keys, etc)
5. Get URL: `https://your-backend.onrender.com`

**Frontend → Vercel:**
1. Go to https://vercel.com
2. Import your GitHub project
3. Set root directory: `frontend`
4. Deploy
5. Get URL: `https://your-frontend.vercel.app`

**Configure Frontend (If Different Domains):**
Edit `frontend/src/services/backendService.ts`:
```typescript
return 'https://your-backend.onrender.com';
```

Push and redeploy.

---

## Environment Setup

### Backend `.env` File
Create `backend/.env`:
```
LIVEKIT_URL=https://your-livekit-url
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
OVERSHOOT_API_KEY=your-key
ELEVENLABS_API_KEY=your-key
PORT=3000
NODE_ENV=development
```

### Frontend (No .env Needed!)
Frontend auto-detects localhost and uses hardcoded URL.

In production, it uses the domain it's on.

### Agent (Uses Backend .env)
Agent reads from `BACKEND_ALERT_URL` or defaults to `http://127.0.0.1:3000/alert`

---

## Testing Checklist

### Local Testing ✅
- [ ] Backend runs on port 3000
- [ ] Frontend runs on port 5174
- [ ] Console shows: `✅ Connected to backend`
- [ ] Manual test alert works
- [ ] Voice detection works (with agent)
- [ ] Visual alert works

### Production Testing ✅
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Backend health endpoint responds
- [ ] Frontend loads and connects
- [ ] All alert types work in production

---

## The Key Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `backend/patient-monitor.js` | All APIs | When adding features |
| `frontend/src/services/backendService.ts` | Backend connection | When changing backend URL |
| `agent.py` | Voice detection | When changing detection logic |
| `backend/.env` | API credentials | For your API keys |
| `frontend/package.json` | Frontend config | For dependencies |
| `backend/package.json` | Backend config | For dependencies |

---

## Common Questions

### Q: Do I need to change frontend code for local development?
**A:** No! Frontend auto-detects `localhost` and uses `http://localhost:3000`

### Q: What about when I deploy?
**A:** If frontend and backend are on the same domain, still no changes needed!

If on different domains, edit one file and push.

### Q: Can I run just the backend?
**A:** Yes! It works standalone at `http://localhost:3000/health`

### Q: Can I run just the frontend?
**A:** Yes, but you won't be able to login (needs backend)

### Q: What if I use a different backend URL?
**A:** Edit `backendService.ts` and push. That's it!

### Q: How do I switch between local and production?
**A:** No switching needed! Code detects automatically!

- Running locally (port 5174 on localhost)? Uses local backend
- Running in production (Vercel domain)? Uses production backend

---

## Visual Flow

### Local Development
```
Your Computer
├─ Backend (http://localhost:3000)
├─ Frontend (http://localhost:5174)
├─ Agent (Python process)
└─ Browser
   └─ Frontend auto-detects localhost
      └─ Connects to http://localhost:3000 ✅
```

### Production
```
Internet
├─ Render (https://your-backend.onrender.com)
├─ Vercel (https://your-frontend.vercel.app)
├─ LiveKit (External service)
└─ User's Browser
   └─ Frontend auto-detects NOT localhost
      └─ Connects to same domain (Vercel) ✅
```

---

## Quick Commands Reference

```bash
# Start everything locally
Terminal 1: cd backend && npm start
Terminal 2: cd frontend && npm run dev
Terminal 3: python agent.py

# Test backend
curl http://localhost:3000/health

# Test voice alert
curl -X POST http://localhost:3000/alert \
  -H "Content-Type: application/json" \
  -d '{"room":"patient-101","event":"PATIENT_DISTRESS","transcript":"help","source":"voice","severity":"high"}'

# Test visual alert
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"TEST","roomNumber":"101","condition":"PATIENT_FALLING","confidence":0.95}'

# Deploy to GitHub (before pushing to Render/Vercel)
git add .
git commit -m "Your message"
git push origin main
```

---

## Support Docs

| Need | Document |
|------|----------|
| Quick local setup | [RUN_LOCAL_QUICK.md](RUN_LOCAL_QUICK.md) |
| Complete setup guide | [COMPLETE_SETUP_AND_DEPLOYMENT.md](COMPLETE_SETUP_AND_DEPLOYMENT.md) |
| Testing procedures | [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md) |
| API reference | [API_REFERENCE.md](API_REFERENCE.md) |
| Local vs Production | [LOCAL_AND_PRODUCTION_GUIDE.md](LOCAL_AND_PRODUCTION_GUIDE.md) |

---

## Summary

✅ **Frontend auto-detects and connects to backend** - No configuration needed!

✅ **Same code works locally and in production** - Just smart detection!

✅ **Easy to deploy** - Push to GitHub, auto-deploys to Vercel/Render

✅ **Everything documented** - Check the guides for details

---

**Ready to start?** Follow these 3 steps:

1. Run backend: `cd backend && npm start`
2. Run frontend: `cd frontend && npm run dev`
3. Open browser: `http://localhost:5174`

**Done!** Your local system is running! 🎉

