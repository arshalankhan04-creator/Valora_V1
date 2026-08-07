@echo off
title Valora - Starting...
echo.
echo  ==========================================
echo   VALORA - Starting all services
echo  ==========================================
echo.

:: Check MongoDB is running
sc query MongoDB | find "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo  [MongoDB] Starting service...
    net start MongoDB >nul 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo  [MongoDB] Already running
)

:: Django ML service
echo  [Django]  Running migrations...
cd /d %~dp0ml-service && python manage.py migrate --run-syncdb >nul 2>&1
echo  [Django]  Starting on http://localhost:8000
start "Valora - Django ML" cmd /k "cd /d %~dp0ml-service && python manage.py runserver 8000"

:: Node/Express server
echo  [Node]    Starting on http://localhost:5000
start "Valora - Node Server" cmd /k "cd /d %~dp0server && npm run dev"

:: React client — wait a moment so Node is up first
timeout /t 3 /nobreak >nul
echo  [React]   Starting on http://localhost:5173
start "Valora - React Client" cmd /k "cd /d %~dp0client && npm run dev"

:: Open browser after a few seconds
timeout /t 6 /nobreak >nul
echo.
echo  ==========================================
echo   All services started. Opening browser...
echo  ==========================================
start http://localhost:5173

exit
