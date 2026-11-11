@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK

echo.
echo ========================================
echo   METEO DEI CONIGLI - BUILD APK
echo ========================================
echo.

REM [1/4] Genera icone
echo [1/4] Generazione icone...
call npm run generate-android-icons
if errorlevel 1 (
    echo ERRORE generazione icone!
    pause
    exit /b 1
)
echo OK
echo.

REM [2/4] Pulizia Gradle
echo [2/4] Pulizia cache...
cd android
if exist "gradlew.bat" (
    call gradlew.bat clean
) else (
    call ./gradlew clean
)
cd ..
echo OK
echo.

REM [3/4] Sincronizza
echo [3/4] Sincronizzazione Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ERRORE sync!
    pause
    exit /b 1
)
echo OK
echo.

REM [4/4] Build APK
echo [4/4] Build APK (attendi 10-15 minuti)...
cd android
if exist "gradlew.bat" (
    call gradlew.bat assembleDebug --no-daemon
) else (
    call ./gradlew assembleDebug --no-daemon
)
cd ..
echo OK
echo.

REM Verifica
echo ========================================
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESSO! APK creata!
    echo.
    echo File: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo PASSI SEGUENTI:
    echo   1. Apri Esplora File
    echo   2. Vai a: android\app\build\outputs\apk\debug\
    echo   3. Copia il file app-debug.apk sul telefono
    echo      (via USB, WhatsApp, email, Google Drive...)
    echo   4. Sul telefono: disinstalla la vecchia app
    echo   5. Installa il nuovo APK
    echo ========================================
) else (
    echo ERRORE: APK non trovata!
)
echo.

pause
