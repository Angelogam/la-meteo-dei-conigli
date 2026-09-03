@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK

echo.
echo ============================================================
echo     METEO DEI CONIGLI - BUILD APK
echo ============================================================
echo.

echo [1/6] Pulizia cache precedenti...
if exist "dist" rd /s /q "dist" 2>nul
if exist "node_modules\.cache" rd /s /q "node_modules\.cache" 2>nul
if exist ".vite" rd /s /q ".vite" 2>nul
if exist ".capacitor" rd /s /q ".capacitor" 2>nul
echo OK
echo.

echo [2/6] Installo dipendenze npm...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERRORE: npm install fallito!
    pause
    exit /b 1
)
echo OK
echo.

echo [3/6] Genero icone...
call npm run generate-icons
if errorlevel 1 (
    echo ERRORE: generazione icone fallita!
    pause
    exit /b 1
)
echo OK
echo.

echo [4/6] Build web app...
call npm run build
if errorlevel 1 (
    echo ERRORE: build fallito!
    pause
    exit /b 1
)
echo OK
echo.

echo [5/6] Preparo Android...
if exist "android" (
    echo La cartella android esiste, sincronizzo...
    call npx cap sync android
) else (
    echo Creo la cartella android...
    call npx cap add android
)
echo OK
echo.

echo [6/6] Build APK (richiede 5-10 minuti)...
cd android
call gradlew assembleDebug --no-daemon
if errorlevel 1 (
    cd ..
    echo ERRORE: Build APK fallito!
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================================
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESSO! APK CREATA!
    echo.
    echo File: android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo ERRORE: APK non trovata!
)
echo ============================================================
echo.
pause
