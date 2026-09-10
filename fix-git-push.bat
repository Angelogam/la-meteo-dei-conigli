@echo off
chcp 65001 >nul
title Fix Git Push - Rimuovi File Grandi

echo.
echo ========================================
echo   FIX GIT PUSH - Rimuovi file grandi
echo ========================================
echo.

REM [1/4] Aggiungi regole al .gitignore
echo [1/4] Aggiungo regole al .gitignore...
(
echo # Large files - do not commit
echo *.msi
echo *.exe
echo *.apk
echo *.dmg
echo *.pkg
echo android/jdk*
echo android/app/build/**
) >> .gitignore
git add .gitignore
echo OK
echo.

REM [2/4] Rimuovi file dalla cache git
echo [2/4] Rimuovo file dalla cache git...
git rm --cached android/jdk21.msi >nul 2>&1
git rm --cached OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi >nul 2>&1
git rm --cached "*.msi" >nul 2>&1
git rm --cached "MeteoDeiConigli-debug.apk" >nul 2>&1
git rm --cached "android\app\build\outputs\apk\debug\app-debug.apk" >nul 2>&1
echo OK
echo.

REM [3/4] Commit modifiche
echo [3/4] Commit modifiche...
git commit -m "Fix: rimuovi file grandi (.msi, .apk) dal repository" >nul 2>&1
if errorlevel 1 (
    echo Nessuna modifica da committare
) else (
    echo Commit creato
)
echo.

REM [4/4] Rimuovi dalla storia git (se necessario)
echo [4/4] Rimuovo dalla storia git...
echo.
echo Questo passo potrebbe richiedere alcuni minuti...
echo.

REM Prova prima un push normale
git push origin main >nul 2>&1
if errorlevel 0 (
    echo Push riuscito!
    goto :success
)

echo Push fallito, riscrivo la storia git...
echo.

REM Usa git filter-branch per rimuovere i file dalla storia
git filter-branch --force --index-filter ^
    "git rm --cached --ignore-unmatch *.msi OpenJDK*.msi android/jdk* MeteoDeiConigli-debug.apk 2>nul" ^
    --prune-empty --tag-name-filter cat -- --all 2>nul

if errorlevel 1 (
    echo [WARN] filter-branch non riuscito, provo metodo alternativo...
    git filter-branch --force --tree-filter ^
        "rm -f *.msi OpenJDK*.msi android/jdk* MeteoDeiConigli-debug.apk 2>nul" ^
        --prune-empty --tag-name-filter cat -- --all 2>nul
)

REM Pulizia reflog
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo.
echo Push forzato su GitHub...
echo.
git push --force origin main
if errorlevel 1 (
    echo.
    echo ERRORE: ancora problemi con il push.
    echo.
    echo Errori precedenti:
    echo   - File OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi (171 MB)
    echo.
    echo Verifica che il file non esista piu':
    echo   dir /s *.msi
    echo.
    echo Se esiste, elimina manualmente la cartella che lo contiene.
    pause
    exit /b 1
)

:success
echo.
echo ========================================
echo   SUCCESSO! Repository aggiornato!
echo ========================================
echo.
pause
