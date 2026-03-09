#!/usr/bin/env python3
"""
Check port conflicts and fix service configuration
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("🔍 Checking for port conflicts...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Check what's on port 5000
        print("\n📊 Port 5000 status:")
        stdin, stdout, stderr = ssh.exec_command("netstat -tulpn | grep :5000 || echo 'Port 5000 is free'")
        print(stdout.read().decode())
        
        # Check nginx configuration
        print("\n🌐 Checking nginx...")
        stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
        print(stdout.read().decode())
        
        # Get more detailed error logs
        print("\n📋 Recent error logs:")
        stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 50 --no-pager | grep -A5 'Exception'")
        logs = stdout.read().decode()
        if logs:
            print(logs)
        else:
            stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 50 --no-pager")
            print(stdout.read().decode())
        
        # Try running the app directly to see full error
        print("\n🧪 Testing direct execution (5 seconds)...")
        stdin, stdout, stderr = ssh.exec_command("cd /var/www/ai-learn-api && ASPNETCORE_URLS='http://0.0.0.0:5001' ./AILearnAPI.Api 2>&1 &")
        
        import time
        time.sleep(5)
        
        # Check if it started
        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5001/api/ai/ollama/health 2>&1")
        response = stdout.read().decode()
        print(f"Health check response: {response}")
        
        if "healthy" in response.lower() or "true" in response.lower():
            print("\n✅ API works on port 5001!")
            print("\n🔧 Updating service to use port 5001...")
            
            # Update service file
            service_content = """[Unit]
Description=AI Learn API - ASP.NET Core Backend with Ollama
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/ai-learn-api
ExecStart=/var/www/ai-learn-api/AILearnAPI.Api
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=ailearn-api
User=root
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5001
Environment=DOTNET_EnableDiagnostics=0

[Install]
WantedBy=multi-user.target
"""
            
            sftp = ssh.open_sftp()
            with sftp.file('/etc/systemd/system/ailearn-api.service', 'w') as f:
                f.write(service_content)
            sftp.close()
            
            # Restart with new config
            commands = [
                "pkill -f AILearnAPI.Api || true",
                "systemctl daemon-reload",
                "systemctl restart ailearn-api",
                "sleep 3",
                "systemctl status ailearn-api --no-pager",
            ]
            
            for cmd in commands:
                stdin, stdout, stderr = ssh.exec_command(cmd)
                stdout.channel.recv_exit_status()
                if "status" in cmd:
                    print(stdout.read().decode())
            
            # Final test
            print("\n🧪 Final API test:")
            stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5001/api/ai/ollama/health")
            print(stdout.read().decode())
            
            print("\n✨ Update nginx to proxy port 5001!")
            print("Run: nano /etc/nginx/sites-available/default")
            print("Change: proxy_pass http://localhost:5000;")
            print("To:     proxy_pass http://localhost:5001;")
            print("Then:   nginx -t && systemctl reload nginx")
        else:
            print("\n⚠️  Still not working. Checking dependencies...")
            stdin, stdout, stderr = ssh.exec_command("ldd /var/www/ai-learn-api/AILearnAPI.Api | grep 'not found'")
            missing = stdout.read().decode()
            if missing:
                print(f"Missing dependencies:\n{missing}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
