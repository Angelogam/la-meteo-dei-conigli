@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK

echo.
echo ============================================================
echo     METEO DEI CONIGLI - BUILD APK
echo ============================================================
echo.

REM 1. Pulisci cartelle vecchie
echo [1/7] Pulisco cartelle vecchie...
if exist android (
    echo     - Rimuovo android\ (con contenuto)
    rmdir /s /q android
    if exist android (
        echo     ERRORE: impossibile rimuovere android\
        echo     Provo a chiudere processi...
        taskkill /F /IM gradle.exe 2>nul
        taskkill /F /IM java.exe 2>nul
        timeout /t 3 /nobreak >nul
        rmdir /s /q android
    )
)
if exist dist (
    echo     - Rimuovo dist\
    rmdir /s /q dist 2>nul
)
if exist node_modules (
    echo     - Rimuovo node_modules\
    rmdir /s /q node_modules 2>nul
)
if exist package-lock.json (
    echo     - Rimuovo package-lock.json
    del /f package-lock.json 2>nul
)
echo OK - Pulizia completata

REM 2. Installa dipendenze npm
echo.
echo [2/7] Installo dipendenze npm (con legacy-peer-deps)...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERRORE: npm install fallito!
    pause
    exit /b 1
)
echo OK - Dipendenze installate

REM 3. Genera icone
echo.
echo [3/7] Genero icone...
call npm run generate-icons
echo OK - Icone generate

REM 4. Build web app
echo.
echo [4/7] Build web app...
call npm run build
if errorlevel 1 (
    echo ERRORE: build fallito!
    pause
    exit /b 1
)
echo OK - Web app costruita

REM 5. Aggiungi Android
echo.
echo [5/7] Aggiungo Android...
if exist android (
    echo     ATTENZIONE: android esiste ancora, lo rimuovo...
    rmdir /s /q android
    timeout /t 2 /nobreak >nul
)
call npx cap add android
if errorlevel 1 (
    echo ERRORE: cap add android fallito!
    pause
    exit /b 1
)
echo OK - Android aggiunto

REM 6. Sincronizza
echo.
echo [6/7] Sincronizzo...
call npx cap sync android
echo OK - Sincronizzato

REM 7. Build APK
echo.
echo [7/7] Build APK...
cd android
call gradlew assembleDebug
cd ..

REM Verifica APK
echo.
echo ============================================================
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESSO! APK CREATA!
    echo.
    echo File APK:
    echo android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Copia questo file sul telefono e installalo!
) else (
    echo ERRORE: APK non trovata!
    echo Controlla i messaggi di errore sopra.
)
echo ============================================================
echo.

pause
