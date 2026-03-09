#!/usr/bin/env python3
"""Diagnose why backend isn't responding"""

import paramiko
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🔍 Diagnosing backend communication issue...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Check if backend is listening on port 5001
print("1️⃣  Checking if backend is listening on port 5001:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp | grep 5001")
result = stdout.read().decode()
if result:
    print(f"   ✅ Port 5001: {result.strip()}")
else:
    print("   ❌ Backend NOT listening on port 5001!")

# Check service logs from startup
print("\n2️⃣  Backend startup logs (last 30 lines):")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 30 --no-pager")
logs = stdout.read().decode()
print(logs)

# Check if there are any binding errors
print("\n3️⃣  Checking for port binding errors:")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api | grep -i 'address.*use\\|bind\\|listen' | tail -5")
errors = stdout.read().decode()
if errors:
    print(errors)
else:
    print("   No binding errors found")

# Try restarting the service
print("\n4️⃣  Restarting backend service...")
stdin, stdout, stderr = ssh.exec_command("systemctl restart ailearn-api")
stdout.channel.recv_exit_status()
time.sleep(5)

# Check status after restart
stdin, stdout, stderr = ssh.exec_command("systemctl status ailearn-api --no-pager -n 10")
status = stdout.read().decode()
print(status[:1000])

# Check port again
print("\n5️⃣  Checking port 5001 again:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp | grep 5001")
result = stdout.read().decode()
if result:
    print(f"   ✅ {result.strip()}")
else:
    print("   ❌ Still not listening!")

# Quick test
print("\n6️⃣  Quick health check:")
stdin, stdout, stderr = ssh.exec_command("curl -s -m 5 http://127.0.0.1:5001/api/ai/health")
result = stdout.read().decode()
if result:
    print(f"   ✅ {result}")
else:
    print("   ❌ No response")

ssh.close()
print("\n" + "="*60)
