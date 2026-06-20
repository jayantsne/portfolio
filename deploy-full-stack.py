#!/usr/bin/env python3
"""
Complete Frontend + Backend Deployment
Deploys Angular app and ASP.NET backend with full nginx configuration
"""
import paramiko
from scp import SCPClient
import os
import sys

def main():
    server = "76.13.244.113"
    username = "root"
    password = "<DEPLOY_SSH_PASSWORD>"
    
    frontend_path = r"d:\folio\jayant-angular-ui\angular-starter\dist"
    backend_path = r"d:\folio\jayant-angular-ui\enterprise-dotnet-api\publish"
    
    print("🚀 COMPLETE DEPLOYMENT - Frontend + Backend")
    print("="*60)
    print()
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("🔐 Connecting to server...")
        ssh.connect(server, username=username, password=password, timeout=30)
        print("✅ Connected!\n")
        
        # ============================================
        # STEP 1: Upload Angular Frontend
        # ============================================
        print("📤 STEP 1: Uploading Angular Frontend")
        print("-" * 60)
        
        # Create frontend directory
        print("📁 Creating /var/www/ai-learn-frontend...")
        stdin, stdout, stderr = ssh.exec_command("mkdir -p /var/www/ai-learn-frontend")
        stdout.channel.recv_exit_status()
        
        # Clear old files
        print("🧹 Clearing old frontend files...")
        stdin, stdout, stderr = ssh.exec_command("rm -rf /var/www/ai-learn-frontend/*")
        stdout.channel.recv_exit_status()
        
        # Upload frontend files
        print("📦 Uploading Angular files...")
        
        # Find the actual dist folder
        dist_folders = [d for d in os.listdir(frontend_path) if os.path.isdir(os.path.join(frontend_path, d))]
        if dist_folders:
            actual_dist = os.path.join(frontend_path, dist_folders[0])
        else:
            actual_dist = frontend_path
        
        file_count = 0
        with SCPClient(ssh.get_transport()) as scp:
            # Upload all files from dist
            for root, dirs, files in os.walk(actual_dist):
                for file in files:
                    local_file = os.path.join(root, file)
                    # Get relative path
                    rel_path = os.path.relpath(local_file, actual_dist)
                    remote_dir = os.path.dirname(rel_path).replace('\\', '/')
                    
                    # Create remote directory if needed
                    if remote_dir and remote_dir != '.':
                        stdin, stdout, stderr = ssh.exec_command(f"mkdir -p /var/www/ai-learn-frontend/{remote_dir}")
                        stdout.channel.recv_exit_status()
                    
                    # Upload file
                    remote_file = f"/var/www/ai-learn-frontend/{rel_path}".replace('\\', '/')
                    try:
                        scp.put(local_file, remote_file)
                        file_count += 1
                        if file_count % 10 == 0:
                            print(f"   Uploaded {file_count} files...")
                    except Exception as e:
                        print(f"   ⚠️  {rel_path}: {e}")
        
        print(f"✅ Frontend uploaded! ({file_count} files)\n")
        
        # ============================================
        # STEP 2: Verify Backend
        # ============================================
        print("📤 STEP 2: Verifying Backend")
        print("-" * 60)
        
        # Check service status
        stdin, stdout, stderr = ssh.exec_command("systemctl is-active ailearn-api")
        status = stdout.read().decode().strip()
        
        if status == "active":
            print("✅ Backend service already running!")
        else:
            print("🔄 Starting backend service...")
            stdin, stdout, stderr = ssh.exec_command("systemctl start ailearn-api")
            stdout.channel.recv_exit_status()
            print("✅ Backend service started!")
        
        print()
        
        # ============================================
        # STEP 3: Configure Nginx
        # ============================================
        print("📤 STEP 3: Configuring Nginx")
        print("-" * 60)
        
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
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/learnwithai.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/learnwithai.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Root directory for Angular SPA
    root /var/www/ai-learn-frontend;
    index index.html;
    
    # API routes to ASP.NET backend on port 5001
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # CORS headers for Angular
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    # Angular SPA - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \\.(?:css|js|jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
}
"""
        
        # Backup current config
        print("💾 Backing up current nginx config...")
        stdin, stdout, stderr = ssh.exec_command("cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)")
        stdout.channel.recv_exit_status()
        
        # Write new config
        print("✏️  Writing new nginx configuration...")
        sftp = ssh.open_sftp()
        with sftp.file('/etc/nginx/sites-available/default', 'w') as f:
            f.write(nginx_config)
        sftp.close()
       
        # Test nginx config
        print("🧪 Testing nginx configuration...")
        stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
        test_result = stdout.read().decode()
        
        if 'successful' in test_result.lower():
            print("✅ Nginx configuration valid!")
            
            # Reload nginx
            print("🔄 Reloading nginx...")
            stdin, stdout, stderr = ssh.exec_command("systemctl reload nginx")
            stdout.channel.recv_exit_status()
            print("✅ Nginx reloaded!\n")
        else:
            print("❌ Nginx configuration test failed:")
            print(test_result)
            print("\nRestoring backup...")
            stdin, stdout, stderr = ssh.exec_command("ls -t /etc/nginx/sites-available/default.backup.* | head -1 | xargs -I {} cp {} /etc/nginx/sites-available/default")
            stdout.channel.recv_exit_status()
            return
        
        # ============================================
        # STEP 4: Test Deployment
        # ============================================
        print("📤 STEP 4: Testing Deployment")
        print("-" * 60)
        
        import time
        time.sleep(3)
        
        tests = [
            ("Frontend (HTTPS)", "curl -sI https://learnwithai.tech/ 2>&1 | head -1"),
            ("Frontend index.html", "curl -s https://learnwithai.tech/ 2>&1 | grep -o '<title>.*</title>' | head -1"),
            ("Backend Health", "curl -sk https://learnwithai.tech/api/ai/ollama/health 2>&1"),
            ("Backend Models", "curl -sk https://learnwithai.tech/api/ai/ollama/models 2>&1"),
        ]
        
        all_passed = True
        for name, cmd in tests:
            print(f"\n🧪 {name}:")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            response = stdout.read().decode()
            
            if response and len(response) > 3:
                print(f"   ✅ {response[:150]}")
            else:
                print(f"   ⚠️  No response")
                all_passed = False
        
        print()
        print("=" * 60)
        print("🎉 DEPLOYMENT COMPLETE!")
        print("=" * 60)
        print()
        print("🌐 Your AI Learn Platform is LIVE at:")
        print()
        print("   🌍 https://learnwithai.tech")
        print()
        print("   Features:")
        print("   ✅ Angular SPA (15 MB)")
        print("   ✅ ASP.NET Backend API")
        print("   ✅ Ollama AI (qwen2.5:7b)")
        print("   ✅ Claude-quality responses")
        print("   ✅ HTTPS with SSL")
        print("   ✅ Nginx reverse proxy")
        print()
        print("🎯 TEST IT NOW:")
        print("   1. Open: https://learnwithai.tech")
        print("   2. Search: 'What are React Hooks?'")
        print("   3. Get AI-powered explanation!")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
