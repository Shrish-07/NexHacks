# 🏥 Attune - AI Patient Monitoring System
## Comprehensive Project Review & Development Plan
**Date:** January 23, 2026  
**Current Branch:** `feature/Sourish-backend` (✅ Synced with main)

---

## ❓ About the "5 Commits Behind" Message on GitHub

**Yes, you are still up to date locally.** Here's what happened:

1. **When you pulled `main`**: Your local `main` branch received 2 new commits from `origin/main`
2. **Your feature branch** (`feature/Sourish-backend`) hasn't been rebased/merged with those latest changes yet
3. **On GitHub's web interface**: It shows your branch is 5 commits "behind" because:
   - Your feature branch diverged earlier
   - Main has evolved with new commits
   - GitHub counts the commits on main that aren't in your branch

**To fully sync and eliminate this message**, you should:
```bash
git checkout feature/Sourish-backend
git rebase main              # Apply main's changes to your branch
git push origin feature/Sourish-backend --force-with-lease
```

This will make your branch catch up with main and show "0 commits behind" on GitHub.

---

## 📋 Project Overview

**Project Name:** Attune (🏥 AI Patient Monitoring System)  
**Tech Stack:**
- **Frontend:** React/TypeScript (Vite), TailwindCSS
- **Backend:** Node.js (Express), Python (FastAPI/Streamlit)
- **Real-time:** WebSocket, WebRTC, LiveKit, Overshoot AI Vision SDK
- **AI/ML:** OpenAI, ElevenLabs, Overshoot Vision API, YOLOv8
- **Media:** FFmpeg, OpenCV, Camera/Microphone APIs

**Purpose:** Real-time AI monitoring system that watches patients continuously, detects emergencies (falls, seizures, distress), alerts nurses, and streams video feeds to a centralized dashboard.

---

## ✅ What's Done So Far

### 1. **Backend Infrastructure**
- ✅ **WebSocket Server** ([backend/patient-monitor.js](backend/patient-monitor.js))
  - Patient registration and management
  - Nurse dashboard connectivity
  - Alert routing and broadcasting
  - WebRTC signaling (offer/answer/ICE candidates)
  - Alert history persistence (last 200 alerts)

- ✅ **LiveKit Integration**
  - Token generation endpoint (`/api/livekit-token`)
  - Voice monitoring room setup
  - Audio track publishing
  - Transcription event handling

- ✅ **Express Endpoints**
  - `GET /api/patients` - List connected patients
  - `GET /api/alerts` - Retrieve alert history
  - `POST /api/alerts/:alertId/acknowledge` - Nurse acknowledgment
  - `POST /api/livekit-token` - Generate LiveKit tokens
  - CORS enabled for frontend communication

### 2. **Patient-Side Client**
- ✅ **Dual Monitoring System** ([monitor.html](monitor.html))
  - **Vision Monitoring**: Real-time video analysis via Overshoot AI
    - Detects: Choking, seizures, falls, distress
    - Configurable confidence threshold (0.7)
    - 10-second alert cooldown to prevent spam
  
  - **Voice Monitoring**: Audio analysis via LiveKit
    - Keyword detection for distress (help, choking, emergency, pain, etc.)
    - Real-time transcription
    - 5-second cooldown for voice alerts
    - Speech enhancement (echo cancellation, noise suppression)

- ✅ **Camera & Audio Management**
  - Automatic camera stream initialization
  - Microphone access with audio optimization
  - Local video preview
  - WebRTC peer connection with STUN/TURN servers

- ✅ **Backend Communication**
  - WebSocket connection with automatic reconnection
  - Alert broadcasting with patient metadata
  - Heartbeat mechanism (10-second intervals)
  - Video streaming negotiation

### 3. **Nurse Dashboard** 
- ✅ **Frontend UI** ([frontend/src/pages/NurseDashboard.tsx](frontend/src/pages/NurseDashboard.tsx))
  - Multi-camera feed display (demo with local video loops)
  - Alert management interface
  - Patient status monitoring
  - Vital signs display (mock data)
  - Real-time WebSocket connection for alerts
  - Alert acknowledgment functionality
  - Sound notifications for emergencies
  - Responsive grid layout for multiple patients

