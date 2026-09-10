@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK

echo.
echo ============================================================
echo     METEO DEI CONIGLI - BUILD APK
echo ============================================================
echo.

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

echo [3/5] Preparo Android...
if not exist "android" (
    echo Creo cartella android...
    call npx cap add android
) else (
    echo Android esiste, sincronizzo...
    call npx cap sync android
)
if errorlevel 1 (
    echo ERRORE!
    pause
    exit /b 1
)
echo OK

REM 3.5 Genera icone personalizzate
echo.
echo [3.5/5] Genero icone personalizzate...
call npm run generate-android-icons
if errorlevel 1 (
    echo ERRORE generazione icone!
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

echo [5/5] Fatto!
echo ============================================================
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESSO! APK: android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo ERRORE: APK non trovata!
)
echo ============================================================
pause
