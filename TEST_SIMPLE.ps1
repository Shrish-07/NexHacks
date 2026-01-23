# PowerShell Test Script for Attune System
Write-Host "ATTUNE SYSTEM - LOCAL TESTING SUITE" -ForegroundColor Green
Write-Host ""

# Test 1: Backend Health
Write-Host "1. Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   SUCCESS: Backend running on port 3000" -ForegroundColor Green
    Write-Host "   Patients: $($data.patients), Nurses: $($data.nurses), Alerts: $($data.alerts)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Manual Alert
Write-Host "2. Testing Manual Alert..." -ForegroundColor Yellow
$body = @{
    room = "305"
    event = "PATIENT_DISTRESS"
    transcript = "Testing"
    severity = "high"
    source = "test"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/alert" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    Write-Host "   SUCCESS: Manual alert created" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Visual Alert
Write-Host "3. Testing Visual Alert..." -ForegroundColor Yellow
$body = @{
    patientId = "PATIENT_001"
    roomNumber = "305"
    condition = "CHOKING"
    confidence = 0.92
    description = "Test"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/overshoot-alert" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    Write-Host "   SUCCESS: Visual alert created" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get Alerts
Write-Host "4. Retrieving Alerts..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/alerts" -Method Get
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   SUCCESS: Retrieved $($data.alerts.Count) alerts" -ForegroundColor Green
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "TESTING COMPLETE!" -ForegroundColor Green
Write-Host "Visit http://localhost:5173 to see alerts on dashboard" -ForegroundColor Cyan
