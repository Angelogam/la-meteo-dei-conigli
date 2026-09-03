@echo off
chcp 65001 >nul
title Meteo dei Conigli - Refresh APK Veloce

echo.
echo ============================================================
echo   METEO DEI CONIGLI - REFRESH APK VELOCE
echo ============================================================
echo.

REM 1. Build web
echo [1/4] Build web app...
call npm run build
if errorlevel 1 (
    echo ERRORE: build fallito!
    pause
    exit /b 1
)
echo OK

REM 2. Sync Android
echo.
echo [2/4] Sync Android...
call npx cap sync android
if errorlevel 1 (
    echo ERRORE: cap sync fallito!
    pause
    exit /b 1
)
echo OK

REM 3. Pulisci build precedente
echo.
echo [3/4] Pulisco build precedente...
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    del /f "android\app\build\outputs\apk\debug\app-debug.apk" >nul 2>&1
)
echo OK

REM 4. Build APK
echo.
echo [4/4] Build APK...
cd android
call gradlew assembleDebug
cd ..

REM Verifica
echo.
echo ============================================================
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESSO! APK AGGIORNATA!
    echo.
    echo File APK:
    echo android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo ERRORE: APK non trovata!
)
echo ============================================================
echo.

pause
