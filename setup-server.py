#!/usr/bin/env python3
"""
Complete server setup for ASP.NET backend
Creates systemd service, sets permissions, and starts the API
"""
import paramiko
import sys

def main():
    server = "76.13.244.113"
    username = "root"
    password = "<DEPLOY_SSH_PASSWORD>"
    
    print("🔧 Configuring server...")
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"🔐 Connecting to {server}...")
        ssh.connect(server, username=username, password=password, timeout=30)
        print("✅ Connected!")
        
        # Create systemd service file
        service_content = """[Unit]
Description=AI Learn API - ASP.NET Core Backend
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
        
        print("📝 Creating systemd service file...")
        commands = [
            # Fix permissions on executable
            "chmod +x /var/www/ai-learn-api/AILearnAPI.Api",
            
            # Create service file
            f"cat > /etc/systemd/system/ailearn-api.service << 'EOF'\n{service_content}EOF",
            
            # Set ownership
            "chown -R www-data:www-data /var/www/ai-learn-api",
            
            # Reload systemd
            "systemctl daemon-reload",
            
            # Enable service
            "systemctl enable ailearn-api",
            
            # Stop if running (ignore errors)
            "systemctl stop ailearn-api 2>/dev/null || true",
            
            # Start service
            "systemctl start ailearn-api",
            
            # Wait a moment
            "sleep 3",
            
            # Check status
            "systemctl status ailearn-api --no-pager -l"
        ]
        
        for cmd in commands:
            if cmd.startswith("cat >"):
                # Handle multi-line command
                stdin, stdout, stderr = ssh.exec_command(cmd)
                exit_status = stdout.channel.recv_exit_status()
                if exit_status != 0:
                    print(f"⚠️  Command failed: {cmd.split()[0]}")
                else:
                    print(f"✅ Created service file")
            else:
                print(f"   Running: {cmd.split()[0]}...")
                stdin, stdout, stderr = ssh.exec_command(cmd)
                exit_status = stdout.channel.recv_exit_status()
                
                if "status" in cmd:
                    output = stdout.read().decode()
                    print(output)
                elif exit_status != 0:
                    error = stderr.read().decode()
                    if error and "No such file" not in error:
                        print(f"   ⚠️  {error}")
                else:
                    print(f"   ✅ Done")
        
        print()
        print("🎉 SERVER SETUP COMPLETE!")
        print()
        print("🧪 Test your API:")
        print("   • Health: http://learnwithai.tech/api/ai/ollama/health")
        print("   • Models: http://learnwithai.tech/api/ai/ollama/models")
        print()
        print("📱 Test from Angular app:")
        print("   1. Open: http://localhost:4203")
        print("   2. Search: 'Angular Observables'")
        print("   3. Watch Claude-quality explanation appear!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
