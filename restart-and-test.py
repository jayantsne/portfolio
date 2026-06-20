#!/usr/bin/env python3
"""Restart backend and test with 3B model"""

import paramiko
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

print("🔄 Restarting backend with correct 3B configuration...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Restart service
print("1️⃣  Restarting ailearn-api service...")
stdin, stdout, stderr = ssh.exec_command("systemctl restart ailearn-api && sleep 5")
stdout.channel.recv_exit_status()
print("   ✅ Restarted")

# Check status
stdin, stdout, stderr = ssh.exec_command("systemctl is-active ailearn-api")
status = stdout.read().decode().strip()
print(f"   Status: {status}")

# Test API
print("\n2️⃣  Testing API (should be FAST now with 3B model)...")
test_cmd = """curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","difficultyLevel":"easy","topicId":"math"}' \
--max-time 30"""

start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)
result = stdout.read().decode()
elapsed = time.time() - start

print(f"   Completed in {elapsed:.1f}s")

if "HTTP_CODE:200" in result:
    lines = result.split('\n')
    time_line = [l for l in lines if l.startswith('TIME:')]
    response = '\n'.join([l for l in lines if not l.startswith('HTTP_CODE:') and not l.startswith('TIME:')])
    
    print(f"   ✅ SUCCESS!")
    print(f"   {time_line[0] if time_line else ''}")
    print(f"   Response length: {len(response)} chars")
    print(f"   Preview: {response[:150]}...")
else:
    print(f"   ❌ Failed")
    print(f"   Result: {result[:500]}")
    
    # Check logs
    print("\n   Checking logs...")
    stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 10 --no-pager")
    logs = stdout.read().decode()
    print(logs)

# Verify model is still loaded
print("\n3️⃣  Verifying model status...")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:11434/api/ps | jq '.models[]|{name,size}'")
models = stdout.read().decode()
print(models)

ssh.close()
print("\n" + "="*60)
print("🎉 If test passed, AI should now be working!")
print("="*60)
