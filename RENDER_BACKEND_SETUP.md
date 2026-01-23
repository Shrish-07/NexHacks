# Render Backend Deployment Guide

## ✅ CORRECT Setup for Render

### Step 1: Choose Deployment Type
**❌ WRONG**: "Static Site" (what you clicked)
**✅ CORRECT**: "Web Service"

**Why?**
- Static Site = Pure HTML/CSS/JS (no backend)
- Web Service = Node.js + Express (can run code)

### Step 2: Fill Out Web Service Form

```
Name: NexHacks Backend
Git Repository: https://github.com/Shrish-07/NexHacks
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### Step 3: Environment Variables

Add these in Render dashboard:

| Variable | Value |
|----------|-------|
| PORT | 3000 |
| LIVEKIT_URL | wss://attune-3sbnbhzq.livekit.cloud |
| LIVEKIT_API_KEY | APIXUGLDfrx2DZ2 |
| LIVEKIT_API_SECRET | WydYOqEHCrAuWHhjrEcptfg8JGck8QVN5GrnMGIbPBV |
| OVERSHOOT_API_KEY | ovs_f5c9768db2e806f4eabe3fb7d095d9d7 |
| ELEVENLABS_API_KEY | sk_6193c1630ef61327dea30488e48024b8f840e3b007e14e83 |

### Step 4: Delete "Static Site"

1. Go to Render dashboard
2. Find the "NexHacks" static site you just created
3. Click Settings → Delete Service
4. Confirm deletion

### Step 5: Create Web Service Instead

1. Click "New +"
2. Select "Web Service"
3. Connect GitHub repo (Shrish-07/NexHacks)
4. Fill out form as shown above
5. Create service

### Step 6: Get Backend URL

After deployment, Render will give you a URL like:
```
https://nexhacks-backend-abc123.onrender.com
```

Copy this URL - you'll need it for Vercel!

---

## 🔄 Then Update Vercel

1. Go to Vercel project settings
2. Add environment variable:
   ```
   VITE_BACKEND_URL = https://nexhacks-backend-abc123.onrender.com
   ```
3. Redeploy frontend

---

## ✅ Final Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Vercel (Frontend)                                            │
│ nexhacks-xi.vercel.app                                       │
│ ├─ React app                                                 │
│ ├─ Routing handled by vercel.json                            │
│ └─ Calls VITE_BACKEND_URL for API                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP + WebSocket
                 │
┌────────────────▼────────────────────────────────────────────┐
│ Render (Backend)                                             │
│ nexhacks-backend-abc123.onrender.com                         │
│ ├─ Node.js + Express server                                  │
│ ├─ WebSocket for real-time alerts                            │
│ ├─ LiveKit video streaming                                   │
│ ├─ Overshoot AI detection                                    │
│ └─ ElevenLabs voice synthesis                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚨 Render Free Tier Note

**Cold Starts**: Render spins down free services after 15 minutes of inactivity.
- First request takes 30-60 seconds
- **Frontend handles this**: 5-attempt retry with exponential backoff
- After backend wakes up, everything works normally

**Solution**: Upgrade to paid tier if you need instant startup times.