### 4. **Frontend Infrastructure**
- ✅ **App Routing** ([frontend/src/App.tsx](frontend/src/App.tsx))
  - Homepage with feature showcase
  - Login page
  - Nurse dashboard route

- ✅ **UI Components**
  - FaultyTerminal (custom CRT monitor effect)
  - Badge-style login interface
  - Responsive grid layouts
  - Icon-based feature cards

---

## 🔴 Critical Issue: Camera Feed Not Streaming from Patient to Nurse Dashboard

### **The Problem**
The camera/video from the patient's device **does not actually arrive** at the nurse's dashboard. Here's what happens:

```
Patient Device                          Nurse Dashboard
    ↓                                         ↓
Camera stream                          Expecting WebRTC stream
    ↓                                         ↓
WebRTC Offer created                   Shows demo/loop video instead
    ↓
Sent via WebSocket
    ↓
Nurse receives it but...
    ↓
❌ NO ACTUAL VIDEO DISPLAY
```

### **Why This Happens**

1. **WebRTC Connection Never Completes**
   - Patient creates an offer and sends it via WebSocket ✅
   - Nurse dashboard receives the offer ✅
   - Nurse should create an answer... ❌ **NOT IMPLEMENTED**
   - ICE candidates not properly exchanged
   - PeerConnection never established

2. **Nurse Dashboard Doesn't Have WebRTC Consumer Logic**
   - NurseDashboard.tsx doesn't parse incoming WebRTC offers
   - No answer generation code
   - No remote stream attachment to video elements
   - Only displays mock loop videos (johnDoeFeed, northWingFeed, southWingFeed)

3. **Backend Signaling Works But No Payload**
   - Backend correctly routes offer/answer/ICE messages ✅
   - But the nurse dashboard isn't listening/responding ❌

### **Root Cause**
```
Monitor.html (Patient)                NurseDashboard.tsx (Nurse)
  ├─ Initializes PeerConnection ✅     ├─ No PeerConnection logic ❌
  ├─ Creates offer ✅                  ├─ No offer handler ❌
  ├─ Sends via WS ✅                   ├─ No answer generation ❌
  └─ Waits for answer ⏳               └─ No remote stream attachment ❌
```

---

## 🔧 How to Fix: Camera Feed Streaming

### **Option 1: Quick Fix (Use LiveKit for Video Too)**

Instead of WebRTC P2P, use LiveKit (already in use for audio):

**Steps:**
1. Patient publishes video track to LiveKit room
2. Nurse subscribes to that video track
3. Display in video element

**Patient side** ([monitor.html](monitor.html) ~line 420):
```javascript
// After audioTrack publishing:
const videoTrack = await LivekitClient.createLocalVideoTrack({
    source: LivekitClient.Track.Source.Camera,
});
await livekitRoom.localParticipant.publishTrack(videoTrack);
```

**Nurse side** (NurseDashboard.tsx):
```typescript
// Subscribe to video tracks
livekitRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === 'video') {
        const videoElement = document.getElementById(`patient-${patientId}`);
        track.attach(videoElement);
    }
});
```

**Pros:** ✅ Already have LiveKit setup, easier auth, handles NAT/firewall  
**Cons:** ❌ Depends on LiveKit service, slightly higher latency

---

### **Option 2: Complete WebRTC Fix (Production-Grade)**

Implement full WebRTC signaling in NurseDashboard.tsx:

**A. Add WebRTC Handler to Nurse Dashboard**
```typescript
// NurseDashboard.tsx
const handleWebRtcOffer = async (data: any) => {
    const peerConn = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS
    });

    // Handle remote stream
    peerConn.ontrack = (event) => {
        const videoEl = document.getElementById(`patient-${data.patientId}`);
        if (videoEl && videoEl instanceof HTMLVideoElement) {
            videoEl.srcObject = event.streams[0];
        }
    };

    // Set remote offer
    await peerConn.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );

    // Create and send answer
    const answer = await peerConn.createAnswer();
    await peerConn.setLocalDescription(answer);

    ws.send(JSON.stringify({
        type: 'webrtc_answer',
        nurseId: NURSE_ID,
        patientId: data.patientId,
        answer: answer
    }));

    // Handle ICE candidates
    peerConn.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({
                type: 'webrtc_ice_candidate',
                target: 'patient',
                patientId: data.patientId,
                candidate: event.candidate
            }));
        }
    };

    // Store for later ICE handling
    peerConnections.set(data.patientId, peerConn);
};
```

