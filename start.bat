@echo off
echo =======================================================
echo Starting E-Commerce Deep Learning Microservices...
echo =======================================================

echo [1/2] Starting FastAPI Backend on Port 8000...
start "FastAPI Backend" cmd /k ".\venv\Scripts\uvicorn api:app --port 8000"

:: Wait 3 seconds to give the API time to wake up
timeout /t 3 /nobreak > NUL

echo [2/2] Starting Next.js Dashboard...
cd frontend && start "Next.js Dashboard" cmd /k "npm run dev"

echo =======================================================
echo Success! Both windows are now running. 
echo Open http://localhost:3000 in your browser!
echo =======================================================
pause
