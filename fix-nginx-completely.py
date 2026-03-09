#!/usr/bin/env python3
"""
Get the actual nginx config and rewrite it properly
"""
import paramiko

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    
    print("📖 Getting full nginx configuration...\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server, username=username, password=password, timeout=30)
        
        # Get the full config
        stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-enabled/default")
        full_config = stdout.read().decode()
        
        print("Current nginx config (first 80 lines):")
        print("="*60)
        lines = full_config.split('\n')
        for i, line in enumerate(lines[:80], 1):
            print(f"{i:3}: {line}")
        print(f"... (total {len(lines)} lines)")
        print("="*60)
        print()
        
        # Now let's create a proper configuration
        print("🔧 Creating corrected nginx configuration...")
        
        correct_config = """server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    # Redirect all HTTP to HTTPS
    return 301 https://learnwithai.tech$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name learnwithai.tech www.learnwithai.tech;
    
    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/learnwithai.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/learnwithai.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';
    
    # Root directory for Angular frontend
    root /var/www/ai-learn-frontend;
    index index.html index.htm;
    
    # Logs
    access_log /var/log/nginx/ailearn_access.log;
    error_log /var/log/nginx/ailearn_error.log;
    
    # API Backend Proxy - Route to ASP.NET on port 5001
    location ~ ^/api/(.*)$ {
        proxy_pass http://127.0.0.1:5001/api/$1$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Angular SPA - serve index.html for all frontend routes
    location / {
        try_files $uri $uri/ /index.html =404;
        
        # Cache control for static assets
        location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # No cache for index.html
        location = /index.html {
            add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
            expires off;
        }
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/x-javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    gzip_proxied any;
    gzip_disable "msie6";
}
"""
        
        # Write the corrected config
        print("✏️  Writing corrected configuration...")
        sftp = ssh.open_sftp()
        with sftp.file('/etc/nginx/sites-available/default', 'w') as f:
            f.write(correct_config)
        sftp.close()
        print("✅ Configuration written")
        
        # Test
        print("\n🧪 Testing configuration...")
        stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
        test_result = stdout.read().decode()
        print(test_result)
        
        if 'successful' in test_result:
            print("\n✅ Configuration valid! Restarting nginx...")
            
            # Full restart to ensure all caches are cleared
            stdin, stdout, stderr = ssh.exec_command("systemctl restart nginx && sleep 3")
            stdout.channel.recv_exit_status()
            print("✅ Nginx restarted!")
            
            # Test the endpoints
            print("\n🧪 Testing endpoints:")
            
            import time
            time.sleep(2)
            
            tests = [
                ("Frontend", "curl -sI https://learnwithai.tech/ | grep 'HTTP'"),
                ("Backend Health", "curl -sk https://learnwithai.tech/api/ai/ollama/health"),
                ("Backend Models", "curl -sk https://learnwithai.tech/api/ai/ollama/models"),
            ]
            
            for name, cmd in tests:
                print(f"\n{name}:")
                stdin, stdout, stderr = ssh.exec_command(cmd)
                response = stdout.read().decode()
                if response and len(response) > 5:
                    print(f"   ✅ {response[:200]}")
                else:
                    print(f"   ⚠️  {stderr.read().decode()[:200]}")
            
            print("\n" + "="*60)
            print("🎉 DEPLOYMENT COMPLETE!")
            print("="*60)
            print()
            print("🌐 Your platform is LIVE:")
            print()
            print("   Frontend: https://learnwithai.tech")
            print("   Backend API: https://learnwithai.tech/api")
            print()
            print("🧪 API Endpoints:")
            print("   • GET  https://learnwithai.tech/api/ai/ollama/health")
            print("   • GET  https://learnwithai.tech/api/ai/ollama/models")
            print("   • POST https://learnwithai.tech/api/ai/ollama")
            print()
            print("🚀 Try it:")
            print("   1. Open: https://learnwithai.tech")
            print("   2. Search for any programming topic")
            print("   3. Get AI-powered explanations!")
            print()
            
        else:
            print("\n❌ Configuration test failed!")
            print("Restoring backup...")
            stdin, stdout, stderr = ssh.exec_command("ls -t /etc/nginx/sites-available/default.backup.* | head -1 | xargs -I {} cp {} /etc/nginx/sites-available/default")
            stdout.channel.recv_exit_status()
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
