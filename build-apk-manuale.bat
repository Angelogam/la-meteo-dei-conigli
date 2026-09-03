@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK (Manuale)

echo.
echo ============================================================
echo     METEO DEI CONIGLI - BUILD APK (Manuale)
echo ============================================================
echo.

echo Pulizia COMPLETA di cartelle Android e cache...
echo.

REM Forza chiusura processi che potrebbero bloccare i file
taskkill /F /IM java.exe 2>nul
taskkill /F /IM gradle.exe 2>nul

REM Rimozione AGGRESSIVA cartella android (in tutte le posizioni possibili)
if exist "android" (
    echo Rimuovo android\...
    attrib -r -h -s "android" /S /D 2>nul
    rd /s /q "android" 2>nul
)
if exist ".\android" (
    echo Rimuovo .\android\...
    rd /s /q ".\android" 2>nul
)
if exist "C:\Users\avven\dyad-apps\la-meteo-dei-conigli\android" (
    echo Rimuovo percorso assoluto...
    rd /s /q "C:\Users\avven\dyad-apps\la-meteo-dei-conigli\android" 2>nul
)

REM Verifica finale
if exist "android" (
    echo.
    echo ERRORE: impossibile eliminare la cartella android!
    echo Prova a:
    echo   1. Chiudere VS Code / Esplora File
    echo   2. Apri CMD come Amministratore
    echo   3. Esegui: rd /s /q "C:\Users\avven\dyad-apps\la-meteo-dei-conigli\android"
    pause
    exit /b 1
)

echo OK cartella android rimossa!
echo.

echo [1/6] Pulizia cache e build precedenti...
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

echo [5/6] Aggiungo Android...
call npx cap add android
if errorlevel 1 (
    echo ERRORE: cap add android fallito!
    echo La cartella android potrebbe essere bloccata da un altro processo.
    pause
    exit /b 1
)
echo OK
echo.

echo [5b/6] Sincronizzo...
call npx cap sync android
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
