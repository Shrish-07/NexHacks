#!/usr/bin/env pwsh
# Start Backend Only
cd "c:\Users\rishb\Desktop\Projects\Nexhacks\backend"
Write-Host "🚀 Starting ATTUNE Backend (port 3000)..." -ForegroundColor Cyan
Write-Host "WebSocket: ws://localhost:3000" -ForegroundColor Green
Write-Host ""
npm run dev
