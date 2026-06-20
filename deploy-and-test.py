#!/usr/bin/env python3
"""Deploy and test the fixed backend"""

import paramiko
import os
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"
PUBLISH_DIR = r"d:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Api\publish"
REMOTE_DIR = "/var/www/ai-learn-api"

print("🚀 Deploying fixed backend (cancellation token fix)...\n")

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
        remote_dir_path = os.path.dirname(remote_path)
        try:
            sftp.stat(remote_dir_path)
        except:
            ssh.exec_command(f"mkdir -p {remote_dir_path}")
            time.sleep(0.1)
        sftp.put(local_path, remote_path)
        uploaded += 1
        if uploaded % 10 == 0:
            print(f"  {uploaded} files...")

print(f"✅ Uploaded {uploaded} files")
sftp.close()

# Fix appsettings MaxTokens
stdin, stdout, stderr = ssh.exec_command("sed -i 's/\"MaxTokens\": 2048/\"MaxTokens\": 512/' /var/www/ai-learn-api/appsettings.json")
stdout.channel.recv_exit_status()

# Set permissions and start
stdin, stdout, stderr = ssh.exec_command(f"chmod +x {REMOTE_DIR}/AILearnAPI.Api")
stdout.channel.recv_exit_status()

print("▶️  Starting service...")
stdin, stdout, stderr = ssh.exec_command("systemctl start ailearn-api && sleep 4")
stdout.channel.recv_exit_status()

# Check status
stdin, stdout, stderr = ssh.exec_command("systemctl is-active ailearn-api")
status = stdout.read().decode().strip()
print(f"Service: {status}\n")

if status == "active":
    # Test health (instant)
    print("🏥 Health check:")
    stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:5001/api/health")
    health = stdout.read().decode()
    print(f"   {health}\n")
    
    # Now test AI endpoint
    print("🤖 Testing AI endpoint (waiting up to 60s)...")
    test_cmd = """curl -s -w "\\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2? Give a short answer.","topicId":"math","maxTokens":256}' \
--max-time 90"""
    
    start = time.time()
    stdin, stdout, stderr = ssh.exec_command(test_cmd)
    
    for i in range(9):
        if stdout.channel.exit_status_ready():
            break
        elapsed = time.time() - start
        print(f"  {elapsed:.0f}s...")
        time.sleep(10)
    
    result = stdout.read().decode()
    elapsed = time.time() - start
    
    if result and "\"success\":true" in result:
        lines = result.split('\n')
        time_line = [l for l in lines if l.startswith('TIME:')]
        response_json = '\n'.join([l for l in lines if not l.startswith('TIME:')])
        data = json.loads(response_json)
        explanation = data.get('explanation', '')
        
        print(f"\n✅ AI WORKING! Response in {elapsed:.1f}s")
        print(f"   Length: {len(explanation)} chars, Tokens: {data.get('tokensUsed', '?')}")
        print(f"   Preview: {explanation[:150]}...")
        print(f"\n🎉 Platform is LIVE and working!")
        print(f"   Visit: https://learnwithai.tech")
    else:
        print(f"\n⚠️  Response: {result[:300]}")
        # Check logs
        stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 5 --no-pager")
        print(stdout.read().decode())

ssh.close()
