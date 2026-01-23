# Local Test Plan - Nexhacks Patient Monitor

## ✅ Changes Made
1. **Fixed landing page routing**: Changed "/" route from LoginScreen → AttuneHomepage
2. **Verified backend detection logic**: Code correctly uses `localhost:3000` when on localhost
3. **Frontend builds successfully**: Zero errors, 8.92s build time

---

## 🧪 Testing Steps (IN ORDER)

### Step 1: Start Backend (Terminal 1)
```powershell
cd "c:\Users\rishb\Desktop\Projects\Nexhacks\backend"
npm start
```

**Expected Output:**
```
✅ Server running on port 3000
✅ WebSocket endpoint: ws://localhost:3000
✅ HTTP endpoint: http://localhost:3000
✅ LiveKit voice monitoring: ENABLED (if config is set)
```

**Verify Health Endpoint:**
```powershell
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "patients": 0,
  "nurses": 0,
  "alerts": 0,
  "livekit": { "configured": true }
}
```

---

### Step 2: Start Frontend Dev Server (Terminal 2)
```powershell
cd "c:\Users\rishb\Desktop\Projects\Nexhacks\frontend"
npm run dev
```

**Expected Output:**
```
VITE v7.3.1 ready in 123 ms
➜  Local:   http://localhost:5173/
```

---

### Step 3: Test Landing Page (Browser)
1. Open: http://localhost:5173
2. **Expected**: See Attune landing page with:
   - Attune logo and "See What Matters" slogan
   - 4 feature cards (Always Watching, Smart Alerts, Clear Explanations, Calm & Unobtrusive)
   - "Get Started" CTA button
   - Navigation buttons: "Nurse dashboard" and "Login"

3. **Click "Login"** → Should navigate to login page
4. **Click "Nurse dashboard"** → Should show dashboard if not logged in, redirected to login

---

### Step 4: Test Backend Detection (Browser Console)
1. Open browser DevTools (F12 → Console)
2. You should see:
   ```
   ✅ Connected to backend
   ```

3. If you see **WebSocket error**, backend isn't running or port 3000 is blocked

---

### Step 5: Test Login Flow
1. On login page:
   - Enter email: `nurse@example.com`
   - Enter password: `password`
   - Click "Nurse"
   
2. **Expected**: Navigate to nurse dashboard
3. **Connection status**: Should show "Connected" at top

---

### Step 6: Verify Patient Connection (Optional)
1. In **second browser tab**:
   - Go to http://localhost:5173/login
   - Login as Patient: `patient@example.com` / `password`
   - Should see patient video feed interface

2. Check backend console for patient registration

---

## ⚠️ Troubleshooting

### Problem: "WebSocket error" in console
**Solution**: 
- Ensure backend is running on port 3000
- Check: `netstat -ano | findstr :3000` (PowerShell)
- If port taken, kill process: `Stop-Process -Id <PID> -Force`

### Problem: Always redirected to login
**Solution**:
- This is now fixed! Landing page should display at "/"
- Clear browser cache: `Ctrl+Shift+Delete`
- Clear sessionStorage: `sessionStorage.clear()` in console

### Problem: Backend health check fails
**Solution**:
- Check .env file has all required keys
- Run backend with: `node patient-monitor.js` (not npm start)
- Verify Node.js version: `node --version` (needs 14+)

### Problem: Port 3000 already in use
**Solution**:
```powershell
# Kill process on port 3000
Get-Process | Where-Object {$_.Handles -like "*3000*"} | Stop-Process -Force
```

---

## ✅ Deployment Checklist (After Local Testing)

- [ ] Backend runs without errors
- [ ] Frontend builds cleanly
- [ ] Landing page shows at localhost:5173
- [ ] Backend detection works (WebSocket connects)
- [ ] Login flow works
- [ ] Patient dashboard shows video stream
- [ ] Nurse dashboard shows alerts

---

## 🚀 Next Steps

**After verifying local setup works:**

1. **Push FRONTEND to GitHub** with `localhost:3000` backend URL
   ```
   git add frontend/ .env.example
   git commit -m "fix: add landing page routing to AttuneHomepage"
   git push
   ```

2. **Deploy FRONTEND to Vercel** (will still use localhost:3000 for now)

3. **Fix BACKEND** and push separately to GitHub
   - Current Render backend may be "asleep"
   - Push healthy backend, then redeploy on Render

4. **Update URLs** after both are deployed:
   - Frontend backend URL → Render production URL
   - Re-deploy frontend to Vercel with production URLs

---

## 📝 Files Modified This Session

- `frontend/src/App.tsx` (Line 30: Changed "/" route to use AttuneHomepage)

## 📝 No Issues Found

- ✅ Frontend builds
- ✅ All routes properly configured
- ✅ Backend detection logic correct
- ✅ .env file present and configured
- ✅ No JSX or TypeScript errors
