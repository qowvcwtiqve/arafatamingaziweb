@echo off
color 0A
echo ===================================================
echo         TELEGRAM BOT 1-CLICK AUTO UPDATER
echo ===================================================
echo.

:: Ensure the script runs in the directory where the batch file is located
cd /d "%~dp0"

echo [1/4] Pushing code to GitHub Repository...
git add .
git commit -m "Auto Update from 1-Click script"
git push origin main
echo.

echo [2/4] Connecting to VPS and stopping old processes...
ssh -n -o StrictHostKeyChecking=no root@162.0.211.112 "pkill -9 -f manager.py; pkill -9 -f main.py; pkill -9 -f admin.py; screen -wipe; exit 0"
echo.

echo [3/4] Uploading new Python code files to the VPS...
scp -o StrictHostKeyChecking=no admin.py main.py manager.py qr.jpg requirements.txt root@162.0.211.112:~/telegram_bot/
echo.

echo [4/4] Starting the new Bot in the background on VPS...
ssh -n -o StrictHostKeyChecking=no root@162.0.211.112 "screen -wipe; screen -d -m -S bot bash -c 'cd ~/telegram_bot && ( [ -d venv ] || python3 -m venv venv ) && source venv/bin/activate && pip install -r requirements.txt && python3 manager.py'"
echo.

echo ===================================================
echo     UPDATE SUCCESSFUL! NEW BOT IS NOW LIVE!
echo ===================================================
echo.
echo You can log into the VPS and run "screen -r bot" to view the live logs.
pause