**B. Handle ICE Candidates**
```typescript
const handleRemoteIceCandidate = async (data: any) => {
    const peerConn = peerConnections.get(data.patientId);
    if (peerConn && data.candidate) {
        await peerConn.addIceCandidate(
            new RTCIceCandidate(data.candidate)
        );
    }
};
```

**Pros:** ✅ P2P streaming, lower latency, works offline  
**Cons:** ❌ More NAT/firewall issues, complex signaling, requires proper error handling

---

### **Option 3: Hybrid Approach (RECOMMENDED)**

Use LiveKit for reliable video + WebRTC for low-latency optional stream:

- Primary: LiveKit video track (reliable, hospital-grade)
- Secondary: WebRTC offer for fallback/low-latency option
- Display primary by default, switch on demand

---

## 🚀 Comprehensive Improvement Plan

### **Phase 1: Fix Camera Streaming (CRITICAL - Priority 1)**
**Duration:** 2-3 days  
**Status:** ❌ BLOCKED

1. ✅ Choose streaming option (recommend LiveKit for reliability)
2. ✅ Implement nurse-side answer generation
3. ✅ Add video element attachment in NurseDashboard
4. ✅ Test with single patient
5. ✅ Add stream status indicators
6. ✅ Handle disconnection/reconnection

**Acceptance Criteria:**
- Live video from patient device appears in nurse dashboard
- No lag > 2 seconds
- Works with 3+ simultaneous patients
- Recovers from temporary network loss

---

### **Phase 2: Alert System Improvements (Priority 2)**
**Duration:** 1-2 days

1. ✅ **Enhance Vision Detection**
   - Add more emergency types (falls with confidence scoring)
   - Implement activity monitoring (bed exit detection)
   - Track patient movement patterns
   - Add false-positive reduction

2. ✅ **Audio Enhancement**
   - Use ML-based speech understanding (not just keywords)
   - Detect tone/urgency in voice
   - Filter background noise better
   - Add speaker identification

3. ✅ **Alert Prioritization**
   - Severity levels (critical, urgent, concerning)
   - Route to appropriate staff based on severity
   - Smart cooldown based on alert type
   - Escalation if not acknowledged within X seconds

4. ✅ **Visual Feedback**
   - Highlighted emergency camera feed
   - Color-coded alert indicators
   - Timeline of alerts per patient
   - Alert reason clearly stated

---

### **Phase 3: Patient-Side Improvements (Priority 3)**
**Duration:** 2-3 days

1. ✅ **UI/UX**
   - Replace monitor.html terminal interface with modern dashboard
   - Display vital signs (if available)
   - Show nurse availability
   - Mood/pain level indicators

2. ✅ **Data Management**
   - Patient settings (call button, SOS gesture)
   - Privacy controls (camera on/off, audio on/off)
   - Activity log display
   - Emergency contact information

3. ✅ **Accessibility**
   - Large buttons for elderly users
   - High contrast mode
   - Voice commands support
   - Text-to-speech for alerts

4. ✅ **Robustness**
   - Automatic fallback if vision fails
   - Queue unsent alerts until connected
   - Battery/performance optimization
   - Offline mode

---

### **Phase 4: Nurse Dashboard Enhancements (Priority 4)**
**Duration:** 2-3 days

1. ✅ **Multi-Patient Management**
   - Grid view with 6-9 patients simultaneously
   - Quick filter (by status, alert type, room number)
   - Patient search
   - Workload distribution view

2. ✅ **Alert Intelligence**
   - Context-aware alerts (what triggered it)
   - Historical patterns (false positives, repeat events)
   - Suggested actions for specific conditions
   - Audit trail of actions taken

