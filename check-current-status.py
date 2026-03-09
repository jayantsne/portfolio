#!/usr/bin/env python3
"""Check current status of backend and test response time"""

import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🔍 Checking current backend status...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Check current MaxTokens setting
print("1️⃣  Current MaxTokens setting:")
stdin, stdout, stderr = ssh.exec_command("grep -A 5 'OllamaSettings' /var/www/ai-learn-api/appsettings.json")
config = stdout.read().decode()
print(config)

# Check service status
print("\n2️⃣  Backend service status:")
stdin, stdout, stderr = ssh.exec_command("systemctl status ailearn-api --no-pager -n 3")
status = stdout.read().decode()
print(status[:500])

# Check loaded model
print("\n3️⃣  Currently loaded Ollama model:")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:11434/api/ps")
result = stdout.read().decode()
if result:
    data = json.loads(result)
    for model in data.get('models', []):
        print(f"   {model['name']} - {model['size'] / (1024**3):.2f} GB")

# Test with smaller max tokens
print("\n4️⃣  Testing API with maxTokens=256 (should be quick)...")
test_cmd = """curl -s -w "\\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","difficultyLevel":"easy","topicId":"math","maxTokens":256}' \
--max-time 45"""

start = time.time()
stdin, stdout, stderr = ssh.exec_command(test_cmd)
result = stdout.read().decode()
elapsed = time.time() - start

if "TIME:" in result:
    time_line = [l for l in result.split('\n') if l.startswith('TIME:')]
    response = result.replace('\n'.join(time_line), '').strip()
    
    print(f"   ✅ Response received in {elapsed:.1f}s")
    print(f"   {time_line[0] if time_line else ''}")
    
    # Try to parse as JSON
    try:
        data = json.loads(response)
        explanation = data.get('explanation', data.get('answer', ''))[:200]
        print(f"   Response preview: {explanation}...")
        print(f"   Success: {data.get('success', 'N/A')}")
    except:
        print(f"   Raw response: {response[:200]}...")
else:
    print(f"   ❌ Timeout or error")
    print(f"   Output: {result[:300]}")

# Check for recent errors
print("\n5️⃣  Recent backend errors:")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api --since '5 minutes ago' | grep -i exception | tail -3")
errors = stdout.read().decode()
if errors.strip():
    print(errors)
else:
    print("   ✅ No recent errors")

ssh.close()
print("\n" + "="*60)
print("DIAGNOSIS:")
print("="*60)
