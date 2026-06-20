#!/usr/bin/env python3
"""Test correct health endpoints"""

import paramiko
import json

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

print("✅ Testing correct health endpoints...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Test /api/health
print("1️⃣  Testing /api/health:")
stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:5001/api/health")
result = stdout.read().decode()
print(f"   {result}\n")

# Test /api/ai/ollama/health  
print("2️⃣  Testing /api/ai/ollama/health:")
stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:5001/api/ai/ollama/health")
result = stdout.read().decode()
print(f"   {result}\n")

# Now test the ACTUAL API endpoint
print("3️⃣  Testing /api/ai/ollama (AI generation) with 90s timeout:")
test_cmd = """curl -s -w "\\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","difficultyLevel":"easy","topicId":"math","maxTokens":256}' \
--max-time 90"""

import time
start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)

# Show progress
for i in range(9):
    if stdout.channel.exit_status_ready():
        break
    time.sleep(10)
    print(f"   ... waiting ({(i+1)*10}s)")

result = stdout.read().decode()
elapsed = time.time() - start

if "TIME:" in result:
    time_line = [l for l in result.split('\n') if l.startswith('TIME:')]
    response = '\n'.join([l for l in result.split('\n') if not l.startswith('TIME:')])
    
    print(f"\n   ✅ Response received after {elapsed:.1f}s")
    print(f"   {time_line[0] if time_line else ''}")
    
    try:
        data = json.loads(response)
        if data.get('success'):
            print(f"   Success: TRUE")
            print(f"   Answer length: {len(data.get('explanation', ''))} chars")
            print(f"   Preview: {data.get('explanation', '')[:200]}...")
        else:
            print(f"   Success: FALSE")
            print(f"   Error: {data.get('error', 'Unknown')}")
    except:
        print(f"   Raw response: {response[:300]}...")
else:
    print(f"\n   ❌ Timeout after {elapsed:.1f}s")

ssh.close()
print("\n" + "="*60)
