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
echo NOTE: Auto-reload is disabled to prevent restart loops
echo.

python -c "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=False)"
