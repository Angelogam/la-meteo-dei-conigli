@echo off
chcp 65001 >nul
title Fix Git Push

echo.
echo ========================================
echo   FIX GIT PUSH - Rimuovi file grandi
echo ========================================
echo.

REM Rimuovi file .msi dalla cache git
echo [1/3] Rimuovo file grandi dalla cache git...
git rm --cached android/jdk21.msi 2>nul
git rm --cached *.msi 2>nul
git rm --cached OpenJDK*.msi 2>nul
echo OK
echo.

REM Rimuovi APK dalla cache
echo [2/3] Rimuovo APK dalla cache git...
git rm --cached MeteoDeiConigli-debug.apk 2>nul
git rm --cached android\app\build\outputs\apk\debug\app-debug.apk 2>nul
echo OK
echo.

REM Commit delle modifiche
echo [3/3] Commit delle modifiche...
git add .gitignore
git commit -m "Fix: rimuovi file grandi (.msi, .apk) dal repository" 2>nul
if errorlevel 1 (
    echo Nessun cambiamento da committare
)
echo OK
echo.

echo ========================================
echo   Fatto! Ora esegui:
echo.
echo   git push origin main
echo ========================================
echo.

pause
