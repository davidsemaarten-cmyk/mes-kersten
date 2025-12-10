@echo off
echo ================================================
echo Starting MES Kersten Development Servers
echo ================================================
echo.
echo Starting Backend and Frontend in separate windows...
echo.

cd /d "D:\Projecten\Web Development\mes-kersten"

echo Starting Backend Server...
start "MES Backend" cmd /k start-backend.bat

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "MES Frontend" cmd /k start-frontend.bat

echo.
echo ================================================
echo Both servers are starting in separate windows
echo ================================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Close this window or press any key to continue...
pause > nul
