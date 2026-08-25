@echo off
color 0B
echo ===================================================
echo       QUANTUMXD WEBSITE 1-CLICK AUTO UPDATER
echo ===================================================
echo.

:: Ensure the script runs in the directory where the batch file is located
cd /d "%~dp0"

echo [1/3] Pushing latest changes from PC to GitHub...
git add .
git commit -m "Auto update website from PC" >nul 2>&1
git push origin main
echo GitHub is now up to date!
echo.

echo [2/3] Connecting to VPS (162.0.211.112) and updating code...
ssh -o StrictHostKeyChecking=no root@162.0.211.112 "cd ~/web_app && git pull && cd backend && npm install && pm2 restart qxd-backend && cd ../frontend && npm install && npm run build && pm2 restart qxd-frontend && pm2 save"
echo.

echo ===================================================
echo     UPDATE SUCCESSFUL! WEBSITE IS LIVE & UPDATED!
echo ===================================================
echo.
echo View live PM2 status anytime with: ssh root@162.0.211.112 "pm2 status"
echo.
pause
