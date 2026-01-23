#!/usr/bin/env pwsh
# Attune - Full System Testing Script
# Launches all components for end-to-end testing

Write-Host "🚀 ATTUNE System Startup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "📁 Project Root: $projectRoot" -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (-not (Test-Path (Join-Path $projectRoot ".env"))) {
    Write-Host "⚠️  .env file not found in project root!" -ForegroundColor Yellow
    Write-Host "Please create .env with LiveKit and API keys" -ForegroundColor Yellow
}

Write-Host "Starting components..." -ForegroundColor Cyan
Write-Host ""

# Terminal 1: Backend
Write-Host "1️⃣  Starting Backend (WebSocket server on :3000)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$backendDir'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Terminal 2: Frontend  
Write-Host "2️⃣  Starting Frontend (Vite dev server on :5173)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$frontendDir'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ All components started!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "  • Frontend:  http://localhost:5173" -ForegroundColor Green
Write-Host "  • Backend:   http://localhost:3000" -ForegroundColor Green
Write-Host "  • WebSocket: ws://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Testing Steps:" -ForegroundColor Cyan
Write-Host "  1. Go to http://localhost:5173/login" -ForegroundColor White
Write-Host "  2. Click 'Nurse' to access the nurse dashboard" -ForegroundColor White
Write-Host "  3. In another browser window, go to http://localhost:5173/login" -ForegroundColor White
Write-Host "  4. Click 'Patient' to login as a patient" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "  • Check browser console for errors (F12)" -ForegroundColor White
Write-Host "  • Check terminal output for backend logs" -ForegroundColor White
Write-Host "  • Refresh browser if WebSocket connection fails" -ForegroundColor White
Write-Host ""
