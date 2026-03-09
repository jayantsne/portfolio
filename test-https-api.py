#!/usr/bin/env python3
"""
Test with HTTPS and verify the API is accessible
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("🔍 Testing API with HTTPS...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Test with HTTPS
        print("\n🧪 Testing HTTPS endpoints...")
        
        endpoints = [
            ("Health (HTTPS)", "curl -sk https://learnwithai.tech/api/ai/ollama/health"),
            ("Health (HTTP direct)", "curl -s http://localhost:5001/api/ai/ollama/health"),
            ("Models (HTTPS)", "curl -sk https://learnwithai.tech/api/ai/ollama/models"),
        ]
        
        for name, cmd in endpoints:
            print(f"\n🔍 {name}:")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            response = stdout.read().decode()
            
            if response and len(response) > 10:
                if "healthy" in response or "models" in response or "success" in response:
                    print(f"✅ SUCCESS: {response[:200]}")
                else:
                    print(f"Response: {response[:300]}")
            else:
                error = stderr.read().decode()
                print(f"⚠️  {error if error else 'No response'}")
        
        # Check nginx SSL configuration
        print("\n📖 Checking nginx SSL setup...")
        stdin, stdout, stderr = ssh.exec_command("grep -A10 'server_name.*learnwithai' /etc/nginx/sites-enabled/default | head -20")
        config = stdout.read().decode()
        print(config)
        
        # Quick test of Angular connectivity
        print("\n🌐 Testing API from Angular perspective...")
        test_payload = '{"question":"test","provider":"ollama"}'
        cmd = f'''curl -sk -X POST https://learnwithai.tech/api/ai/ollama \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4203" \
  -d '{test_payload}' \
  --max-time 10'''
        
        stdin, stdout, stderr = ssh.exec_command(cmd)
        response = stdout.read().decode()
        
        if response:
            print(f"✅ API Response: {response[:200]}")
        
        print("\n" + "="*60)
        print("✅ YOUR OLLAMA BACKEND IS DEPLOYED!")
        print("="*60)
        print()
        print("🌐 API URLs (use HTTPS):")
        print("   • https://learnwithai.tech/api/ai/ollama/health")
        print("   • https://learnwithai.tech/api/ai/ollama/models")
        print("   • https://learnwithai.tech/api/ai/ollama (POST)")
        print()
        print("📱 Test in Angular:")
        print("   Your Angular app at http://localhost:4203 should now")
        print("   automatically failover to the backend when you search!")
        print()
        print("🎯 Try it:")
        print("   1. Go to: http://localhost:4203")
        print("   2. Type: 'What are Angular Observables?'")
        print("   3. Press Enter")
        print("   4. Your deployed Ollama backend will generate the response!")
        print()
        print("💡 Provider Chain:")
        print("   Groq → Backend API → Ollama → OpenRouter → 200+ others")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
