#!/usr/bin/env python3
"""Fix nginx timeout for /api location"""

import paramiko

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

print("🔧 Fixing nginx timeouts...\n")

# Fix: Update proxy_read_timeout from 30s to 300s for /api block
stdin, stdout, stderr = ssh.exec_command("""
cd /etc/nginx/sites-available

# Backup current config
cp learnwithai.tech.conf learnwithai.tech.conf.bak

# Fix the /api location timeout
sed -i '/location \\/api {/,/^[[:space:]]*}/ s/proxy_read_timeout 30s/proxy_read_timeout 300s/' learnwithai.tech.conf
sed -i '/location \\/api {/,/^[[:space:]]*}/ s/proxy_send_timeout 30s/proxy_send_timeout 300s/' learnwithai.tech.conf
sed -i '/location \\/api {/,/^[[:space:]]*}/ s/proxy_connect_timeout 30s/proxy_connect_timeout 60s/' learnwithai.tech.conf

# Verify
grep -n 'proxy_read_timeout\\|proxy_send_timeout\\|proxy_connect_timeout' learnwithai.tech.conf
""")
result = stdout.read().decode()
print(result)

# Test nginx config
stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
test_result = stdout.read().decode()
print(f"Nginx config test: {test_result}")

# Reload nginx
stdin, stdout, stderr = ssh.exec_command("systemctl reload nginx")
stdout.channel.recv_exit_status()
print("✅ Nginx reloaded")

ssh.close()
