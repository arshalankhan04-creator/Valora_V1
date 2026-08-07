@echo off
title Valora - Stopping...
echo.
echo  Stopping Valora services...
echo.

:: Kill Node processes on port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000"') do taskkill /F /PID %%a >nul 2>&1

:: Kill Django on port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000"') do taskkill /F /PID %%a >nul 2>&1

:: Kill Vite on port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173"') do taskkill /F /PID %%a >nul 2>&1

:: Close the terminal windows by title
taskkill /F /FI "WINDOWTITLE eq Valora - Django ML*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Valora - Node Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Valora - React Client*" >nul 2>&1

echo  All Valora services stopped.
timeout /t 2 /nobreak >nul
exit
