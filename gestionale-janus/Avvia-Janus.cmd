@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Installa Node.js 18 o successivo e riapri questa finestra.
 pause
 exit /b 1
)
node server.cjs
pause
