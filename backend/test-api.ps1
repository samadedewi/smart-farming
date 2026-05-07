$headers = @{ "Content-Type" = "application/json" }
$body = '{"ph":6.8,"nitrogen":130,"phosphorus":75,"kalium":90,"suhu":29.5,"kelembaban":68}'
$r1 = Invoke-RestMethod -Uri "http://localhost:3001/api/sensor" -Method POST -Headers $headers -Body $body
Write-Host "=== POST /api/sensor ===" -ForegroundColor Green
$r1 | ConvertTo-Json -Depth 5

$r2 = Invoke-RestMethod -Uri "http://localhost:3001/api/sensor" -Method POST -Headers $headers -Body '{"ph":5.2,"nitrogen":60,"phosphorus":40}'
Write-Host "`n=== POST /api/sensor (asam + NPK rendah) ===" -ForegroundColor Yellow
$r2 | ConvertTo-Json -Depth 5

$r3 = Invoke-RestMethod -Uri "http://localhost:3001/api/sensor" -Method POST -Headers $headers -Body '{"ph":"abc"}'
Write-Host "`n=== POST /api/sensor (validasi gagal) ===" -ForegroundColor Red
$r3 | ConvertTo-Json -Depth 5