3. ✅ **Communication**
   - Two-way audio with patient
   - Text/quick message templates
   - Call bell acknowledgment system
   - Handoff notes between nurses

4. ✅ **Analytics & Reporting**
   - Response time metrics
   - Alert frequency by patient
   - False positive rate
   - Shift reports
   - Compliance logging

---

### **Phase 5: Backend & Infrastructure (Priority 5)**
**Duration:** 3-4 days

1. ✅ **Data Persistence**
   - Database for patient records (PostgreSQL)
   - Alert history with details
   - User authentication/authorization
   - Audit logging

2. ✅ **Scalability**
   - Move from in-memory storage to DB
   - Implement message queuing (RabbitMQ/Redis)
   - Load balancing for multiple backend instances
   - Connection pooling

3. ✅ **Deployment**
   - Docker containerization
   - Kubernetes orchestration
   - CI/CD pipeline (GitHub Actions)
   - Health checks and monitoring

4. ✅ **Security**
   - HTTPS/WSS encryption
   - JWT authentication
   - HIPAA compliance measures
   - Rate limiting
   - Input validation

---

### **Phase 6: Testing & Documentation (Priority 6)**
**Duration:** 2-3 days

1. ✅ **Testing**
   - Unit tests (backend, alerts)
   - Integration tests (end-to-end flows)
   - Load testing (100+ concurrent patients)
   - Edge case testing (network failures, etc.)

2. ✅ **Documentation**
   - API documentation (Swagger/OpenAPI)
   - Architecture diagrams
   - Deployment guide
   - User manuals (patient & nurse)
   - Developer onboarding guide

---

## 📁 File Structure Summary

```
project/
├── agent.py                          # LiveKit patient monitoring agent
├── monitor.html                      # Patient monitoring interface (1064 lines)
│   ├─ Vision monitoring (Overshoot)
│   ├─ Voice monitoring (LiveKit transcription)
│   ├─ WebRTC camera stream setup
│   ├─ Alert generation & broadcast
│   └─ Status/transcript display
│
├── backend/
│   ├── patient-monitor.js            # WebSocket server & Express API (425 lines)
│   │   ├─ WS patient/nurse registration
│   │   ├─ Alert routing & broadcast
│   │   ├─ WebRTC signaling (offer/answer/ICE)
│   │   ├─ LiveKit token generation
│   │   └─ Alert history management
│   ├── package.json
│   ├── .env                          # LiveKit, Overshoot, ElevenLabs credentials
│   └── cv/, llm/, events/            # Placeholder directories (empty)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                   # Main routing (296 lines)
│   │   │   ├─ Home page (landing)
│   │   │   ├─ Login screen
│   │   │   └─ Dashboard route
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx         # Badge-style login (180 lines)
│   │   │   └── NurseDashboard.tsx    # Nurse UI (1127 lines)
│   │   │       ├─ Multi-camera grid
│   │   │       ├─ Alert management
│   │   │       ├─ Patient list
│   │   │       ├─ Vital signs display (mock)
│   │   │       └─ WebSocket listeners (incomplete)
│   │   ├── components/
│   │   │   └── FaultyTerminal.jsx   # CRT monitor effect
│   │   ├── types/
│   │   │   └── media.d.ts
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── assets/
│   │   │   └── alert.mp3
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   ├── loop_vids/                   # Mock video feeds
│   │   ├── feed_north.png
│   │   ├── feed_south.png
│   │   └── feed_john.mp4
│   ├── dashboard/                   # Old Create React App version (unused)
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── requirements.txt                 # Python dependencies (for agent.py)
├── package.json                     # Root workspace config
├── tsconfig.json
├── .env                             # Main environment (credentials)
├── .gitignore
├── README.md                        # (empty currently)
└── yolov8n.pt                       # Pre-trained YOLOv8 model

```

---

## 🔍 Code Quality Assessment

