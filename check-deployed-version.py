#!/usr/bin/env python3
"""Check what version of backend is actually running"""

import paramiko
import hashlib

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

print("🔍 Checking deployed backend version...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Check file modification time
print("1️⃣  Backend binary modification time:")
stdin, stdout, stderr = ssh.exec_command("ls -lh /var/www/ai-learn-api/AILearnAPI.Api")
result = stdout.read().decode()
print(result)

# Check Program.cs content  (it's in the DLL but let's check appsettings)
print("\n2️⃣  Current appsettings.json on server:")
stdin, stdout, stderr = ssh.exec_command("cat /var/www/ai-learn-api/appsettings.json | head -30")
config = stdout.read().decode()
print(config)

# Check Process info
print("\n3️⃣  Running process:")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep AILearnAPI.Api | grep -v grep")
proc = stdout.read().decode()
print(proc)

# Try running backend manually for diagnostic output
print("\n4️⃣  Attempting manual start to see error:")
stdin, stdout, stderr = ssh.exec_command("cd /var/www/ai-learn-api && timeout 10 ./AILearnAPI.Api 2>&1 | head -50")
output = stdout.read().decode()
error = stderr.read().decode()
print("STDOUT:")
print(output if output else "(empty)")
print("\nSTDERR:")
print(error if error else "(empty)")

ssh.close()
