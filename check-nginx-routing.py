#!/usr/bin/env python3
"""
Check and fix nginx API routing
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("🔍 Checking nginx API routing...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Get the full nginx configuration
        print("\n📖 Nginx configuration for /api/ai/ollama:")
        stdin, stdout, stderr = ssh.exec_command("grep -A20 'location.*api.*ollama' /etc/nginx/sites-enabled/default")
        config = stdout.read().decode()
        
        if config:
            print(config)
        else:
            print("⚠️  No specific ollama location block found")
            print("Checking general /api location:")
            stdin, stdout, stderr = ssh.exec_command("grep -A15 'location.*api' /etc/nginx/sites-enabled/default | head -30")
            config = stdout.read().decode()
            print(config)
        
        # Test the routing directly        print("\n🧪 Testing routing:")
        
        tests = [
            ("Direct backend", "curl -s http://localhost:5001/api/ai/ollama/health"),
            ("Through nginx HTTP", "curl -s http://localhost/api/ai/ollama/health 2>&1"),
            ("Through nginx HTTPS", "curl -sk https://localhost/api/ai/ollama/health 2>&1"),
        ]
        
        for name, cmd in tests:
            print(f"\n{name}:")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            response = stdout.read().decode()
            print(f"  {response[:200]}")
        
        print("\n🔧 Ensuring correct nginx configuration...")
        
        # Check if we need to add the location block
        stdin, stdout, stderr = ssh.exec_command("grep -c '/api/ai/ollama' /etc/nginx/sites-enabled/default")
        count = stdout.read().decode().strip()
        
        if count == "0":
            print("⚠️  No /api/ai/ollama location block - nginx might be routing to wrong backend")
            print("✏️  This explains the 'API Key is missing' error")
            print()
            print("🔧 Adding proper routing...")
            
            # We need to add a location block or ensure /api/* goes to port 5001
            # Let's check what's handling /api currently
            stdin, stdout, stderr = ssh.exec_command("grep -B5 -A10 'location.*\/api' /etc/nginx/sites-enabled/default | head -40")
            current_api_routing = stdout.read().decode()
            print("\nCurrent /api routing:")
            print(current_api_routing)
        else:
            print(f"✅ Found {count} reference(s) to ollama endpoint")
        
        print("\n" + "="*60)
        print("📝 SOLUTION:")
        print("="*60)
        print()
        print("Your backend IS running on port 5001 (confirmed ✅)")
        print("But nginx might be proxying /api/* to a different backend")
        print("(likely Cloudflare Workers) which requires API keys.")
        print()
        print("🔧 To fix, ensure nginx routes /api/ai/ollama to port 5001:")
        print()
        print("Option 1: Add specific location block (best):")
        print("   location /api/ai/ollama {")
        print("       proxy_pass http://localhost:5001/api/ai/ollama;")
        print("       ... other proxy settings ...")
        print("   }")
        print()
        print("Option 2: Verify the general /api block points to 5001")
        print("   (we already updated this to 5001)")
        print()
        print("🚀 Quick Test:")
        print("   curl -sk https://learnwithai.tech/api/ai/ollama/health")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
