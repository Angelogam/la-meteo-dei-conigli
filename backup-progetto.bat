@echo off
title Backup Meteo dei Conigli
echo.
echo ============================================================
echo     BACKUP AUTOMATICO - Meteo dei Conigli
echo ============================================================
echo.

REM Crea cartella backup con data/ora
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set BACKUP_DIR=backup-%mydate%-%mytime%

echo [1/3] Creo cartella backup: %BACKUP_DIR%...
mkdir "%BACKUP_DIR%" 2>nul

echo [2/3] Copio file di codice sorgente...
xcopy /E /I /Y src "%BACKUP_DIR%\src\" >nul 2>&1
xcopy /E /I /Y public "%BACKUP_DIR%\public\" >nul 2>&1
xcopy /E /I /Y android "%BACKUP_DIR%\android\" >nul 2>&1
xcopy /E /I /Y ios "%BACKUP_DIR%\ios\" >nul 2>&1
copy /Y package.json "%BACKUP_DIR%\" >nul 2>&1
copy /Y package-lock.json "%BACKUP_DIR%\" >nul 2>&1
copy /Y tsconfig*.json "%BACKUP_DIR%\" >nul 2>&1
copy /Y capacitor.config.json "%BACKUP_DIR%\" >nul 2>&1
copy /Y vite.config.ts "%BACKUP_DIR%\" >nul 2>&1
copy /Y index.html "%BACKUP_DIR%\" >nul 2>&1
copy /Y generate-icons.cjs "%BACKUP_DIR%\" >nul 2>&1
copy /Y generate-android-icons.cjs "%BACKUP_DIR%\" >nul 2>&1
copy /Y build-apk.bat "%BACKUP_DIR%\" >nul 2>&1
copy /Y build-apk-manuale.bat "%BACKUP_DIR%\" >nul 2>&1
echo OK
echo.

echo [3/3] Fatto!
echo.
echo Cartella backup creata: %BACKUP_DIR%
echo.
echo ============================================================
pause
