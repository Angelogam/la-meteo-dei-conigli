# scripts/Test-MeteoAPI.ps1
# Test locale dell'endpoint API Meteo.
# Sostituisci $Url con l'endpoint reale quando sarà pronto.
param(
    [string]$Url = "http://localhost:3000/api/meteo/test"
)

Write-Host "Chiamata a: $Url" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10

    Write-Host "`n--- RISPOSTA JSON ---" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5 | Write-Host

    $ok = $true

    if ($null -eq $response.temperature) {
        Write-Host "✗ MANCANTE: temperature" -ForegroundColor Red
        $ok = $false
    }
    if ($null -eq $response.wind_speed) {
        Write-Host "✗ MANCANTE: wind_speed" -ForegroundColor Red
        $ok = $false
    }
    if ($null -eq $response.gusts) {
        Write-Host "✗ MANCANTE: gusts" -ForegroundColor Red
        $ok = $false
    }

    if ($ok) {
        Write-Host "`n✓ OK: tutti i campi richiesti (temperature, wind_speed, gusts) sono presenti." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n✗ ERRORE: campi obbligatori mancanti." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "`n✗ ERRORE DI RETE: $_" -ForegroundColor Red
    exit 1
}