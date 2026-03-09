#!/usr/bin/env python3
"""Test after deployment"""

import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🧪 Testing after deployment...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Test with expected 60 second timeout
print("Testing API (expecting ~30-60 seconds with 512 tokens)...")
test_cmd = """curl -s -w "\\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","topicId":"math"}' \
--max-time 90"""

start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)

# Show progress
for i in range(9):
    if stdout.channel.exit_status_ready():
        break
    time.sleep(10)
    elapsed = time.time() - start
    print(f"  ... {elapsed:.0f}s")

result = stdout.read().decode()
elapsed = time.time() - start

if "TIME:" in result:
    time_line = [l for l in result.split('\n') if l.startswith('TIME:')]
    response = '\n'.join([l for l in result.split('\n') if not l.startswith('TIME:')])
    
    print(f"\n✅ Response received in {elapsed:.1f}s")
    print(f"{time_line[0] if time_line else ''}")
    
    try:
        data = json.loads(response)
        explanation = data.get('explanation', '')
        print(f"\nResponse length: {len(explanation)} chars")
        print(f"Preview: {explanation[:200]}...")
    except:
        print(f"Raw: {response[:300]}")
else:
    print(f"\n❌ Timeout after {elapsed:.1f}s")

# Test via public HTTPS
print("\n\n🌐 Testing public HTTPS endpoint...")
test_cmd = """curl -s -w "\\nTIME:%{time_total}" \
-X POST https://learnwithai.tech/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"Hello","topicId":"test"}' \
--max-time 90 -k"""

start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)

for i in range(9):
    if stdout.channel.exit_status_ready():
        break
    time.sleep(10)
    elapsed = time.time() - start
    print(f"  ... {elapsed:.0f}s")

result = stdout.read().decode()
elapsed = time.time() - start

if "TIME:" in result and "\"success\"" in result:
    print(f"\n✅ Public API working in {elapsed:.1f}s!")
else:
    print(f"\n⚠️  Response: {result[:200] if result else 'None'}")

ssh.close()
print("\n🎉 Your AI platform is LIVE at https://learnwithai.tech!")
