@echo off
title QuantumXD Store - Dev Servers
echo ===================================================
echo   QUANTUMXD DIGITAL STORE - STARTING SYSTEM
echo ===================================================
echo.
echo Starting Backend API (Port 5000)...
start "QuantumXD Backend" cmd /k "cd /d %~dp0backend && set PATH=C:\Users\Pradip - hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\Pradip - hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;%%PATH%% && pnpm dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend Web App (Port 3000)...
start "QuantumXD Frontend" cmd /k "cd /d %~dp0frontend && set PATH=C:\Users\Pradip - hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\Pradip - hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;%%PATH%% && pnpm dev"

echo.
echo ===================================================
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:5000
echo  Admin:    http://localhost:3000/admin
echo ===================================================
pause
