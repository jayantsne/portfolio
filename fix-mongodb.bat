@echo off
REM MongoDB Service Fix Script for Windows
REM Server: 76.13.244.113
REM This script will guide you through fixing MongoDB

echo.
echo ===================================================
echo   MongoDB Service Fix for learnwithai.tech
echo ===================================================
echo.
echo Server: 76.13.244.113
echo User: root
echo Password: <DEPLOY_SSH_PASSWORD>
echo.
echo INSTRUCTIONS:
echo 1. This will open an SSH connection to your server
echo 2. Enter the password when prompted: <DEPLOY_SSH_PASSWORD>
echo 3. Then copy and paste the commands below
echo.
pause

REM Open SSH connection
echo.
echo Opening SSH connection...
echo.
ssh root@76.13.244.113

echo.
echo Connection closed.
pause
