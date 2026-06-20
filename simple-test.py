#!/usr/bin/env python3
"""Simple final test"""

import paramiko
import json

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

print("🧪 Final Test\n")

# Test 1: Health check
stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:5001/api/health")
print(f"Health: {stdout.read().decode()}\n")

# Test 2: AI with max 30 second generation
print("Testing AI (please wait ~30-60s)...")
stdin, stdout, stderr = ssh.exec_command("""curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"Hello","topicId":"test","maxTokens":128}' \
--max-time 90""")

result = stdout.read().decode()
if result:
    try:
        data = json.loads(result)
        if data.get('success'):
            print(f"✅ SUCCESS!")
            print(f"   Length: {len(data.get('explanation', ''))} chars")
            print(f"   Preview: {data.get('explanation', '')[:150]}...")
        else:
            print(f"   Error: {data.get('error')}")
    except:
        print(f"   Raw: {result[:300]}")
else:
    print("   ❌ Timeout/no response")

# Check latest logs
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 3 --no-pager | tail -3")
logs = stdout.read().decode()
if "exception" in logs.lower():
    print(f"\n⚠️  Error in logs: {logs[:300]}")

ssh.close()
print("\n" + "="*60)
print("Your AI platform is deployed at: https://learnwithai.tech")
print("Backend API: https://learnwithai.tech/api/ai/ollama")
print("="*60)
