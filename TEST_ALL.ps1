# Comprehensive Local Testing Script
# Run these commands in Terminal 3 to test all functionality

## 1. CHECK BACKEND HEALTH
echo "=== TESTING BACKEND HEALTH ==="
$response = curl -s http://localhost:3000/health
Write-Host "Backend health check:"
Write-Host $response
Write-Host ""

## 2. TEST MANUAL ALERT
echo "=== TESTING MANUAL ALERT ==="
$alertData = @{
    room = "305"
    event = "PATIENT_DISTRESS"
    transcript = "Patient calling for help"
    severity = "high"
    source = "test"
} | ConvertTo-Json

$response = curl -s -X POST http://localhost:3000/alert `
    -H "Content-Type: application/json" `
    -d $alertData
    
Write-Host "Manual alert response:"
Write-Host $response
Write-Host ""

## 3. TEST VISUAL ALERT ENDPOINT
echo "=== TESTING VISUAL ALERT ==="
$visualData = @{
    patientId = "PATIENT_001"
    roomNumber = "305"
    condition = "CHOKING"
    confidence = 0.92
    description = "Patient clutching throat, unable to speak"
} | ConvertTo-Json

$response = curl -s -X POST http://localhost:3000/api/overshoot-alert `
    -H "Content-Type: application/json" `
    -d $visualData
    
Write-Host "Visual alert response:"
Write-Host $response
Write-Host ""

## 4. GET ALL ALERTS
echo "=== RETRIEVING ALL ALERTS ==="
$response = curl -s http://localhost:3000/api/alerts
Write-Host "Recent alerts:"
Write-Host $response | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

## 5. TEST VOICE ALERT ENDPOINT
echo "=== TESTING VOICE ALERT ==="
$voiceData = @{
    room = "305"
    event = "VOICE_ALERT"
    transcript = "Help me I am falling"
    severity = "critical"
    source = "voice"
} | ConvertTo-Json

$response = curl -s -X POST http://localhost:3000/alert `
    -H "Content-Type: application/json" `
    -d $voiceData
    
Write-Host "Voice alert response:"
Write-Host $response
Write-Host ""

echo "=== ALL TESTS COMPLETED ==="
echo "✅ Check nurse dashboard at http://localhost:5173 for alerts"
echo "✅ All tests should show {'success': true} or alert objects"
