#!/usr/bin/env python3
"""
Diagnose and fix the API startup issue
"""
import paramiko
import sys

def main():
    server = "76.13.244.113"
    username = "root"
    password = "<DEPLOY_SSH_PASSWORD>"
    
    print("🔍 Diagnosing API startup issue...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Check directory contents and permissions
        print("\n📁 Checking directory contents...")
        commands = [
            "ls -la /var/www/ai-learn-api/ | head -20",
            "file /var/www/ai-learn-api/AILearnAPI.Api",
            "ldd /var/www/ai-learn-api/AILearnAPI.Api 2>&1 | head -10",
        ]
        
        for cmd in commands:
            print(f"\n$ {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = stdout.read().decode()
            error = stderr.read().decode()
            print(output)
            if error:
                print(f"Error: {error}")
        
        # Try to run it manually to see the actual error
        print("\n🧪 Attempting manual execution...")
        cmd = "cd /var/www/ai-learn-api && ./AILearnAPI.Api 2>&1"
        print(f"$ {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=5)
        
        import time
        time.sleep(2)  # Give it time to start or fail
        
        output = stdout.read().decode()
        error = stderr.read().decode()
        
        if output:
            print("Output:", output[:500])
        if error:
            print("Error:", error[:500])
        
        # Fix: Make executable and try different approach
        print("\n🔧 Applying fix...")
        fix_commands = [
            "cd /var/www/ai-learn-api",
            "chmod 755 AILearnAPI.Api",
            "chmod 755 *.dll",
            "chmod 755 libmongocrypt.so",
        ]
        
        cmd = " && ".join(fix_commands)
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdout.channel.recv_exit_status()
        print("✅ Permissions fixed")
        
        # Restart service
        print("\n🔄 Restarting service...")
        stdin, stdout, stderr = ssh.exec_command("systemctl restart ailearn-api && sleep 2 && systemctl status ailearn-api --no-pager")
        status_output = stdout.read().decode()
        print(status_output)
        
        # Check if it's listening on port 5000
        print("\n🌐 Checking if API is responding...")
        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5000/api/ai/ollama/health || echo 'Not responding'")
        response = stdout.read().decode()
        print(f"Response: {response}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
