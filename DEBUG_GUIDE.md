# WebRTC Video Streaming Debug Guide

## Quick Start

1. **Open Browser DevTools**: Press `F12` in both browser tabs
2. **Go to Console Tab**: Click "Console" to see all logs
3. **Follow the emoji markers** in console output to understand the flow

## Expected Flow (Working Case)

### Patient Side Console Logs (In Order)
```
✅ Local description set (offer)
📡 Offer sent to nurse

(wait for nurse answer...)

📥 Received WebRTC answer from nurse
🔄 Setting remote description (answer)...
✅ Remote description set (answer)
🔌 Peer connection state:
   - connectionState: 'connecting' (then 'connected')
   - iceConnectionState: 'checking' (then 'connected')
   - iceGatheringState: 'gathering' (then 'complete')
   - signalingState: 'stable'

🧊 ICE candidate received (multiple times)
🔗 Connection state changed → 'connected'
🧊 ICE connection state changed → 'connected'
```

### Nurse Side Console Logs (In Order)
```
📥 Received WebRTC offer from patient: [patientId]
🔌 RTCPeerConnection created for: [patientId]
💾 PC stored in ref map. Total connections: 1
🔄 Setting remote description (offer)...
✅ Remote description set
📝 Answer created
✅ Local description set (answer)
📤 WebRTC answer sent to patient

(wait for tracks from patient...)

🎬 ontrack fired! {
  trackKind: 'video',
  streamsLength: 1,
  streamId: 'stream-id-xxx',
  trackId: 'track-id-xxx',
  trackEnabled: true,
  patientId: 'xxx'
}

📺 Video element found? true {
  tagName: 'VIDEO',
  width: 1280,
  height: 720,
  style: null
}

✅ Setting srcObject...
✅ srcObject set: {
  objectSet: true,
  hasVideo: 1
}

🔗 Connection state changed → 'connected'
🧊 ICE connection state changed → 'connected'
```

## Debugging Black Screen Issue

### Step 1: Verify ontrack Event Fires
**Look for**: `🎬 ontrack fired!` in nurse console
- If **NOT present**: Tracks are not being sent from patient or ICE hasn't established
- If **present**: Continue to Step 2

### Step 2: Verify Video Element Exists
**Look for**: `📺 Video element found? true`
- If **false**: The ref wasn't set before ontrack fired (timing issue)
- If **true**: Continue to Step 3

### Step 3: Verify srcObject Assignment
**Look for**: `✅ srcObject set: { objectSet: true, hasVideo: 1 }`
- If **objectSet is false**: Assignment failed (shouldn't happen)
- If **hasVideo is 0**: Stream has no video tracks
- If **true/1**: Video was assigned correctly, check browser display issue

### Step 4: Check Connection States
**Look for these state changes on both sides**:
- `connectionState` should go: `'new'` → `'connecting'` → `'connected'`
- `iceConnectionState` should go: `'new'` → `'checking'` → `'connected'`
- If stuck on `'connecting'` or `'checking'`: **ICE connectivity problem**

## Common Issues & Fixes

### Issue: ❌ "ontrack never fires"
**Diagnosis**: One of:
1. Patient not sending offer (check patient console for "offer sent")
2. Patient not adding tracks (check "All tracks added")
3. ICE candidates not being exchanged (no `🧊 ICE candidate received`)
4. Answer not received by patient (check "Remote description set" on patient)

**Fix**: Check backend logs for message routing. Verify WebSocket connections are open.

### Issue: 🟡 "ontrack fires but srcObject assignment skipped"
**Console will show**: `⚠️ ontrack skipped: { videoElExists: false, isVideo: true }`

**Diagnosis**: Video element ref not yet created when track arrives

**Fix**: This is a timing race condition. The video element might not be mounted yet.

**Solution**: Add state-based video element creation.

### Issue: 🟡 "srcObject set but black screen"
**Console will show**: `✅ srcObject set: { objectSet: true, hasVideo: 1 }`
**But**: Video element still black in UI

**Diagnosis**: Browser display issue, not WebRTC issue
- Check video element attributes (autoPlay, playsInline)
- Check CSS (element might be hidden)
- Check browser permissions (camera access allowed)

**Fix**: Inspect HTML element in DevTools. Look for:
```html
<video autoPlay playsInline muted crossOrigin="anonymous" 
       style="width: 100%; height: 100%; object-fit: cover;">
</video>
```

### Issue: 💥 "connection states stuck on 'connecting'"
**Console will show**: States never change to `'connected'`

**Diagnosis**: ICE failure (no candidates being gathered or no valid path found)

**Fix**: 
1. Check internet connection
2. Check firewall settings
3. Try different TURN server
4. Check backend logs for message routing

## Reading Console for Patient Flow

### First Message Received
```
📥 Received WebRTC answer from nurse
```
This means patient got the answer from nurse. If not seeing this:
- Backend not routing answers correctly
- Nurse not sending answer
- WebSocket connection down

### Video Element Mounting
```
📹 Video element mounted for: [patientId]
```
On **nurse** side only. Should appear before `ontrack` fires.

## Real-Time Testing Checklist

- [ ] Patient: Login with name "Patient1"
- [ ] Nurse: Login with name "Nurse1"
- [ ] Nurse: Click "Request Video" on patient card
- [ ] Check Patient Console: Should see "📥 Received WebRTC answer from nurse"
- [ ] Check Nurse Console: Should see "🎬 ontrack fired!"
- [ ] Check Nurse UI: Video element should display (not black)

## Terminal Commands for Backend Debugging

If WebRTC flow not working, check backend logs:

```powershell
# Terminal 1: Watch backend logs for signaling messages
Get-Content -Path "path\to\backend\logs.txt" -Wait | Select-String "Offer|Answer|ICE"
```

## Next Steps If Still Black Screen

1. **Capture full console output**:
   - Right-click in console → "Save as..."
   - Save both patient and nurse console logs

2. **Check browser dev tools**:
   - Open video element in Elements tab
   - Check computed styles (should not be hidden)
   - Check srcObject property (should be MediaStream object)

3. **Check network tab**:
   - All WebSocket messages should be sent/received
   - No errors in Network tab

4. **Test native WebRTC**:
   - Create minimal test page with simple video element
   - Verify browser can display video streams at all

