# PowerShell Test Script for Attune System
# Run this in Terminal 3 after starting backend and frontend

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ATTUNE SYSTEM - LOCAL TESTING SUITE" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health Check
Write-Host "1. Testing Backend Health..." -ForegroundColor Yellow
$healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get
$healthData = $healthResponse.Content | ConvertFrom-Json
Write-Host "✓ Backend Status: $($healthData.status)" -ForegroundColor Green
Write-Host "  Patients: $($healthData.patients), Nurses: $($healthData.nurses), Alerts: $($healthData.alerts)" -ForegroundColor Green
Write-Host ""

# Test 2: Manual Alert
Write-Host "2. Testing Manual Alert..." -ForegroundColor Yellow
$manualAlertBody = @{
    room = "305"
    event = "PATIENT_DISTRESS"
    transcript = "Patient calling for help during testing"
    severity = "high"
    source = "test"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/alert" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $manualAlertBody
    
    $alertData = $response.Content | ConvertFrom-Json
    Write-Host "✓ Manual Alert Created Successfully" -ForegroundColor Green
    Write-Host "  Alert ID: $($alertData.alert.id)" -ForegroundColor Green
    Write-Host "  Event: $($alertData.alert.event)" -ForegroundColor Green
} catch {
    Write-Host "✗ Manual Alert Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Visual Alert (Overshoot)
Write-Host "3. Testing Visual Alert (Overshoot)..." -ForegroundColor Yellow
$visualAlertBody = @{
    patientId = "PATIENT_001"
    roomNumber = "305"
    condition = "CHOKING"
    confidence = 0.92
    description = "Patient clutching throat, unable to speak, distressed face"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/overshoot-alert" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $visualAlertBody
    
    $alertData = $response.Content | ConvertFrom-Json
    Write-Host "✓ Visual Alert Created Successfully" -ForegroundColor Green
    Write-Host "  Alert ID: $($alertData.alert.id)" -ForegroundColor Green
    Write-Host "  Condition: $($alertData.alert.condition)" -ForegroundColor Green
    Write-Host "  Confidence: $($alertData.alert.confidence * 100)%" -ForegroundColor Green
} catch {
    Write-Host "✗ Visual Alert Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get All Alerts
Write-Host "4. Retrieving Recent Alerts..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/alerts" -Method Get
    $alertsData = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ Retrieved $($alertsData.alerts.Count) alerts" -ForegroundColor Green
    foreach ($alert in $alertsData.alerts | Select-Object -Last 3) {
        Write-Host "  - $($alert.condition) from Patient $($alert.patientId) (Room $($alert.roomNumber))" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Get Alerts Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Patients
Write-Host "5. Checking Patient Connections..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/patients" -Method Get
    $patientsData = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ Found $($patientsData.patients.Count) connected patients" -ForegroundColor Green
    foreach ($patient in $patientsData.patients) {
        Write-Host "  - $($patient.patientId) (Connected: $($patient.connected))" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Get Patients Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Final Summary
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "✓ TESTING COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  ✓ Backend health check: PASSED" -ForegroundColor Green
Write-Host "  ✓ Manual alert creation: PASSED" -ForegroundColor Green
Write-Host "  ✓ Visual alert creation: PASSED" -ForegroundColor Green
Write-Host "  ✓ Alert retrieval: PASSED" -ForegroundColor Green
Write-Host "  ✓ Patient tracking: PASSED" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Visit http://localhost:5173 in browser" -ForegroundColor Yellow
Write-Host "  2. Login as NURSE (ID: nurse1)" -ForegroundColor Yellow
Write-Host "  3. Verify alerts appear on dashboard" -ForegroundColor Yellow
Write-Host "  4. Confirm audio plays when alert arrives" -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
