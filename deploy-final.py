#!/usr/bin/env python3
"""Deploy backend with maxTokens fix"""

import paramiko
import os
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"
PUBLISH_DIR = r"d:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Api\publish"
REMOTE_DIR = "/var/www/ai-learn-api"

print("🚀 Deploying backend...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Stop service
print("⏸️  Stopping service...")
stdin, stdout, stderr = ssh.exec_command("systemctl stop ailearn-api")
stdout.channel.recv_exit_status()

# Upload files
print("📤 Uploading files...")
sftp = ssh.open_sftp()
uploaded = 0
for root, dirs, files in os.walk(PUBLISH_DIR):
    for file in files:
        local_path = os.path.join(root, file)
        relative_path = os.path.relpath(local_path, PUBLISH_DIR)
        remote_path = f"{REMOTE_DIR}/{relative_path}".replace("\\", "/")
        
        remote_dir = os.path.dirname(remote_path)
        try:
            sftp.stat(remote_dir)
        except:
            ssh.exec_command(f"mkdir -p {remote_dir}")
        
        sftp.put(local_path, remote_path)
        uploaded += 1
        if uploaded % 10 == 0:
            print(f"  {uploaded} files...")

print(f"✅ Uploaded {uploaded} files")

# Set permissions
stdin, stdout, stderr = ssh.exec_command(f"chmod +x {REMOTE_DIR}/AILearnAPI.Api")
stdout.channel.recv_exit_status()

# Start service
print("▶️  Starting service...")
stdin, stdout, stderr = ssh.exec_command("systemctl start ailearn-api && sleep 5")
stdout.channel.recv_exit_status()

# Test
print("🧪 Testing API...")
stdin, stdout, stderr = ssh.exec_command("""curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"Hello","topicId":"test"}' --max-time 30""")
result = stdout.read().decode()

import json
if result and len(result) > 10:
    try:
        data = json.loads(result)
        if data.get('success'):
            print(f"✅ API working! Response length: {len(data.get('explanation', ''))} chars")
        else:
            print(f"⚠️  API returned: {result[:200]}")
    except:
        print(f"⚠️  Response: {result[:200]}")
else:
    print("⚠️  No response yet (may need more time)")

sftp.close()
ssh.close()
print("\n✅ Deployment complete!")
