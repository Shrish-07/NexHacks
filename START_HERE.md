# ⚡ QUICK START - TEST NOW

## URLs
- **Frontend:** http://localhost:5174/login
- **Backend:** ws://localhost:3000

## Landing Page
Should see TWO buttons side-by-side:
```
[PATIENT]  [NURSE]
  Blue      Cyan
```
NO "Press N" text ✅

## Test Flow (5 min)

### Window 1 - PATIENT
```
1. http://localhost:5174/login
2. Click [PATIENT] (blue button)
3. Name: "TestPatient"
4. Room: "101"
5. Click Login
6. See your camera
```

### Window 2 - NURSE (in SAME browser)
```
1. http://localhost:5174/login
2. Click [NURSE] (cyan button)  
3. Nurse ID: "NURSE1"
4. Click Login
5. See TestPatient card
6. Click "Request Video"
7. See patient camera (NOT BLACK) ✅
```

### Both Should Stay Logged In
```
- Refresh Window 1 → Still logged in ✅
- Refresh Window 2 → Still logged in ✅
- NO logout on either side
```

## Test Voice Alert
```
In Window 1 (Patient):
  - Say: "HELP"
  
In Window 2 (Nurse):
  - Red alert appears at top
  - Nurse hears: "ALERT: TestPatient in room 101..."
  - Alert in list below ✅
```

## Test Overshoot Alert
Open Terminal and run:

```bash
# Get patient ID from nurse console
# Replace PATIENT_... with actual ID

curl -X POST http://localhost:3000/api/overshoot-alert \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_...",
    "roomNumber": "101",
    "condition": "PATIENT_FALLING",
    "confidence": 0.92,
    "description": "Patient detected falling"
  }'
```

Nurse should see alert instantly ✅

## Success Checklist

- ✅ Two buttons visible on landing
- ✅ Both tabs can stay logged in
- ✅ Patient sees own camera
- ✅ Nurse sees patient camera (not black)
- ✅ Status shows "Live"
- ✅ Voice alert triggers
- ✅ TTS plays
- ✅ Overshoot alert triggers
- ✅ No console errors

**All pass = SYSTEM READY** 🎉

---

For full test guide see: **FULL_SYSTEM_TEST.md**
For all fixes see: **FIXES_SUMMARY.md**
