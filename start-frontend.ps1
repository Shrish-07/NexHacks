#!/usr/bin/env pwsh
# Start Frontend Only
cd "c:\Users\rishb\Desktop\Projects\Nexhacks\frontend"
Write-Host "🚀 Starting ATTUNE Frontend (port 5173)..." -ForegroundColor Cyan
Write-Host "Access at: http://localhost:5173" -ForegroundColor Green
Write-Host ""
npm run dev
