# 🚀 IMMEDIATE ACTION GUIDE

## Current Status
- ✅ Backend running on :3000
- ✅ Frontend running on :5174
- ✅ All code compiled without errors
- ✅ All integrations in place

## DO THIS RIGHT NOW

### 1. Refresh Browser
```
http://localhost:5174/login
```
Should see:
- Two buttons: **[Add Patient]** (blue) | **[Nurse]** (cyan)
- No "Press N" text
- Smooth animations on load

### 2. Test Patient Setup
```
Window 1:
1. Click [Add Patient]
2. Name: "Test1"
3. Room: "101"
4. Click "Add Patient"
5. See camera feed
6. See 🧪 Test Alert button at bottom
```

### 3. Test Nurse Connection
```
Window 2 (same browser):
1. Go to http://localhost:5174/login
2. Click [Nurse]
3. ID: "NURSE"
4. Click Login
5. Should see "Test1" patient card
6. Click "Request Video"
7. Should see patient's camera (NOT BLACK!)
8. Card should say "Live"
```

### 4. Test Alert (Easiest Way)
```
Window 1 (Patient):
- Click 🧪 Test Alert button

Window 2 (Nurse):
- Should see RED ALERT BOX at top
- Should say: "ALERT: Test1 in room 101"
- Should hear: "ALERT: Test1 in room 101..." (TTS audio)
- Alert appears in list below
```

### 5. Open Developer Console (F12 → Console)
Watch for these logs while testing:

**Patient Tab:**
```
✅ [PATIENT] Connected to backend
👁️  [PATIENT] Room: 101 Patient: Test1
```

**Nurse Tab:**
```
🚨 [NURSE] New alert received
🔊 [NURSE] Alert SFX playing
🎤 [NURSE] Generating TTS
✅ [NURSE] TTS audio generated
🎵 [NURSE] TTS audio playing
```

**Backend Terminal:**
```
📨 [ALERT] Received alert request
✅ [ALERT] Found patient: Test1
📢 [ALERT] Broadcasting to 1 nurses
🚨 [ALERT] Test1 room 101
```

---

## If Test Alert Works ✅
→ Backend is perfect
→ All integrations working
→ System ready for voice testing

## If Test Alert FAILS ❌
→ Check backend logs
→ Verify environment variables
→ Check browser console errors

---

## Test Voice (If Agent Running)

### How to Test
```
Window 1 (Patient):
- Say clearly: "HELP"
- Or: "CHOKING", "CALL NURSE", "FALLING", "SEIZURE"

Window 2 (Nurse):
- Should see same RED ALERT as test button
```

### Watch Backend Terminal
```
Should see:
📨 [ALERT] Received alert request
✅ [ALERT] Found patient
🚨 [ALERT] VOICE: PATIENT_DISTRESS
```

### Watch Agent Terminal
```
Should see:
🗣️ Detected: 'help'
✅ DISTRESS KEYWORD DETECTED!
📤 ALERT SENT for room 101 - Status: 200
```

---

## Test Visual Detection

### How to Test
```
Open terminal and run:
curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{"patientId":"PATIENT_123","roomNumber":"101","condition":"PATIENT_FALLING","confidence":0.92,"description":"Test falling detection"}'
```

### Replace PATIENT_123 with
Go to nurse console (F12) and look for:
```
Alert received: {
  ...
  patientId: "PATIENT_1234567890"
  ...
}
```

Copy that ID into the curl command.

---

## All New Features

✅ **"Add Patient"** - Setup-style interface
✅ **No home page** - Direct to login
✅ **Login animations** - Smooth transitions
✅ **Test alert button** - Verify backend
✅ **Alert priority** - Cards enlarge when alerts exist
✅ **Full logging** - Every step logged with emojis
✅ **Vitals placeholder** - Shows "Future integration"
✅ **Voice detection** - Keywords detected and logged
✅ **Visual detection** - Overshoot API ready
✅ **Audio alerts** - TTS plays spoken alerts
✅ **Independent sessions** - Both tabs stay logged in

---

## File Structure

```
Project/
├── START_HERE.md (Quick 5-min test)
├── VOICE_DEBUG_GUIDE.md (If voice not working)
├── FULL_SYSTEM_TEST.md (Comprehensive testing)
├── UPDATE_COMPLETE.md (All changes summary)
├── FIXES_SUMMARY.md (Previous session fixes)
└── QUICK_REFERENCE.md (Command reference)
```

---

## What to Report If Issues

1. **Screenshot of error**
2. **Browser console (F12) output**
3. **Backend terminal output**
4. **Steps you took**
5. **What you expected vs what happened**

Example:
```
ISSUE: Test alert button doesn't work
STEPS:
1. Clicked "Add Patient"
2. Filled form, clicked "Add Patient"
3. Scrolled to bottom
4. Clicked 🧪 Test Alert
EXPECTED: Red alert in nurse window
ACTUAL: No alert appeared
CONSOLE OUTPUT: (paste console errors here)
BACKEND OUTPUT: (paste backend logs here)
```

---

## Success Criteria

✅ All pass = System working perfectly:

- [ ] Landing shows 2 buttons clearly
- [ ] "Add Patient" button works
- [ ] Patient sees own camera
- [ ] Nurse sees patient camera (not black)
- [ ] Status shows "Live"
- [ ] Test alert button works
- [ ] Nurse hears TTS audio
- [ ] No console errors
- [ ] Backend logs show alerts

**If all checked → READY FOR PRODUCTION DEMO!** 🎉

---

## Next: If Everything Works

1. Test with voice: "HELP", "CHOKING", "FALLING"
2. Test with Overshoot alerts: Use curl commands
3. Test multiple patients in different rooms
4. Verify audio plays consistently
5. Check backend log rotation (stores 200 alerts)

---

## Emergency: Reset Everything

```powershell
# Kill all processes
Ctrl+C in all terminals

# Clear browser storage
F12 → Application → Clear

# Restart everything
Terminal 1: cd backend; npm run dev
Terminal 2: cd frontend; npm run dev

# Go to: http://localhost:5174/login
```

---

## Ready? ✅

Go to: **http://localhost:5174/login**

Click **[Add Patient]**

Start testing! 🚀
