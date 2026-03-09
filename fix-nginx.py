import paramiko
import sys
import time

hostname = '76.13.244.113'
username = 'root'
password = '1ZC7Lts7,saeb)Y0H4@n'
port = 22

def execute_command(client, command, description=""):
    """Execute a command and print results"""
    if description:
        print(f"\n🔧 {description}")
    stdin, stdout, stderr = client.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    exit_code = stdout.channel.recv_exit_status()
    
    if output:
        print(output.strip())
    if error and exit_code != 0:
        print(f"⚠️ {error.strip()}")
    
    return exit_code, output, error

def fix_nginx():
    try:
        print(f"🔌 Connecting to {hostname}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print(f"✅ Connected\n")
        
        print("="*60)
        print("STEP 1: Check existing nginx configs")
        print("="*60)
        execute_command(client,
            "ls -la /etc/nginx/sites-enabled/ && echo '---' && ls -la /etc/nginx/sites-available/",
            ""
        )
        
        print("\n" + "="*60)
        print("STEP 2: Remove all nginx site configs")
        print("="*60)
        execute_command(client,
            "rm -f /etc/nginx/sites-enabled/* && rm -f /etc/nginx/sites-available/learnwithai.tech.conf",
            "Cleaning old configs"
        )
        
        print("\n" + "="*60)
        print("STEP 3: Create new nginx config")
        print("="*60)
        
        # Create the nginx config directly
        nginx_config = '''# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# Upstream backend
upstream api_backend {
    server localhost:5000 fail_timeout=10s max_fails=3;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name learnwithai.tech www.learnwithai.tech;
    
    location /.well-known/acme-challenge/ {
        root /var/www/learnwithai.tech;
        allow all;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name learnwithai.tech www.learnwithai.tech;
    
    root /var/www/learnwithai.tech/frontend;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/learnwithai.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/learnwithai.tech/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Logging
    access_log /var/log/nginx/learnwithai.tech_access.log;
    error_log /var/log/nginx/learnwithai.tech_error.log warn;
    
    # Backend API
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Angular frontend
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Deny access to sensitive files
    location ~ /\\. {
        deny all;
    }
}'''
        
        # Write config file
        write_cmd = f"cat > /etc/nginx/sites-available/learnwithai.tech.conf << 'EOFCONFIG'\n{nginx_config}\nEOFCONFIG"
        execute_command(client, write_cmd, "Creating nginx config")
        
        print("\n" + "="*60)
        print("STEP 4: Enable site")
        print("="*60)
        execute_command(client,
            "ln -s /etc/nginx/sites-available/learnwithai.tech.conf /etc/nginx/sites-enabled/",
            "Creating symlink"
        )
        
        print("\n" + "="*60)
        print("STEP 5: Test configuration")
        print("="*60)
        code, out, err = execute_command(client, "nginx -t", "")
        
        if code == 0:
            print("✅ Nginx config is valid!")
            
            print("\n" + "="*60)
            print("STEP 6: Start nginx")
            print("="*60)
            execute_command(client, "systemctl restart nginx", "Restarting nginx")
            time.sleep(2)
            
            execute_command(client, "systemctl status nginx --no-pager | head -10", "Checking status")
            
            print("\n" + "="*60)
            print("STEP 7: Verify ports")
            print("="*60)
            execute_command(client, "netstat -tulpn | grep -E ':(80|443|5000)'", "")
            
            print("\n" + "="*60)
            print("STEP 8: Test website")
            print("="*60)
            execute_command(client, "curl -I http://localhost 2>&1 | head -5", "HTTP test")
            
            print("\n" + "="*60)
            print("✅ DEPLOYMENT COMPLETE!")
            print("="*60)
            print("\n🌐 Your website should now be accessible at:")
            print("   • http://76.13.244.113")
            print("   • https://learnwithai.tech")
            print("   • https://www.learnwithai.tech")
        else:
            print("❌ Nginx config test failed!")
            
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    fix_nginx()
