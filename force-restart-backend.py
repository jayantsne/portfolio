#!/usr/bin/env python3
"""Force restart and watch startup"""

import paramiko
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🔄 Force restarting backend...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Kill any hung processes
print("1️⃣  Stopping service...")
stdin, stdout, stderr = ssh.exec_command("systemctl stop ailearn-api")
stdout.channel.recv_exit_status()
time.sleep(2)

# Make sure it's really dead
stdin, stdout, stderr = ssh.exec_command("pkill -9 -f AILearnAPI.Api")
stdout.channel.recv_exit_status()
time.sleep(1)

# Start fresh
print("2️⃣  Starting service...")
stdin, stdout, stderr = ssh.exec_command("systemctl start ailearn-api")
stdout.channel.recv_exit_status()

print("3️⃣  Waiting for startup...")
time.sleep(5)

# Watch the logs as it starts
print("4️⃣  Startup logs:")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 20 --no-pager")
logs = stdout.read().decode()
print(logs)

# Test immediately
print("\n5️⃣  Testing health endpoint:")
for i in range(3):
    stdin, stdout, stderr = ssh.exec_command("timeout 3 curl -s http://127.0.0.1:5001/api/ai/health")
    result = stdout.read().decode()
    if result:
        print(f"   ✅ Response: {result}")
        break
    else:
        print(f"   Attempt {i+1}: No response, waiting...")
        time.sleep(2)

ssh.close()
