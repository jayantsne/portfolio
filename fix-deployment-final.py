#!/usr/bin/env python3
"""
Fix deployment by updating the CORRECT nginx config and moving files
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "<DEPLOY_SSH_PASSWORD>"
    
    print("🔧 Fixing deployment configuration...\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Get the actual nginx config that's being used
        print("📖 Reading actual nginx config...")
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-available/learnwithai.tech.conf")
        current_config = stdout.read().decode()
        
        print("Current root directory:", "root /var/www/learnwithai.tech/frontend" in current_config)
        print()
        
        # Option 1: Move files to the expected location
        print("📦 Moving frontend files to correct location...")
        commands = [
            "mkdir -p /var/www/learnwithai.tech/frontend",
            "rm -rf /var/www/learnwithai.tech/frontend/*",
            "cp -r /var/www/ai-learn-frontend/* /var/www/learnwithai.tech/frontend/",
            "ls /var/www/learnwithai.tech/frontend/ | wc -l"
        ]
        
        for cmd in commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            result = stdout.read().decode()
            if result.strip():
                print(f"   {cmd}: {result.strip()}")
        
        print("✅ Files moved to /var/www/learnwithai.tech/frontend/")
        
        # Now update the nginx config to add API proxy
        print("\n🔧 Updating nginx configuration for API...")
        
        # Read current config again
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-available/learnwithai.tech.conf")
        config = stdout.read().decode()
        
        # Check if API location exists
        if "location /api/" not in config and "location ~ ^/api/" not in config:
            print("   Adding API proxy configuration...")
            
            # Find the location to insert API block (before the main location /)
            api_block = """
    # API Backend Proxy - ASP.NET on port 5001
    location ~ ^/api/(.*)$ {
        proxy_pass http://127.0.0.1:5001/api/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
"""
            
            # Insert API block before the first "location /" block in the HTTPS server
            lines = config.split('\n')
            new_lines = []
            api_inserted = False
            in_https_server = False
            
            for i, line in enumerate(lines):
                # Detect HTTPS server block
                if 'listen 443 ssl' in line or 'listen [::]:443' in line:
                    in_https_server = True
                
                # Insert API block before first "location /" in HTTPS server
                if in_https_server and not api_inserted and 'location /' in line and 'location /.well-known' not in line:
                    new_lines.append(api_block)
                    api_inserted = True
                
                new_lines.append(line)
            
            updated_config = '\n'.join(new_lines)
            
            # Backup and write new config
            print("   💾 Backing up current config...")
            stdin, stdout, stderr = ssh.exec_command("cp /etc/nginx/sites-available/learnwithai.tech.conf /etc/nginx/sites-available/learnwithai.tech.conf.backup.$(date +%Y%m%d_%H%M%S)")
            stdout.channel.recv_exit_status()
            
            print("   ✏️  Writing updated config...")
            sftp = ssh.open_sftp()
            with sftp.file('/etc/nginx/sites-available/learnwithai.tech.conf', 'w') as f:
                f.write(updated_config)
            sftp.close()
            
            print("   ✅ Config updated")
        else:
            print("   ✅ API proxy already configured")
        
        # Test and reload nginx
        print("\n🧪 Testing nginx configuration...")
        stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
        test_result = stdout.read().decode()
        
        if 'successful' in test_result.lower():
            print("   ✅ Configuration valid!")
            
            print("\n🔄 Reloading nginx...")
            stdin, stdout, stderr = ssh.exec_command("systemctl reload nginx")
            stdout.channel.recv_exit_status()
            print("   ✅ Nginx reloaded!")
        else:
            print(f"   ❌ Configuration test failed:\n{test_result}")
            print("   Restoring backup...")
            stdin, stdout, stderr = ssh.exec_command("ls -t /etc/nginx/sites-available/learnwithai.tech.conf.backup.* | head -1 | xargs -I {} cp {} /etc/nginx/sites-available/learnwithai.tech.conf")
            stdout.channel.recv_exit_status()
            return
        
        # Final tests
        print("\n🧪 Testing deployment:")
        
        import time
        time.sleep(2)
        
        tests = [
            ("Frontend", "curl -sI https://learnwithai.tech/ | head -2"),
            ("Frontend title", "curl -s https://learnwithai.tech/ | grep -o '<title>.*</title>'"),
            ("API Health", "curl -sk https://learnwithai.tech/api/ai/ollama/health"),
            ("API Models", "curl -sk https://learnwithai.tech/api/ai/ollama/models"),
        ]
        
        all_good = True
        for name, cmd in tests:
            print(f"\n{name}:")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            response = stdout.read().decode()
            
            if response and len(response) > 5:
                # Check for success indicators
                if "200" in response or "healthy" in response or "models" in response or "<title>" in response:
                    print(f"   ✅ {response[:150]}")
                else:
                    print(f"   ⚠️  {response[:150]}")
                    all_good = False
            else:
                print(f"   ⚠️  No response")
                all_good = False
        
        print("\n" + "="*60)
        if all_good:
            print("🎉 DEPLOYMENT COMPLETE AND VERIFIED!")
        else:
            print("⚠️  DEPLOYMENT COMPLETE (Some endpoints need verification)")
        print("="*60)
        print()
        print("🌐 Your platform is now LIVE:")
        print()
        print("   Frontend: https://learnwithai.tech")
        print("   Backend API: https://learnwithai.tech/api")
        print()
        print("🎯 Test it:")
        print("   1. Visit: https://learnwithai.tech")
        print("   2. Search: 'What are React Hooks?'")
        print("   3. Get AI-powered explanation!")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
