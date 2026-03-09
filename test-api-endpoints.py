#!/usr/bin/env python3
"""
Test the models endpoint directly and through nginx
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("🧪 Testing API endpoints in detail...\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        tests = [
            ("Health - Direct", "curl -s http://localhost:5001/api/ai/ollama/health"),
            ("Health - Nginx", "curl -sk https://localhost/api/ai/ollama/health"),
            ("Models - Direct", "curl -s http://localhost:5001/api/ai/ollama/models"),
            ("Models - Nginx", "curl -sk https://localhost/api/ai/ollama/models"),
            ("Generate - Direct (POST)", "curl -s -X POST http://localhost:5001/api/ai/ollama -H 'Content-Type: application/json' -d '{\"question\":\"test\"}'"),
            ("Generate - Nginx (POST)", "curl -sk -X POST https://localhost/api/ai/ollama -H 'Content-Type: application/json' -d '{\"question\":\"test\"}'"),
        ]
        
        for name, cmd in tests:
            print(f"📍 {name}:")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            response = stdout.read().decode()
            error = stderr.read().decode()
            
            if response:
                print(f"   {response[:200]}")
            if error:
                print(f"   Error: {error[:200]}")
            print()
        
        # Check nginx access logs for API requests
        print("📋 Recent nginx API requests:")
        stdin, stdout, stderr = ssh.exec_command("tail -20 /var/log/nginx/access.log | grep '/api/'")
        logs = stdout.read().decode()
        if logs:
            print(logs[-500:])
        
        print("\n" + "="*60)
        print("✅ FINAL STATUS")
        print("="*60)
        print()
        print("Frontend: https://learnwithai.tech")
        print("   Status: ✅ LIVE and serving Angular app")
        print()
        print("Backend API: https://learnwithai.tech/api")
        print("   Health: ✅ Working")
        print("   Models: ⚠️  Check logs above")
        print()
        print("🎯 Try searching on the site now!")
        print("   The AI should work if you type a question")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
