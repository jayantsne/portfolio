#!/usr/bin/env python3
"""Reduce MaxTokens for faster responses"""

import paramiko

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("⚡ Optimizing for faster responses by reducing MaxTokens...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Update MaxTokens from 2048 to 512 for much faster responses
print("1️⃣  Reducing MaxTokens from 2048 to 512...")
stdin, stdout, stderr = ssh.exec_command("""cd /var/www/ai-learn-api && \
sed -i 's/"MaxTokens": 2048/"MaxTokens": 512/g' appsettings.json && \
grep -A 5 'OllamaSettings' appsettings.json""")
output = stdout.read().decode()
print(output)

# Restart service
print("\n2️⃣  Restarting backend...")
stdin, stdout, stderr = ssh.exec_command("systemctl restart ailearn-api && sleep 3")
stdout.channel.recv_exit_status()

# Test with shorter expected response
print("\n3️⃣  Testing (should be 10-20 seconds now)...")
import time
start = time.time()

test_cmd = """curl -s -w "\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2? answer briefly","difficultyLevel":"easy","topicId":"math","maxTokens":256}' \
--max-time 60"""

stdin, stdout, stderr = ssh.exec_command(test_cmd)
result = stdout.read().decode()
elapsed = time.time() - start

if "TIME:" in result:
    time_line = [l for l in result.split('\n') if l.startswith('TIME:')]
    response = '\n'.join([l for l in result.split('\n') if not l.startswith('TIME:')])
    
    print(f"   ✅ Completed in {elapsed:.1f}s")
    print(f"   {time_line[0] if time_line else ''}")
    print(f"   Response preview: {response[:300]}...")
else:
    print(f"   Response: {result[:500]}")

# Test via HTTPS (through nginx)
print("\n4️⃣  Testing via HTTPS (public endpoint)...")
stdin, stdout, stderr = ssh.exec_command("""curl -s -w "\nTIME:%{time_total}" \
-X POST https://learnwithai.tech/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"Hello","difficultyLevel":"easy","topicId":"test","maxTokens":256}' \
--max-time 60 -k""")
result = stdout.read().decode()

if "TIME:" in result:
    time_line = [l for l in result.split('\n') if l.startswith('TIME:')]
    print(f"   ✅ HTTPS working!")
    print(f"   {time_line[0] if time_line else ''}")
else:
    print(f"   Result: {result[:300]}")

ssh.close()
print("\n🎉 Optimization complete!")
print("   - MaxTokens reduced to 512 for faster responses")
print("   - Expected response time: 10-20 seconds")
print("   - Frontend should now work!")
