#!/usr/bin/env pwsh
# System Validation Script - Tests all endpoints and components

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "NEXHACKS SYSTEM VALIDATION SCRIPT" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

# Test 1: Backend Health
Write-Host "Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
    if ($health.StatusCode -eq 200) {
        Write-Host "   [PASS] Backend is running" -ForegroundColor Green
        $results += @{ Test = "Backend Health"; Status = "PASS" }
    }
} catch {
    Write-Host "   [FAIL] Backend is not running" -ForegroundColor Red
    $results += @{ Test = "Backend Health"; Status = "FAIL" }
}

# Test 2: LiveKit Config
Write-Host ""
Write-Host "Testing LiveKit Configuration..." -ForegroundColor Yellow
try {
    $livekit = Invoke-WebRequest -Uri "http://localhost:3000/api/livekit-token" -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"roomName":"test-room","participantName":"TestUser"}' `
        -UseBasicParsing
    if ($livekit.StatusCode -eq 200) {
        Write-Host "   [PASS] LiveKit endpoint is working" -ForegroundColor Green
        $results += @{ Test = "LiveKit Endpoint"; Status = "PASS" }
    }
} catch {
    Write-Host "   [FAIL] LiveKit endpoint error: $_" -ForegroundColor Red
    $results += @{ Test = "LiveKit Endpoint"; Status = "FAIL" }
}

# Test 3: Overshoot Config
Write-Host ""
Write-Host "Testing Overshoot Configuration..." -ForegroundColor Yellow
try {
    $overshoot = Invoke-WebRequest -Uri "http://localhost:3000/api/overshoot-config" -UseBasicParsing
    if ($overshoot.StatusCode -eq 200) {
        Write-Host "   [PASS] Overshoot config is available" -ForegroundColor Green
        $results += @{ Test = "Overshoot Config"; Status = "PASS" }
    }
} catch {
    Write-Host "   [FAIL] Overshoot config error: $_" -ForegroundColor Red
    $results += @{ Test = "Overshoot Config"; Status = "FAIL" }
}

# Test 4: TTS Audio Endpoint
Write-Host ""
Write-Host "Testing TTS Audio Endpoint..." -ForegroundColor Yellow
try {
    $audio = Invoke-WebRequest -Uri "http://localhost:3000/api/alert-audio" -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"text":"Test alert message"}' `
        -UseBasicParsing
    if ($audio.StatusCode -eq 200) {
        Write-Host "   [PASS] TTS audio endpoint is working" -ForegroundColor Green
        $results += @{ Test = "TTS Audio"; Status = "PASS" }
    }
} catch {
    Write-Host "   [FAIL] TTS audio endpoint error: $_" -ForegroundColor Red
    $results += @{ Test = "TTS Audio"; Status = "FAIL" }
}

# Test 5: Frontend
Write-Host ""
Write-Host "Testing Frontend..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:5174/" -UseBasicParsing
    if ($frontend.StatusCode -eq 200) {
        Write-Host "   [PASS] Frontend is running" -ForegroundColor Green
        $results += @{ Test = "Frontend"; Status = "PASS" }
    }
} catch {
    Write-Host "   [FAIL] Frontend is not running" -ForegroundColor Red
    $results += @{ Test = "Frontend"; Status = "FAIL" }
}

# Print Results Summary
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "VALIDATION RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count

foreach ($result in $results) {
    if ($result.Status -eq "PASS") {
        Write-Host "[PASS] - $($result.Test)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] - $($result.Test)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary: $passCount PASS, $failCount FAIL" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "All systems ready! Follow QUICK_START.md to test integrations." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Some systems unavailable. Ensure services are running." -ForegroundColor Yellow
}