### **Strengths ✅**
- Clean WebSocket message protocol
- Comprehensive error handling in vision/voice monitoring
- Good separation of concerns (patient client, nurse dashboard, backend)
- Proper use of modern Web APIs (WebRTC, getUserMedia, WebSocket)
- Real-time capabilities with multiple fallbacks
- Good alert metadata tracking

### **Weaknesses ⚠️**
- **No database** - Everything in-memory (lost on restart)
- **Incomplete WebRTC** - Answer generation not implemented on nurse side
- **No authentication** - Anyone can connect as patient/nurse
- **Limited error handling** - Many edge cases unhandled
- **No logging infrastructure** - console.log only
- **Mock data** - Nurse dashboard shows demo videos, not real streams
- **No state management** - Frontend uses basic React hooks (should use Redux/Zustand for complex state)
- **Hardcoded values** - IPs, ports, patient IDs not configurable
- **No tests** - Zero test coverage
- **Documentation missing** - README is empty

---

## 🎯 Success Metrics

### **MVP Success**
- [ ] Live video streams from patient to nurse (2+ second latency)
- [ ] Voice monitoring detects distress with 90%+ accuracy
- [ ] Vision monitoring detects falls with 85%+ accuracy
- [ ] Alerts reach nurse within 3 seconds
- [ ] Dashboard displays all 3+ patients simultaneously
- [ ] System handles 30+ minute sustained use without crashes

### **Phase 1 Success**
- [ ] Video streaming fully functional with no dropped frames
- [ ] Multi-patient support (5+ simultaneous)
- [ ] Alert acknowledgment system working
- [ ] Proper error messages for network failures

### **Phase 2+ Success**
- [ ] User authentication working
- [ ] Database persistence verified
- [ ] HIPAA compliance checklist passed
- [ ] Load test: 100 concurrent patients supported
- [ ] Response time < 1 second for all operations

---

## 🏁 Quick Start to Run Locally

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# 2. Configure environment
# Edit .env with your LiveKit, Overshoot, ElevenLabs credentials

# 3. Start backend
cd backend
npm run dev
# Runs on ws://localhost:3000

# 4. Start frontend (in new terminal)
cd frontend
npm run dev
# Runs on http://localhost:5173

# 5. Open patient monitor
# Open monitor.html in browser (need local http server, not file://)
# Or add it to frontend and route to it

# 6. Access dashboard
# Navigate to http://localhost:5173/dashboard
```

---

## ⚡ Next Immediate Steps

**THIS WEEK:**
1. ✅ **Fix camera streaming** (Critical blocker)
   - Implement WebRTC answer generation in NurseDashboard
   - OR implement LiveKit video track publishing

2. ✅ **Add authentication**
   - Simple login with patient/nurse roles
   - Store in localStorage for now

3. ✅ **Replace mock data**
   - Connect real patient streams
   - Show actual alert history

**NEXT WEEK:**
4. ✅ **Improve UI/UX**
   - Better alert display
   - Patient side dashboard

5. ✅ **Add database**
   - PostgreSQL for patient/alert history
   - Docker for local development

---

## 📞 Questions to Clarify

1. **Should we use LiveKit for video or complete WebRTC P2P?**
   - LiveKit is easier but costs money at scale
   - WebRTC is free but more complex

2. **Do you have real medical APIs we should integrate?**
   - For vitals (heart rate, O2 saturation, etc.)
   - Currently showing mock data

3. **What's the target deployment?**
   - Hospital network only?
   - Cloud-hosted?
   - Hybrid?

4. **Compliance requirements?**
   - HIPAA? SOC 2?
   - Data retention policies?

5. **Who's the end user?**
   - Specific hospital/clinic?
   - Scale expectations?

---

## 🎓 Resources & References

- **LiveKit:** https://docs.livekit.io
- **WebRTC:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Overshoot Vision:** https://www.overshoot.ai
- **Express.js:** https://expressjs.com
- **React TypeScript:** https://react-typescript-cheatsheet.netlify.app

---

**Report Generated:** January 23, 2026  
**Project Status:** 🟡 In Development (Video streaming critical blocker)  
**Recommendation:** Implement Option 1 (LiveKit video) this week to unblock nurse dashboard
