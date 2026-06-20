@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   MONGODB FIX - Automated Execution
echo ============================================================
echo.
echo This script will fix MongoDB on your server: 76.13.244.113
echo.
echo Server credentials:
echo   Host: 76.13.244.113
echo   User: root  
echo   Password: <DEPLOY_SSH_PASSWORD>
echo.
echo ============================================================
echo.

REM Create temporary commands file
set TEMP_COMMANDS=%TEMP%\mongodb-fix-commands.txt
echo Creating commands file...

(
echo systemctl stop mongod
echo sleep 2
echo pkill -9 mongod 2^>^/dev^/null
echo fuser -k 27017^/tcp 2^>^/dev^/null
echo chown -R mongodb:mongodb ^/var^/lib^/mongodb ^/var^/log^/mongodb
echo chmod 755 ^/var^/lib^/mongodb
echo chmod 644 ^/etc^/mongod.conf
echo cp ^/etc^/mongod.conf ^/etc^/mongod.conf.backup
echo sed -i 's^/bindIp: .*^/bindIp: 127.0.0.1^/' ^/etc^/mongod.conf
echo if ! grep -q "authorization: enabled" ^/etc^/mongod.conf; then
echo   if grep -q "^^security:" ^/etc^/mongod.conf; then
echo     sed -i '^/^^security:^/a\  authorization: enabled' ^/etc^/mongod.conf
echo   else
echo     echo -e "\nsecurity:\n  authorization: enabled" ^>^> ^/etc^/mongod.conf
echo   fi
echo fi
echo systemctl start mongod
echo systemctl enable mongod
echo sleep 3
echo echo "=============== MongoDB Status ==============="
echo systemctl status mongod --no-pager ^| head -n 15
echo echo ""
echo echo "=============== Testing Connection ==============="
echo mongosh --username jbadmin --password '<MONGODB_PASSWORD>' --authenticationDatabase admin --eval "db.adminCommand('ping'^)" ^|^| mongo --username jbadmin --password '<MONGODB_PASSWORD>' --authenticationDatabase admin --eval "db.adminCommand('ping'^)"
) > %TEMP_COMMANDS%

echo Commands file created: %TEMP_COMMANDS%
echo.
echo ============================================================
echo   STEP 1: Press any key to open SSH connection...
echo ============================================================
pause >nul

echo.
echo Connecting to server...
echo When prompted for password, enter: <DEPLOY_SSH_PASSWORD>
echo.
echo After connecting successfully, the fix commands will run automatically.
echo.
timeout /t 3 >nul

REM Try to upload and execute the commands
echo Uploading commands to server...
type %TEMP_COMMANDS% | ssh root@76.13.244.113 "cat > /tmp/fix-mongodb.sh && chmod +x /tmp/fix-mongodb.sh && bash /tmp/fix-mongodb.sh"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   SUCCESS! MongoDB has been fixed.
    echo ============================================================
    echo.
    echo Next steps:
    echo   1. Upload updated service file
    echo   2. Restart API service
    echo.
) else (
    echo.
    echo ============================================================
    echo   Connection Method 1 failed. Trying alternative...
    echo ============================================================
    echo.
    echo Opening interactive SSH session...
    echo.
    echo INSTRUCTIONS:
    echo   1. Enter password when prompted: <DEPLOY_SSH_PASSWORD>
    echo   2. After connecting, run: bash /tmp/fix-mongodb.sh
    echo   3. Or paste the commands from: %TEMP_COMMANDS%
    echo.
    pause
    
    REM Open SSH normally
    ssh root@76.13.244.113
)

echo.
echo ============================================================
echo   Next: Upload Updated Service Configuration
echo ============================================================
echo.
echo Press any key to upload the updated systemd service file...
pause >nul

echo Uploading ailearnapi.service...
scp server-configs\systemd\ailearnapi.service root@76.13.244.113:/tmp/

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   Applying Configuration...
    echo ============================================================
    echo.
    
    ssh root@76.13.244.113 "cp /tmp/ailearnapi.service /etc/systemd/system/ailearnapi.service && chmod 644 /etc/systemd/system/ailearnapi.service && systemctl daemon-reload && systemctl restart ailearnapi && sleep 2 && systemctl status ailearnapi --no-pager | head -n 20"
    
    echo.
    echo ============================================================
    echo   COMPLETE! All services updated.
    echo ============================================================
    echo.
    echo MongoDB: Running with authentication
    echo API Service: Restarted with new config
    echo Website: https://learnwithai.tech
    echo.
) else (
    echo.
    echo Upload failed. Please run manually:
    echo   scp server-configs\systemd\ailearnapi.service root@76.13.244.113:/tmp/
    echo.
)

echo.
echo Press any key to exit...
pause >nul
