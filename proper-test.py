#!/usr/bin/env python3
"""Proper API test with progress monitoring"""

import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🧪 Testing API with proper wait...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Start the test
test_cmd = """curl -s -w "\\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2? Be brief.","topicId":"test","maxTokens":256}' \
--max-time 90"""

print("Requesting AI response (maxTokens=256)...")
start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)

# Monitor progress
for i in range(9):
    if stdout.channel.exit_status_ready():
        break 
    elapsed = time.time() - start
    print(f"  {elapsed:.0f}s...")
    time.sleep(10)

result = stdout.read().decode()
elapsed = time.time() - start

print(f"\nCompleted in {elapsed:.1f}s\n")

if "TIME:" in result:
    lines = result.split('\n')
    time_line = [l for l in lines if l.startswith('TIME:')]
    response_json = '\n'.join([l for l in lines if not l.startswith('TIME:')])
    
    print(f"Curl time: {time_line[0] if time_line else 'Unknown'}")
    
    try:
        data = json.loads(response_json)
        if data.get('success'):
            explanation = data.get('explanation', '')
            print(f"\n✅ SUCCESS!")
            print(f"Response length: {len(explanation)} chars")
            print(f"Processing time: {data.get('processingTimeMs', 0)}ms")
            print(f"Tokens: {data.get('tokensUsed', 0)}")
            print(f"\nPreview:\n{explanation[:250]}...")
        else:
            print(f"\n❌ Error: {data.get('error', 'Unknown')}")
            print(f"Details: {data.get('details', '')}")
    except Exception as e:
        print(f"\n⚠️  Could not parse JSON: {e}")
        print(f"Raw response: {response_json[:500]}")
else:
    print(f"❌ Timeout or invalid response")
    print(f"Output: {result[:300]}")

ssh.close()

print("\n" + "="*70)
print("🎯 Your AI Learning Platform:")
print("   Frontend: https://learnwithai.tech")
print("   API: https://learnwithai.tech/api/ai/ollama")
print("="*70)
