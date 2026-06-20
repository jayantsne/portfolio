$password = '<DEPLOY_SSH_PASSWORD>'
$server = '76.13.244.113'
$user = 'root'

Write-Host "=== Checking Server Status ===" -ForegroundColor Cyan
Write-Host "Password will be used automatically`n" -ForegroundColor Green

# Create a comprehensive bash script to run all checks
$bashScript = @'
#!/bin/bash
echo "=== SERVICE STATUS ==="
systemctl status ailearnapi.service --no-pager | head -20
echo -e "\n=== NGINX STATUS ==="
systemctl status nginx --no-pager | head -10
echo -e "\n=== MONGODB STATUS ==="
systemctl status mongod --no-pager | head -10
echo -e "\n=== RUNNING PROCESSES ==="
ps aux | grep -E 'dotnet|nginx|mongod' | grep -v grep
echo -e "\n=== BACKEND API TEST ==="
curl -I http://localhost:5000/api/health 2>&1 | head -10 || echo "API not responding"
echo -e "\n=== DEPLOYED FILES ==="
ls -lah /var/www/learnwithai.tech/ 2>&1
echo -e "\n=== BACKEND DLL FILES ==="
ls -la /var/www/learnwithai.tech/backend/*.dll 2>&1
echo -e "\n=== RECENT API LOGS ==="
journalctl -u ailearnapi.service -n 30 --no-pager
echo -e "\n=== NGINX ERROR LOGS ==="
tail -20 /var/log/nginx/learnwithai.tech_error.log 2>&1|| echo "No nginx errors"
echo -e "\n=== PORT LISTENERS ==="
netstat -tulpn | grep -E ':(80|443|5000|27017)'
'@

# Use plink if available, otherwise use standard ssh with sshpass approach
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue

if ($plinkPath) {
    Write-Host "Using plink..." -ForegroundColor Yellow
    $bashScript | plink -ssh -batch -pw "$password" "$user@$server" "bash -s"
} else {
    Write-Host "Using ssh (you may need to enter password)..." -ForegroundColor Yellow
    # Try to use ssh with expect-like behavior via cmd
    $tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
    $bashScript | Out-File -Encoding ASCII -FilePath $tempScript
    
    # Create an expect-like batch file
    $batFile = [System.IO.Path]::GetTempFileName() + ".bat"
    @"
@echo off
ssh -o StrictHostKeyChecking=no $user@$server "bash -s" < $tempScript
"@ | Out-File -Encoding ASCII -FilePath $batFile
    
    # Try with ssh key or password prompt
    Write-Host "Connecting to $server..." -ForegroundColor Cyan
    $bashScript | ssh -o StrictHostKeyChecking=no "$user@$server" "bash -s"
    
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    Remove-Item $batFile -ErrorAction SilentlyContinue
}
