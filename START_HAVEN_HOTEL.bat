@echo off
title Haven Hotel Management System
color 0A
echo ========================================================
echo        Starting Haven Hotel Management System
echo ========================================================
echo.

:: 1. Check if MongoDB is running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MongoDB is already running.
) else (
    echo [*] Starting local MongoDB database engine...
    start "" "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "%~dp0Haven_Hotel_Complete_Project\data\db" --bind_ip 127.0.0.1 --port 27017
    timeout /t 3 >nul
)

:: 2. Launch in Browser
echo [*] Opening Customer Portal and Admin Dashboard in your browser...
start http://localhost:3000/
timeout /t 1 >nul
start http://localhost:3000/admin-login

:: 3. Start Node.js Server
echo [*] Starting Haven Hotel Server on http://localhost:3000 ...
cd /d "%~dp0Haven_Hotel_Complete_Project"
node server.js
pause
