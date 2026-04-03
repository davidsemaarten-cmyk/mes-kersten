@echo off
echo ================================================
echo Starting MES Kersten Backend Server
echo ================================================
echo.

cd /d "D:\Projecten\Web Development\mes-kersten\backend"

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
echo NOTE: Auto-reload is active (DEBUG=true in .env)
echo       Server herstart automatisch bij codewijzigingen.
echo.

python main.py
