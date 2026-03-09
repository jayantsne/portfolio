#!/usr/bin/env python3
"""Test backend directly (bypass nginx) and with full logging"""

import paramiko
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🔍 Testing backend DIRECTLY (bypassing nginx)...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# First, confirm Ollama is working
print("1️⃣  Quick Ollama test...")
stdin, stdout, stderr = ssh.exec_command("""curl -s -w "\nTIME:%{time_total}" \
-X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Test","stream":false}' \
--max-time 15""")
result = stdout.read().decode()
if "TIME:" in result:
    time_line = [l for l in result.split('\n') if l.startswith('TIME:')]
    print(f"   ✅ Ollama: {time_line[0] if time_line else 'Quick'}")
else:
    print(f"   ❌ Ollama failed")

# Test backend with VERY short timeout to see what happens
print("\n2️⃣  Testing backend with 60 second timeout (direct call)...")
test_cmd = """curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","difficultyLevel":"easy","topicId":"math"}' \
--max-time 60 2>&1"""

# Start the request
print("   Sending request...")
start_time = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)

# Wait and show progress
for i in range(6):
    time.sleep(10)
    elapsed = time.time() - start_time
    print(f"   ... still waiting ({elapsed:.0f}s)")
    if stdout.channel.exit_status_ready():
        break

result = stdout.read().decode()
elapsed = time.time() - start_time

print(f"\n   Request completed after {elapsed:.1f}s")

if "HTTP_CODE:200" in result:
    print("   ✅ SUCCESS!")
    lines = result.split('\n')
    response = '\n'.join([l for l in lines if not l.startswith('HTTP_CODE:') and not l.startswith('TIME:')])
    print(f"   Response: {response[:200]}...")
elif "HTTP_CODE:" in result:
    code_line = [l for l in result.split('\n') if l.startswith('HTTP_CODE:')]
    print(f"   ❌ Failed with {code_line[0] if code_line else 'unknown code'}")
    print(f"   Full output: {result[:500]}")
else:
    print(f"   ❌ No HTTP response received")
    print(f"   Output: {result[:500]}")

# Check logs immediately
print("\n3️⃣  Checking logs from last minute...")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api --since '1 minute ago' -n 50 --no-pager")
logs = stdout.read().decode()
if "Exception" in logs or "Error" in logs:
    print("   ❌ Errors found:")
    error_lines = [l for l in logs.split('\n') if 'Exception' in l or 'Error' in l]
    for line in error_lines[:10]:
        print(f"   {line}")
else:
    print("   ✅ No errors in last minute")  

# Show what model is loaded
print("\n4️⃣  Currently loaded model:")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:11434/api/ps | jq -r '.models[].name'")
models = stdout.read().decode().strip()
if models:
    print(f"   {models}")
else:
    print("   No models loaded")

ssh.close()
print("\n" + "="*60)
