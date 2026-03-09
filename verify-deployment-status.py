#!/usr/bin/env python3
"""
Check actual nginx configuration and verify deployment status
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("🔍 Checking deployment status...\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # 1. Check frontend files
        print("📱 Frontend Status:")
        stdin, stdout, stderr = ssh.exec_command("ls -lh /var/www/ai-learn-frontend/index.html 2>&1")
        result = stdout.read().decode()
        if "No such file" in result:
            print("   ❌ Frontend NOT deployed")
        else:
            print(f"   ✅ Frontend deployed: {result.strip()}")
            stdin, stdout, stderr = ssh.exec_command("ls /var/www/ai-learn-frontend/ | wc -l")
            count = stdout.read().decode().strip()
            print(f"   📁 Files: {count}")
        
        # 2. Check backend
        print("\n🤖 Backend Status:")
        stdin, stdout, stderr = ssh.exec_command("systemctl is-active ailearn-api")
        status = stdout.read().decode().strip()
        print(f"   Service: {status}")
        
        if status == "active":
            stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5001/api/ai/ollama/health")
            health = stdout.read().decode()
            print(f"   Localhost:5001: {health[:100]}")
        
        # 3. Check nginx is actually serving from the right location
        print("\n🌐 Nginx Status:")
        stdin, stdout, stderr = ssh.exec_command("curl -sI https://localhost/ 2>&1 | head -5")
        nginx_status = stdout.read().decode()
        print(f"   HTTPS: {nginx_status.strip()}")
        
        # 4. Check what nginx config is ACTUALLY being used
        print("\n📖 Active Nginx Configuration:")
        stdin, stdout, stderr = ssh.exec_command("nginx -T 2>&1 | grep -A30 'server_name.*learnwithai' | head -50")
        active_config = stdout.read().decode()
        print(active_config[:1000])
        
        # 5. Test the actual API endpoint
        print("\n🧪 Testing API Endpoints:")
        
        tests = [
            ("Frontend root", "curl -sI https://learnwithai.tech/ 2>&1 | grep 'HTTP'"),
            ("API health (through nginx)", "curl -sk https://learnwithai.tech/api/ai/ollama/health 2>&1"),
            ("API direct", "curl -s http://localhost:5001/api/ai/ollama/health 2>&1"),
        ]
        
        for name, cmd in tests:
            print(f"\n{name}:")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            response = stdout.read().decode()[:300]
            print(f"   {response}")
        
        # 6. Check if there are multiple nginx configs
        print("\n📋 All nginx site configs:")
        stdin, stdout, stderr = ssh.exec_command("ls -la /etc/nginx/sites-enabled/")
        configs = stdout.read().decode()
        print(configs)
        
        print("\n" + "="*60)
        print("💡 Analysis:")
        print("="*60)
        
        # Provide specific diagnosis
        if "No such file" in result:
            print("\n❌ ISSUE: Frontend not uploaded to /var/www/ai-learn-frontend/")
            print("   Solution: Re-run deployment script")
        elif status != "active":
            print("\n❌ ISSUE: Backend service not running")
            print("   Solution: systemctl start ailearn-api")
        else:
            print("\n⚠️  Frontend and backend are deployed, but nginx routing may need adjustment")
            print("   Let me check the nginx configuration details...")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
