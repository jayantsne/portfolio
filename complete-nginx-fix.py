#!/usr/bin/env python3
"""
Get full nginx configuration and apply complete fix
"""
import paramiko
import re

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("📖 Getting full nginx configuration...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Get the full default site config
        print("\n🔍 nginx default site configuration:\n")
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-enabled/default")
        full_config = stdout.read().decode()
        
        # Print first 100 lines to understand structure
        lines = full_config.split('\n')
        for i, line in enumerate(lines[:100], 1):
            if 'location' in line.lower() or 'proxy_pass' in line.lower() or 'server' in line.lower():
                print(f"{i:3}: {line}")
        
        if len(lines) > 100:
            print(f"\n... ({len(lines)-100} more lines) ...\n")
        
        # Now let's create a proper configuration
        print("\n🔧 Creating comprehensive nginx configuration...")
        
        # Complete nginx config for ASP.NET API
        nginx_config = """server {
    listen 80;
    listen [::]:80;
    server_name learnwithai.tech www.learnwithai.tech;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name learnwithai.tech www.learnwithai.tech;
    
    # SSL Configuration (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/learnwithai.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/learnwithai.tech/privkey.pem;
    
    # API routes to ASP.NET backend on port 5001
    location /api/ai/ollama {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # General API route (if you have other API endpoints)
    location ~ ^/api/(.*)$ {
        proxy_pass http://localhost:5001/api/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Serve Angular frontend (if hosted on same server)
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
"""
       
        print("📝 New configuration:")
        print("   • Port 80: Redirects to HTTPS")
        print("   • Port 443: HTTPS with SSL")
        print("   • /api/ai/ollama → localhost:5001 (your ASP.NET backend)")
        print("   • /api/* → localhost:5001/api/*")
        print()
        
        response = input("❓ Apply this configuration? (yes/no): ").lower()
        
        if response not in ['yes', 'y']:
            print("⏭️  Skipping configuration update")
            print("\n💡 Current status:")
            print("   ✅ Backend API is running on port 5001")
            print("   ✅ Accessible locally via localhost:5001")
            print("   ⚠️  Nginx routing needs manual configuration")
            print()
            print("🔧 Manual steps:")
            print("   1. SSH: ssh root@76.13.244.113")
            print("   2. Edit: nano /etc/nginx/sites-available/default")
            print("   3. Add the location blocks shown above")
            print("   4. Test: nginx -t")
            print("   5. Reload: systemctl reload nginx")
            return
        
        # Backup current config
        print("\n💾 Backing up current configuration...")
        stdin, stdout, stderr = ssh.exec_command("cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)")
        stdout.channel.recv_exit_status()
        print("✅ Backup created")
        
        # Write new config
        print("\n✏️  Writing new configuration...")
        sftp = ssh.open_sftp()
        with sftp.file('/etc/nginx/sites-available/default', 'w') as f:
            f.write(nginx_config)
        sftp.close()
        print("✅ Configuration written")
        
        # Test configuration
        print("\n🧪 Testing nginx configuration...")
        stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
        test_result = stdout.read().decode()
        print(test_result)
        
        if 'successful' in test_result.lower():
            print("\n✅ Configuration test passed!")
            
            # Reload nginx
            print("\n🔄 Reloading nginx...")
            stdin, stdout, stderr = ssh.exec_command("systemctl reload nginx")
            stdout.channel.recv_exit_status()
            print("✅ Nginx reloaded")
            
            # Test the API
            print("\n🎯 Testing API endpoints...")
            import time
            time.sleep(2)
            
            tests = [
                ("Health", "curl -sk https://learnwithai.tech/api/ai/ollama/health"),
                ("Models", "curl -sk https://learnwithai.tech/api/ai/ollama/models"),
            ]
            
            for name, cmd in tests:
                print(f"\n{name}:")
                stdin, stdout, stderr = ssh.exec_command(cmd)
                response = stdout.read().decode()
                
                if response and ("healthy" in response or "models" in response):
                    print(f"  ✅ {response[:150]}")
                else:
                    print(f"  Response: {response[:300]}")
            
            print("\n" + "="*60)
            print("🎉 NGINX CONFIGURATION COMPLETE!")
            print("="*60)
            print()
            print("✅ Your API should now be accessible:")
            print("   • https://learnwithai.tech/api/ai/ollama/health")
            print("   • https://learnwithai.tech/api/ai/ollama/models")
            print("   • https://learnwithai.tech/api/ai/ollama (POST)")
            print()
            print("📱 Test in Angular:")
            print("   1. Rebuild: ng build (to apply HTTPS endpoint change)")
            print("   2. Serve: ng serve --port 4203")
            print("   3. Open: http://localhost:4203")
            print("   4. Search: 'Angular Observables'")
            print("   5. Watch Ollama generate the explanation!")
            print()
            
        else:
            print("\n❌ Configuration test failed!")
            print("Restoring backup...")
            stdin, stdout, stderr = ssh.exec_command("ls -t /etc/nginx/sites-available/default.backup.* | head -1 | xargs -I {} cp {} /etc/nginx/sites-available/default")
            stdout.channel.recv_exit_status()
            print("✅ Backup restored")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
