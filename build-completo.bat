@echo off
chcp 65001 >nul
title Meteo dei Conigli - Build APK Completo
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo     METEO DEI CONIGLI - BUILD APK COMPLETO
echo ============================================================
echo.

REM ═══════════════════════════════════════════════════════════
REM  PASSO 1: Generazione icone personalizzate
REM ═══════════════════════════════════════════════════════════
echo [1/4] Generazione icone personalizzate...
call npm run generate-android-icons
if errorlevel 1 (
    echo ERRORE: generazione icone fallita!
    pause
    exit /b 1
)
echo OK - Icone generate
echo.

REM ═══════════════════════════════════════════════════════════
REM  PASSO 2: Clean build di Gradle
REM ═══════════════════════════════════════════════════════════
echo [2/4] Pulizia cache build (Gradle clean)...
if not exist "android" (
    echo ERRORE: cartella android non trovata!
    pause
    exit /b 1
)
cd android
if exist "gradlew.bat" (
    call gradlew.bat clean
) else (
    call ./gradlew clean
)
if errorlevel 1 (
    cd ..
    echo ERRORE: Gradle clean fallito!
    pause
    exit /b 1
)
cd ..
echo OK - Cache pulita
echo.

REM ═══════════════════════════════════════════════════════════
REM  PASSO 3: Sincronizzazione Capacitor
REM ═══════════════════════════════════════════════════════════
echo [3/4] Sincronizzazione Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ERRORE: cap sync fallito!
    pause
    exit /b 1
)
echo OK - Sincronizzato
echo.

REM ═══════════════════════════════════════════════════════════
REM  PASSO 4: Build APK
REM ═══════════════════════════════════════════════════════════
echo [4/4] Build APK (10-15 minuti)...
cd android
if exist "gradlew.bat" (
    call gradlew.bat assembleDebug --no-daemon
) else (
    call ./gradlew assembleDebug --no-daemon
)
if errorlevel 1 (
    cd ..
    echo ERRORE: build APK fallito!
    pause
    exit /b 1
)
cd ..
echo OK - APK costruito
echo.

REM ═══════════════════════════════════════════════════════════
REM  VERIFICA RISULTATO
REM ═══════════════════════════════════════════════════════════
echo ============================================================
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo SUCCESSO! APK CREATA!
    echo.
    echo File: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Passa questo file al telefono e installalo!
    echo.
    echo ============================================================
    echo  INFO ICONA:
    echo  - L'icona dell'APK ora mostra il coniglio con parapendio
    echo  - Se vedi ancora l'icona blu default, disinstalla la
    echo    versione vecchia dal telefono prima di installare
    echo    il nuovo APK.
    echo ============================================================
) else (
    echo ERRORE: APK non trovata!
    echo Controlla i messaggi di errore sopra.
)
echo ============================================================
echo.

pause
