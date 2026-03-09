#!/usr/bin/env python3
"""Restart Ollama and fix configuration"""

import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🔄 Restarting Ollama and fixing configuration...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Restart Ollama
print("1️⃣  Restarting Ollama...")
stdin, stdout, stderr = ssh.exec_command("systemctl restart ollama && sleep 3")
stdout.channel.recv_exit_status()
print("   ✅ Restarted")

# Pre-load 3B model
print("\n2️⃣  Pre-loading 3B model...")
stdin, stdout, stderr = ssh.exec_command("""curl -s -X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Hi","stream":false,"keep_alive":"30m"}'""")
result = stdout.read().decode()
if result:
    data = json.loads(result)
    duration = data.get('total_duration', 0) / 1e9
    print(f"   ✅ Model loaded in {duration:.2f}s")
else:
    print("   ❌ Failed to load model")

# Update appsettings.json to use 512 maxTokens
print("\n3️⃣  Updating MaxTokens to 512...")
stdin, stdout, stderr = ssh.exec_command("""cd /var/www/ai-learn-api && \
sed -i 's/"MaxTokens": 2048/"MaxTokens": 512/g' appsettings.json && \
grep MaxTokens appsettings.json""")
print(f"   {stdout.read().decode().strip()}")

# Restart backend
print("\n4️⃣  Restarting backend...")
stdin, stdout, stderr = ssh.exec_command("systemctl restart ailearn-api && sleep 5")
stdout.channel.recv_exit_status()
print("   ✅ Restarted")

# Test
print("\n5️⃣  Testing API (maxTokens=128 for speed)...")
stdin, stdout, stderr = ssh.exec_command("""curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","topicId":"test","maxTokens":128}' \
--max-time 60""")

time.sleep(10)  # Initial wait
print("   Waiting...")

result = stdout.read().decode()
if result and len(result) > 50:
    try:
        data = json.loads(result)
        if data.get('success'):
            print(f"   ✅ SUCCESS! Length: {len(data.get('explanation', ''))} chars")
            print(f"   Preview: {data.get('explanation', '')[:100]}...")
        else:
            print(f"   Response: {result[:200]}")
    except:
        print(f"   Raw: {result[:200]}")
else:
    print(f"   ⚠️  Short/no response: {result[:100] if result else 'None'}")

ssh.close()
print("\n✅ Restart complete!")
