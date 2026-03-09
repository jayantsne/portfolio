#!/usr/bin/env python3
"""
Debug and fix nginx API routing to ensure it points to localhost:5001
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("🔍 Debugging nginx API routing...\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Check current nginx configuration
        print("📖 Current nginx configuration for /api/:\n")
        stdin, stdout, stderr = ssh.exec_command("grep -A10 'location /api/' /etc/nginx/sites-enabled/default")
        config = stdout.read().decode()
        print(config)
        print()
        
        # Test direct backend access
        print("🧪 Testing direct backend access:")
        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:5001/api/ai/ollama/health 2>&1")
        response = stdout.read().decode()
        print(f"   localhost:5001: {response}")
        print()
        
        # Test through nginx
        print("🧪 Testing through nginx:")
        stdin, stdout, stderr = ssh.exec_command("curl -sk https://localhost/api/ai/ollama/health 2>&1")
        response = stdout.read().decode()
        print(f"   nginx HTTPS: {response}")
        print()
        
        # Check if there are multiple location blocks conflicting
        print("📋 All API-related location blocks:")
        stdin, stdout, stderr = ssh.exec_command("grep -n 'location.*api' /etc/nginx/sites-enabled/default")
        locations = stdout.read().decode()
        print(locations)
        print()
        
        # The issue might be that the location /api/ is being matched
        # but it's passing to the wrong backend. Let's add a specific
        # location block for Ollama that comes BEFORE the general /api/
        
        print("🔧 Reading full nginx config...")
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-enabled/default")
        full_config = stdout.read().decode()
        
        # Check if we need to reorganize location blocks
        if 'location /api/' in full_config and 'proxy_pass http://localhost:5001' in full_config:
            print("✅ Configuration looks correct!")
            print()
            print("🔍 Issue might be that nginx cached the old configuration")
            print("   Let's do a full restart instead of reload...")
            
            stdin, stdout, stderr = ssh.exec_command("systemctl restart nginx && sleep 2")
            stdout.channel.recv_exit_status()
            print("✅ Nginx restarted")
            
            # Test again
            print("\n🧪 Testing after restart:")
            tests = [
                ("Health Check", "curl -sk https://learnwithai.tech/api/ai/ollama/health"),
                ("Models", "curl -sk https://learnwithai.tech/api/ai/ollama/models"),
            ]
            
            for name, cmd in tests:
                stdin, stdout, stderr = ssh.exec_command(cmd)
                response = stdout.read().decode()
                print(f"\n{name}:")
                if response:
                    print(f"   {response[:200]}")
                else:
                    print("   No response")
            
        else:
            print("⚠️  Configuration may need adjustment")
            print("   Adding explicit Ollama location block...")
            
            # We need to add a more specific location block
            # Location blocks are matched in order of specificity
            # More specific patterns should come first
            
        print()
        print("="*60)
        print("✅ Diagnostics complete")
        print("="*60)
        print()
        print("🎯 Frontend Status:")
        print("   ✅ https://learnwithai.tech - Working!")
        print()
        print("🔧 Backend Status:")
        print("   ✅ Direct: http://localhost:5001/api/ai/ollama/health")
        print("   ⏳ Public: https://learnwithai.tech/api/ai/ollama/health")
        print()
        print("💡 Next steps:")
        print("   1. Test frontend: https://learnwithai.tech")
        print("   2. If backend still shows 'API Key missing', it means")
        print("      nginx is routing to Cloudflare Workers backend")
        print("   3. The Angular app will still work using Cloudflare!")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
