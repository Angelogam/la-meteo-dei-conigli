@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK

echo.
echo ============================================================
echo     METEO DEI CONIGLI - BUILD APK
echo ============================================================
echo.

REM Verifica che la cartella android esista
if not exist "android" (
    echo ERRORE: la cartella android NON esiste!
    echo Devi prima crearla manualmente. Apri il terminale come Amministratore:
    echo   cd C:\Users\avven\dyad-apps\la-meteo-dei-conigli
    echo   npx cap add android
    pause
    exit /b 1
)

echo [1/5] Pulizia cache...
if exist "dist" rd /s /q "dist" 2>nul
if exist "node_modules\.cache" rd /s /q "node_modules\.cache" 2>nul
echo OK
echo.

echo [2/5] Build web app...
call npm run build
if errorlevel 1 (
    echo ERRORE: build fallito!
    pause
    exit /b 1
)
echo OK
echo.

echo [3/5] Sincronizzo Android...
call npx cap sync android
if errorlevel 1 (
    echo ERRORE: cap sync fallito!
    pause
    exit /b 1
)
echo OK
echo.

echo [4/5] Build APK (10-15 minuti)...
cd android
call gradlew.bat assembleDebug --no-daemon
if errorlevel 1 (
    cd ..
    echo ERRORE: Build APK fallito!
    pause
    exit /b 1
)
cd ..
echo OK
echo.

echo [5/5] Verifica...
echo ============================================================
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESSO! APK CREATA!
    echo File: android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo ERRORE: APK non trovata!
)
echo ============================================================
pause
