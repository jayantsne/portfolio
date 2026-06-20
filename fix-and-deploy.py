#!/usr/bin/env python3
"""
Fix the directory issue and redeploy
"""
import paramiko
from scp import SCPClient
import glob
import os
import sys

def main():
    server = "76.13.244.113"
    username = "root"
    password = "<DEPLOY_SSH_PASSWORD>"
    local_path = r"d:\folio\jayant-angular-ui\enterprise-dotnet-api\publish"
    remote_path = "/var/www/ai-learn-api"
    
    print("🔧 Fixing directory issue and redeploying...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        print("✅ Connected!")
        
        # Fix the directory issue
        print("\n🗑️  Removing incorrect file/directory...")
        stdin, stdout, stderr = ssh.exec_command("rm -rf /var/www/ai-learn-api")
        stdout.channel.recv_exit_status()
        print("✅ Removed")
        
        # Create proper directory
        print("\n📁 Creating directory...")
        stdin, stdout, stderr = ssh.exec_command("mkdir -p /var/www/ai-learn-api")
        stdout.channel.recv_exit_status()
        print("✅ Directory created")
        
        # Upload files
        print("\n📤 Uploading files...")
        with SCPClient(ssh.get_transport()) as scp:
            files = glob.glob(os.path.join(local_path, "*"))
            total = len(files)
            
            for idx, file_path in enumerate(files, 1):
                if os.path.isfile(file_path):
                    filename = os.path.basename(file_path)
                    print(f"   [{idx}/{total}] {filename}")
                    scp.put(file_path, remote_path)
        
        print("✅ Upload complete!")
        
        # Set permissions
        print("\n🔧 Setting permissions...")
        commands = [
            "chmod +x /var/www/ai-learn-api/AILearnAPI.Api",
            "chmod 644 /var/www/ai-learn-api/*.dll",
            "chmod 644 /var/www/ai-learn-api/*.so",
            "chmod 644 /var/www/ai-learn-api/*.json",
            "chown -R www-data:www-data /var/www/ai-learn-api",
        ]
        
        for cmd in commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            stdout.channel.recv_exit_status()
        print("✅ Permissions set")
        
        # Create systemd service
        service_content = """[Unit]
Description=AI Learn API - ASP.NET Core Backend with Ollama
After=network.target

[Service]
Type=notify
WorkingDirectory=/var/www/ai-learn-api
ExecStart=/var/www/ai-learn-api/AILearnAPI.Api
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=ailearn-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000

[Install]
WantedBy=multi-user.target
"""
        
        print("\n📝 Creating systemd service...")
        # Write service file
        sftp = ssh.open_sftp()
        with sftp.file('/etc/systemd/system/ailearn-api.service', 'w') as f:
            f.write(service_content)
        sftp.close()
        print("✅ Service file created")
        
        # Reload and start service
        print("\n🚀 Starting service...")
        start_commands = [
            "systemctl daemon-reload",
            "systemctl enable ailearn-api",
            "systemctl stop ailearn-api 2>/dev/null || true",
            "systemctl start ailearn-api",
            "sleep 3",
        ]
        
        for cmd in start_commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            stdout.channel.recv_exit_status()
        
        # Check status
        stdin, stdout, stderr = ssh.exec_command("systemctl status ailearn-api --no-pager")
        status = stdout.read().decode()
        print("\n📊 Service Status:")
        print(status)
        
        # Test API
        print("\n🧪 Testing API...")
        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5000/api/ai/ollama/health")
        response = stdout.read().decode()
        
        if response:
            print(f"✅ API Response: {response}")
            print("\n🎉 DEPLOYMENT SUCCESSFUL!")
            print("\n✨ Your API is live at:")
            print("   • http://learnwithai.tech/api/ai/ollama/health")
            print("   • http://learnwithai.tech/api/ai/ollama/models")
            print("\n📱 Test in Angular:")
            print("   1. Go to: http://localhost:4203")
            print("   2. Search: 'What are Angular Observables?'")
            print("   3. Get Claude-quality AI explanation! 🚀")
        else:
            print("⚠️  API not responding yet. Checking logs...")
            stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 20 --no-pager")
            logs = stdout.read().decode()
            print(logs)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
