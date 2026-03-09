#!/usr/bin/env python3
"""Investigate why 7B model keeps loading"""

import paramiko
import json

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🔍 Investigating model configuration...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

#Check appsettings.json
print("1️⃣  Current appsettings.json:")
stdin, stdout, stderr = ssh.exec_command("cat /var/www/ai-learn-api/appsettings.json")
config = stdout.read().decode()
print(config)

# Check if there's an appsettings.Production.json
print("\n2️⃣  Checking for appsettings.Production.json...")
stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/ai-learn-api/appsettings*.json")
files = stdout.read().decode()
print(files)

# Check environment variable
print("\n3️⃣  Checking ASPNETCORE_ENVIRONMENT...")
stdin, stdout, stderr = ssh.exec_command("grep Environment /etc/systemd/system/ailearn-api.service")
env = stdout.read().decode()
if env:
    print(env)
else:
    print("   Not set in service file")

# Force unload 7B and load 3B again
print("\n4️⃣  Fixing: Unload 7B, load 3B...")
stdin, stdout, stderr = ssh.exec_command("""
curl -s -X POST http://localhost:11434/api/generate -d '{"model":"qwen2.5:7b-instruct-q4_K_M","keep_alive":0}' > /dev/null
sleep 2
curl -s -X POST http://localhost:11434/api/generate -d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Hi","stream":false,"keep_alive":"30m"}'
""")
result = stdout.read().decode()
if result:
    data = json.loads(result)
    print(f"   ✅ 3B loaded in {data.get('total_duration', 0) / 1e9:.2f}s")

# Verify
print("\n5️⃣  Verifying loaded model...")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:11434/api/ps | jq -r '.models[].name'")
model = stdout.read().decode().strip()
print(f"   Currently loaded: {model}")

# Update all appsettings files to use 3B
print("\n6️⃣  Updating ALL appsettings files...")
stdin, stdout, stderr = ssh.exec_command("""cd /var/www/ai-learn-api && \
for file in appsettings*.json; do \
  if [ -f "$file" ]; then \
    sed -i 's/qwen2.5:7b-instruct-q4_K_M/qwen2.5:3b-instruct-q4_0/g' "$file"; \
    echo "Updated: $file"; \
    grep '"Model"' "$file"; \
  fi; \
done""")
output = stdout.read().decode()
print(output)

ssh.close()
print("\n✅ Configuration fixed!")
