@echo off
chcp 65001 >nul
title 🐰 Meteo dei Conigli - Build APK

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          🐰 METEO DEI CONIGLI - BUILD APK 🐰               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM ============================================================
REM 1. Verifica che npm sia disponibile
REM ============================================================
echo [1/7] Verifica npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRORE: npm non trovato! Installa Node.js da https://nodejs.org
    pause
    exit /b 1
)
echo ✅ npm trovato

REM ============================================================
REM 2. Pulisci cartelle vecchie
REM ============================================================
echo.
echo [2/7] Pulisci cartelle vecchie...
if exist android (
    echo    - Rimuovo cartella android\...
    rmdir /s /q android
)
if exist dist (
    echo    - Rimuovo cartella dist\...
    rmdir /s /q dist
)
echo ✅ Pulizia completata

REM ============================================================
REM 3. Installa dipendenze npm
REM ============================================================
echo.
echo [3/7] Installo dipendenze npm...
call npm install
if errorlevel 1 (
    echo ❌ ERRORE: npm install fallito!
    pause
    exit /b 1
)
echo ✅ Dipendenze installate

REM ============================================================
REM 4. Genera icone
REM ============================================================
echo.
echo [4/7] Genero icone...
call npm run generate-icons
if errorlevel 1 (
    echo ⚠️ ATTENZIONE: generate-icons potrebbe aver fallito (continuo...)
)
echo ✅ Icone generate

REM ============================================================
REM 5. Build web app
REM ============================================================
echo.
echo [5/7] Build web app (npm run build)...
call npm run build
if errorlevel 1 (
    echo ❌ ERRORE: build fallito!
    pause
    exit /b 1
)
echo ✅ Web app costruita

REM ============================================================
REM 6. Aggiungi Android e sincronizza
REM ============================================================
echo.
echo [6/7] Aggiungo Android e sincronizzo...
call npx cap add android
if errorlevel 1 (
    echo ❌ ERRORE: cap add android fallito!
    pause
    exit /b 1
)

call npx cap sync android
if errorlevel 1 (
    echo ⚠️ ATTENZIONE: cap sync potrebbe aver avuto problemi (continuo...)
)
echo ✅ Android aggiunto e sincronizzato

REM ============================================================
REM 7. Build APK
REM ============================================================
echo.
echo [7/7] Build APK Android...
cd android
call gradlew assembleDebug
cd ..

REM ============================================================
REM Verifica APK
REM ============================================================
echo.
echo ═══════════════════════════════════════════════════════════════
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅✅✅ APK CREATA CON SUCCESSO! ✅✅✅
    echo.
    echo 📱 File APK:
    echo    android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo 💡 Copia questo file sul telefono e installalo!
) else (
    echo ❌ ERRORE: APK non trovata!
    echo    Controlla i messaggi di errore sopra.
)
echo ═══════════════════════════════════════════════════════════════
echo.

pause
