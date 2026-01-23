# Quick Testing Guide

## Setup (5 minutes)

### Terminal 1: Backend Status
Should show:
```
✅ Server running on port 3000
✅ WebSocket endpoint: ws://localhost:3000
All environment variables set
```

### Terminal 2: Frontend Status
Should show:
```
VITE v7.3.1 ready in [time] ms
➜ Local: http://localhost:5173/
```

### Terminal 3: Ready
For additional commands if needed

---

## Testing the Fix (10 minutes)

### Step 1: Open Two Browser Windows
```
Window 1: http://localhost:5173 → Patient login
Window 2: http://localhost:5173 → Nurse login
```

### Step 2: Patient Side Setup
1. Click "Patient" tab
2. Enter name: **Patient1**
3. Click "Login"
4. You should see: Black rectangle (camera container ready)
5. Open DevTools (F12) → Console tab
6. Leave open for monitoring

### Step 3: Nurse Side Setup
1. Click "Nurse" tab
2. Enter name: **Nurse1**
3. Click "Login"
4. You should see: Patient card appear ("Patient1 - Room XXX")
5. Patient card shows "No video stream" + "Request Video" button
6. Open DevTools (F12) → Console tab
7. Leave open for monitoring

### Step 4: Request Video Flow

**In Nurse window:**
1. Find "Patient1" card
2. Click **"Request Video"** button
3. Watch Console (should see 📥 logs)
4. Watch UI (button should disappear, status should change to "Live")

**In Patient window:**
1. Watch Console (should see 📥 logs)
2. Browser will ask for camera permission
3. Click **"Allow"** to grant camera access
4. Camera feed appears in the rectangle (you see yourself)
5. Watch Console (should see ✅ offer sent)

### Step 5: Check Result

**Expected - Nurse sees:**
- Patient card shows "Live" status
- Video element displays patient's camera feed
- Console shows "🎬 ontrack fired!" and "Applying stored remote stream"
- No black screen!

**Unexpected - Nurse sees:**
- "Live" status ✅
- But video element is BLACK ❌
- Then check console logs (see debugging section below)

---

## Console Navigation

### Open DevTools
- **Windows/Linux**: Press `F12`
- **Mac**: Press `Cmd + Option + J`

### Clear Console
- Right-click in console → Select all → Delete
- Or press: `Ctrl + L` (Windows/Linux) or `Cmd + K` (Mac)

### Filter Console
1. At top of console, look for filter box
2. Type emoji: `🎬` (to see only ontrack logs)
3. Or type: `Stream` (to see stream-related logs)

### Copy Full Console Output
1. Right-click in console
2. Click "Save as..."
3. Save the log file
4. Use this for detailed debugging

---

## Debugging Checklist

### ✅ "Working" Checklist
- [ ] Patient sees their own camera feed
- [ ] Nurse sees "Live" status after requesting video
- [ ] "Request Video" button disappears on Nurse side
- [ ] Nurse console shows: `🎬 ontrack fired!`
- [ ] Nurse console shows: `✅ Stored stream applied`
- [ ] Nurse's video element displays patient's camera (not black)

### ❌ "Black Screen" Checklist
- [ ] Does ontrack event appear in console?
  - If **YES**: Stream reached nurse, but display issue
  - If **NO**: Stream didn't reach nurse (ICE problem)
  
- [ ] Does "Stored stream applied" appear?
  - If **YES**: srcObject was set, check browser display
  - If **NO**: Element never mounted (shouldn't happen)

- [ ] Is video element visible in HTML?
  - Open DevTools → Elements tab
  - Find the `<video>` tag
  - Right-click → Screenshot element
  - Should show the video element dimensions

---

## Log Examples

### Good Flow - Patient Console
```
🔌 RTCPeerConnection created
📌 Adding track to peer connection: video
📌 Adding track to peer connection: audio
📡 All tracks added to peer connection
📝 Offer created
✅ Local description set (offer)
📤 Offer sent to nurse

(wait...)

📥 Received WebRTC answer from nurse
🔄 Setting remote description (answer)...
✅ Remote description set (answer)
🔌 Peer connection state: {
  connectionState: "connected",
  iceConnectionState: "connected",
  signalingState: "stable"
}
```

### Good Flow - Nurse Console
```
📥 Received WebRTC offer from patient: patient-123
🔌 RTCPeerConnection created for: patient-123
💾 PC stored in ref map. Total connections: 1

(immediate after offer processing...)

🎬 ontrack fired! {
  trackKind: "video",
  streamsLength: 1,
  streamId: "stream-abc123",
  trackEnabled: true
}
💾 Remote stream stored for patient-123

(when video element mounts...)

📹 Video element mounted for: patient-123
🔄 Applying stored remote stream to patient-123
✅ Stored stream applied

(connection established...)

🔗 Connection state changed → 'connected'
🧊 ICE connection state changed → 'connected'
```

---

## Common Issues & Quick Fixes

### Issue: "Request Video" button doesn't work
**Check**: Nurse console for errors
**Fix**: Reload nurse page (Ctrl+R)

### Issue: Patient doesn't see camera permission prompt
**Check**: Browser console for JavaScript errors
**Fix**: Check browser camera permissions in settings

### Issue: "ontrack never fires"
**Check**: Patient console - did it send offer?
**Fix**: 
- Reload both pages
- Check backend logs for WebSocket routing
- Verify internet connection

### Issue: Black screen but all logs show ✅
**Check**: Video element in Elements tab
**Fix**:
1. Right-click video element → Inspect
2. Check attributes (should have: autoPlay, playsInline, muted)
3. Check CSS (element shouldn't be hidden)
4. Try refreshing page

---

## Getting Help

### If you see this, include in error report:
1. Full console output (both patient and nurse)
2. Browser name and version
3. Video element HTML (right-click → Copy element)
4. Backend logs from Terminal 1

### To save console output:
1. Right-click in console
2. "Save as" 
3. Email/share the saved file

