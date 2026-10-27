@echo off
chcp 65001 >nul
title Fix Git Push - Rimuovi File Grandi dalla Storia

echo.
echo ========================================
echo   FIX GIT HISTORY - Rimuovi file grandi
echo   ATTENZIONE: Riscrivera tutta la storia
echo ========================================
echo.

REM [1/4] Verifica presenza file nella storia
echo [1/4] Verifico se il file e' nella storia git...
git log --all --full-history -- "*OpenJDK*.msi" --oneline > nul 2>&1
if errorlevel 1 (
    echo [INFO] File non trovato nella storia, provo rimozione normale...
    goto :rimuovi_normal
) else (
    echo [INFO] File trovato nella storia, uso filter-branch...
)
echo.

REM [2/4] Rimuovi dalla storia con filter-branch
echo [2/4] Rimozione dalla storia git (attendere)...
echo Questo passo richiede alcuni minuti...
echo.

REM Usa git filter-branch per rimuovere il file da TUTTA la storia
git filter-branch --force --index-filter ^
    "git rm --cached --ignore-unmatch OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi android/jdk21.msi *.msi MeteoDeiConigli-debug.apk 2>nul" ^
    --prune-empty --tag-name-filter cat -- --all

if errorlevel 1 (
    echo [WARN] Primo tentativo fallito, provo con tree-filter...
    git filter-branch --force --tree-filter ^
        "if exist OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi del OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi 2>nul" ^
        "if exist android\jdk21.msi del android\jdk21.msi 2>nul" ^
        "if exist *.msi del *.msi 2>nul" ^
        --prune-empty --tag-name-filter cat -- --all
)
echo OK
echo.

REM [3/4] Pulizia completa
echo [3/4] Pulizia reflog e cache...
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo OK
echo.

REM [4/4] Rimuovi file residui
echo [4/4] Rimuovo file fisici dal progetto...
if exist "OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi" (
    del "OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi"
    echo Rimosso: OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi
)
if exist "android\jdk21.msi" (
    del "android\jdk21.msi"
    echo Rimosso: android\jdk21.msi
)
echo OK
echo.

REM Aggiorno .gitignore
echo Aggiungo regole al .gitignore...
(
echo.
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
git commit -m "Fix: aggiorna .gitignore per file grandi" >nul 2>&1
echo OK
echo.

echo ========================================
echo   STORIA GIT AGGIORNATA!
echo ========================================
echo.
echo Ora esegui manualmente:
echo.
echo   git push --force origin main
echo.
echo Premi INVIO per uscire...
pause >nul

exit /b 0

:rimuovi_normal
echo.
echo [2/4] Rimuovo dalla cache git...
git rm --cached OpenJDK21U-jdk_x64_windows_hotspot_21.0.11_10.msi >nul 2>&1
git rm --cached android\jdk21.msi >nul 2>&1
git rm --cached "*.msi" >nul 2>&1
git rm --cached "MeteoDeiConigli-debug.apk" >nul 2>&1
echo OK
echo.

echo [3/4] Commit modifiche...
git commit -m "Fix: rimuovi file grandi dal repository" >nul 2>&1
echo OK
echo.

echo [4/4] Push su GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo ERRORE: push fallito.
    echo Esegui manualmente: git push --force origin main
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESSO! Repository aggiornato!
echo ========================================
echo.
pause
