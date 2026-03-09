#!/usr/bin/env python3
"""Quick diagnostics"""

import paramiko
import json

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

print("1. Ollama status:")
stdin, stdout, stderr = ssh.exec_command("systemctl is-active ollama")
print(f"   {stdout.read().decode().strip()}")

print("\n2. Ollama direct test:")
stdin, stdout, stderr = ssh.exec_command("""curl -s -X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Hi","stream":false}' --max-time 10""")
result = stdout.read().decode()
if result:
    data = json.loads(result)
    duration = data.get('total_duration', 0) / 1e9
    print(f"   ✅ Ollama OK - {duration:.2f}s")
else:
    print("   ❌ Ollama not responding")

print("\n3. Backend status:")
stdin, stdout, stderr = ssh.exec_command("systemctl is-active ailearn-api")
print(f"   {stdout.read().decode().strip()}")

print("\n4. Recent backend errors:")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api --since '5 minutes ago' | grep -i exception | tail -2")
errors = stdout.read().decode()
print(f"   {errors if errors.strip() else 'None'}")

print("\n5. Current appsettings MaxTokens:")
stdin, stdout, stderr = ssh.exec_command("grep MaxTokens /var/www/ai-learn-api/appsettings.json")
print(f"   {stdout.read().decode().strip()}")

ssh.close()
