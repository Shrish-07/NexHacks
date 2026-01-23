# Complete Vercel + Render Deployment Guide

## 🔴 Why Vercel Is Broken (404 Errors)

### Root Causes:
1. **Missing `vercel.json`** - No SPA routing configuration
2. **Wrong root directory** - Vercel deploying from `/` instead of `/frontend`
3. **No route rewrites** - Client-side routes treated as 404s
4. **Backend URL not set** - Frontend still tries localhost:3000

### Example Error Flow:
```
User clicks "Login" → Frontend Router changes to /login
Browser requests: https://nexhacks-xi.vercel.app/login
Vercel looks for: /login file → NOT FOUND
Result: 404 Error
```

---

## ✅ Fix #1: Create `vercel.json`

**File**: `/vercel.json` (in root directory)

This file tells Vercel:
- Build frontend only
- Output is in `frontend/dist`
- Route all requests to `index.html` (SPA routing)

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "root": "frontend",
  "github": {
    "silent": true
  },
  "routes": [
    {
      "src": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "VITE_BACKEND_URL": "@vite_backend_url"
  }
}
```

✅ **Already created for you!**

---

## ✅ Fix #2: Set Environment Variables on Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Add this variable:

**Name**: `VITE_BACKEND_URL`
**Value**: `http://localhost:3000` (for now, will update after Render)

4. Redeploy

---

## ✅ Fix #3: Set Up Render Backend (CORRECTLY)

**❌ You clicked "Static Site" - WRONG!**
**✅ Should be "Web Service" - CORRECT!**

### Why Static Site is Wrong:
- Static Site = Pure HTML/CSS/JS files (no Node.js)
- Our backend is Node.js + Express (needs runtime)
- Static Site would fail immediately

### What to Do:

**STEP 1: Delete Static Site**
1. Go to Render dashboard
2. Find "NexHacks" service
3. Go to Settings
4. Scroll down → Delete Service
5. Confirm

**STEP 2: Create Web Service**
1. Click "New +" → "Web Service"
2. Connect GitHub: `Shrish-07/NexHacks`
3. Select branch: `main`
4. Fill form:

```
Service Name: NexHacks-Backend
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

5. Create Service

**STEP 3: Add Environment Variables**

After service is created, click Settings → Environment Variables

Add all these:

```
PORT=3000
LIVEKIT_URL=wss://attune-3sbnbhzq.livekit.cloud
LIVEKIT_API_KEY=APIXUGLDfrx2DZ2
LIVEKIT_API_SECRET=WydYOqEHCrAuWHhjrEcptfg8JGck8QVN5GrnMGIbPBV
OVERSHOOT_API_KEY=ovs_f5c9768db2e806f4eabe3fb7d095d9d7
ELEVENLABS_API_KEY=sk_6193c1630ef61327dea30488e48024b8f840e3b007e14e83
```

---

## 🔄 Step 4: Connect Frontend to Backend

After Render backend is deployed, you'll get a URL like:
```
https://nexhacks-backend-abc123.onrender.com
```

**Update Vercel:**
1. Vercel Dashboard → Settings → Environment Variables
2. Change `VITE_BACKEND_URL` to:
   ```
   https://nexhacks-backend-abc123.onrender.com
   ```
3. Save and redeploy

---

## 🧪 Testing Checklist

After both are deployed:

- [ ] Open `nexhacks-xi.vercel.app`
- [ ] Click links (Login, etc) - NO 404s
- [ ] Login as patient/nurse
- [ ] Console shows: `✅ Backend is alive`
- [ ] Console shows: `✅ Connected to backend`
- [ ] Dashboard loads with patient/nurse data
- [ ] Video stream appears
- [ ] Alerts work end-to-end

---

## 📊 Deployment Architecture

```
GitHub (Main Branch)
    ↓
    ├─→ Vercel (Frontend)
    │   ├─ Triggers on: frontend/ changes
    │   ├─ Builds: npm run build
    │   ├─ Output: frontend/dist
    │   ├─ Routes: All → index.html (SPA)
    │   └─ URL: nexhacks-xi.vercel.app
    │
    └─→ Render (Backend)
        ├─ Triggers on: backend/ changes
        ├─ Builds: npm install
        ├─ Start: npm start
        ├─ Port: 3000
        └─ URL: nexhacks-backend-*.onrender.com
```

---

## 🚨 Common Issues & Fixes

### Issue: Still getting 404s after deploying
**Fix**: 
- Check Vercel has `vercel.json`
- Check environment variables are set
- Redeploy by pushing to GitHub

### Issue: Frontend connects but backend 404
**Fix**:
- Check Render backend is actually running (should show "Active")
- Check `VITE_BACKEND_URL` is correct URL (not localhost)
- Check Render environment variables are all set

### Issue: Backend goes to sleep (Render free tier)
**Expected**: Yes, free tier spins down after 15 min
**What happens**: First request takes 30-60s, then works
**Why OK**: Frontend retries 5 times with backoff
**Solution**: Upgrade to paid tier for instant startup

### Issue: WebSocket connection fails
**Fix**:
- Check backend URL protocol is correct (https://, not http://)
- Make sure it's the full URL (not localhost)
- Check Render backend is actually running

---

## 📋 Pre-Deployment Checklist

- [x] `vercel.json` created in root directory
- [x] Frontend builds locally: `npm run build` ✅
- [x] Backend starts locally: `npm start` ✅
- [x] Backend health endpoint works: `GET /health` ✅
- [ ] Render backend service created and running
- [ ] Render environment variables all set
- [ ] `VITE_BACKEND_URL` set on Vercel
- [ ] Frontend redeploy triggered on Vercel
- [ ] Testing checklist passed

---

## 🚀 Quick Start Summary

1. **Vercel** - Already fixed, just needs redeploy
2. **Render** - Delete Static Site, create Web Service instead
3. **Connect** - Set `VITE_BACKEND_URL` on Vercel to Render URL
4. **Test** - Login and verify connection works

That's it! System will be live! 🎉

