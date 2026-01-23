# 🚀 Quick Start - Test All Integrations

## 1️⃣ MANUAL ALERT TEST ✅
Already working! You'll see a red card appear on nurse dashboard with TTS audio.

---

## 2️⃣ VOICE ALERT TEST ❓
### Prerequisites:
- Agent running: `python agent.py` (in root folder)
- Patient console (F12) showing: `✅ [PATIENT] Connected to LiveKit room`
- Agent console showing: `✅ [AGENT] Connected to LiveKit!`

### Test Steps:
```bash
# In Patient Dashboard (on video):
Speak clearly: "HELP" or "I can't breathe"

# Check Agent Console for:
🗣️  Detected: 'help'
✅ DISTRESS KEYWORD DETECTED!
📤 [AGENT] ALERT SENT - Status: 200

# Check Nurse Dashboard for:
🔴 Red alert card appears
🎵 TTS audio plays
```

---

## 3️⃣ VISUAL ALERT TEST ❓
### Using curl (replace with real Overshoot when ready):
```bash
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_TEST",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.95,
    "description": "Fall detected by Overshoot"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "alert": {
    "id": "alert_1234567890_abc123",
    "patientId": "PATIENT_TEST",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.95,
    "source": "overshoot"
  }
}
```

### Check Nurse Dashboard:
- 🔴 Red alert card appears
- 🎵 TTS audio: "Alert: Test Patient in room 101"

---

## 📊 Status Dashboard

| Feature | Status | Check |
|---------|--------|-------|
| Backend `:3000` | ✅ Running | `curl http://localhost:3000/health` |
| Frontend `:5174` | ✅ Running | Open `http://localhost:5174` |
| Manual Alerts | ✅ Working | Click "Test Alert" button |
| LiveKit Config | ✅ Ready | Check backend console for `✅ [INIT]` |
| Voice Alerts | ❓ Ready | Need agent running + patient speaking |
| Visual Alerts | ❓ Ready | Use curl command above |

---

## 🎯 Debug Checklist

### Voice Alerts Not Working?
- [ ] `python agent.py` is running
- [ ] Patient console shows: `✅ Connected to LiveKit room`
- [ ] Agent console shows: `✅ Connected to LiveKit!`
- [ ] Patient speaks keyword clearly
- [ ] Check agent console for: `✅ DISTRESS KEYWORD DETECTED!`

### Visual Alerts Not Working?
- [ ] Backend running: `npm start` in backend/
- [ ] curl command returns 200 status
- [ ] Check backend console for: `📨 [OVERSHOOT] Alert received`
- [ ] Nurse dashboard updates in real-time

### Nurse Dashboard Not Updating?
- [ ] Nurse window is logged in
- [ ] WebSocket connection active (check DevTools Network)
- [ ] Try refreshing (Ctrl+R) if stuck

---

## 🔧 Real Overshoot Integration (When Ready)

Currently using manual API endpoint. To integrate real Overshoot:

1. Get Overshoot API credentials
2. Set environment variable: `OVERSHOOT_API_KEY=<your-key>`
3. Update backend endpoint to call real Overshoot API
4. Patient wears Overshoot sensors during testing

---

## 📝 Test Script (Paste in Terminal)

```bash
# Test 1: Health check
curl -s http://localhost:3000/health | jq .

# Test 2: Check Overshoot config
curl -s http://localhost:3000/api/overshoot-config | jq .

# Test 3: Send visual alert
curl -s -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"TEST","roomNumber":"101","condition":"PATIENT_FALLING","confidence":0.95}' | jq .
```

---

## 📱 Console Indicators

| Emoji | Meaning | Where |
|-------|---------|-------|
| 🎤 | Microphone/Audio action | Patient console |
| ✅ | Success | All consoles |
| ❌ | Error/Failure | All consoles |
| 📨 | Alert received | Backend console |
| 📢 | Broadcasting alert | Backend console |
| 🔴 | Alert card on dashboard | Nurse browser |
| 🎵 | TTS audio playing | Audio output |

---

## 📞 Next Steps

1. **Refresh browser** at `http://localhost:5174`
2. **Login as Patient** (in Window 1)
3. **Login as Nurse** (in Window 2)
4. **Test Manual Alert** - Click "Test Alert" button ✅
5. **Start Agent** - `python agent.py` in terminal
6. **Test Voice Alert** - Patient says "HELP"
7. **Test Visual Alert** - Run curl command above
8. **Check logs** - All three should show alerts

---

## 💡 Pro Tips

- Open DevTools (F12) in both windows for real-time logging
- Keep terminal visible to see agent detection logs
- Check browser Network tab if WebSocket seems stuck
- TTS audio plays automatically (check volume!)
- All alerts clear after 10 seconds (configurable)

