@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK (Manuale)

echo.
echo ============================================================
echo     METEO DEI CONIGLI - BUILD APK (Manuale)
echo ============================================================
echo.

echo IMPORTANTE: prima di continuare devi eliminare manualmente
echo la cartella android\ dal progetto.
echo.
echo Procedura:
echo   1. Apri Esplora File
echo   2. Vai in: C:\Users\avven\dyad-apps\la-meteo-dei-conigli\
echo   3. Click destro su "android" - Elimina
echo   4. Se non si elimina, riavvia il PC
echo.
set /p CONFERMA="Hai eliminato la cartella android\ ? (s/n): "
if /i not "%CONFERMA%"=="s" (
    echo.
    echo Operazione annullata. Elimina la cartella e riprova.
    pause
    exit /b 0
)

REM Verifica eliminazione
if exist android (
    echo.
    echo ERRORE: la cartella android\ esiste ancora!
    echo Eliminarla manualmente e riprovare.
    pause
    exit /b 1
)

echo.
echo [1/6] Pulizia altre cartelle...
if exist dist rmdir /s /q dist 2>nul
if exist node_modules rmdir /s /q node_modules 2>nul
if exist package-lock.json del /f package-lock.json 2>nul
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
    pause
    exit /b 1
)
call npx cap sync android
echo OK

echo.
echo [6/6] Build APK...
cd android
call gradlew assembleDebug
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
