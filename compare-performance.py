#!/usr/bin/env python3
"""Compare Ollama direct vs backend performance"""

import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("⚡ Comparing Ollama direct vs Backend performance...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Test 1: Ollama direct with 256 tokens
print("1️⃣  Testing Ollama DIRECTLY with num_predict=256:")
test_cmd = """curl -s -X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"What is 2+2? Answer briefly.","stream":false,"options":{"num_predict":256}}' \
--max-time 30"""

start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)
result = stdout.read().decode()
elapsed = time.time() - start

if result:
    try:
        data = json.loads(result)
        duration = data.get('total_duration', 0) / 1e9
        response_text = data.get('response', '')
        eval_count = data.get('eval_count', 0)
        
        print(f"   ✅ Ollama responded in {elapsed:.2f}s (total_duration={duration:.2f}s)")
        print(f"   Tokens generated: {eval_count}")
        print(f"   Response: {response_text[:150]}...")
    except Exception as e:
        print(f"   Error parsing: {e}")
        print(f"   Raw: {result[:200]}")
else:
    print(f"   ❌ No response")

# Test 2: Backend API
print("\n2️⃣  Testing Backend API:")
test_cmd = """curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2? Answer briefly.","difficultyLevel":"easy","topicId":"math","maxTokens":256}' \
--max-time 30"""

start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)
result = stdout.read().decode()
elapsed = time.time() - start

print(f"   Request completed in {elapsed:.2f}s")

if result and len(result) > 10:
    try:
        data = json.loads(result)
        if data.get('success'):
            print(f"   ✅ Backend responded successfully")
            print(f"   Explanation length: {len(data.get('explanation', ''))} chars")
            print(f"   Preview: {data.get('explanation', '')[:150]}...")
        else:
            print(f"   ❌ Backend returned error: {data.get('error', 'Unknown')}")
    except:
        print(f"   Response (not JSON): {result[:200]}")
else:
    print(f"   ❌ Timeout or empty response")
    
    # Check what error occurred
    stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 5 --no-pager | tail -3")
    logs = stdout.read().decode()
    if "Exception" in logs:
        print(f"   Latest error: {logs[:300]}")

# Test 3: Check what the backend is actually sending to Ollama
print("\n3️⃣  Checking backend logs to see what it's sending to Ollama:")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api --since '2 minutes ago' | grep 'Calling Ollama' | tail -2")
logs = stdout.read().decode()
if logs:
    print(logs)
else:
    print("   No recent 'Calling Ollama' logs")

# Test 4: Try a simpler endpoint
print("\n4️⃣  Testing backend health endpoint:")
stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:5001/api/ai/health")
result = stdout.read().decode()
if result:
    print(f"   {result}")
else:
    print("   ❌ No response")

ssh.close()
print("\n" + "="*60)
print("DIAGNOSIS:")
print("If Ollama direct is fast but backend is slow,")
print("there's an issue with the backend HttpClient or timeout handling.")
print("="*60)
