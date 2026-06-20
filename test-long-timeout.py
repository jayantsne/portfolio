#!/usr/bin/env python3
"""Test with 3-minute timeout"""

import paramiko
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

print("⏱️  Testing with 3-minute timeout...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# Test health endpoint first (should be instant)
print("1️⃣  Testing health endpoint (should be instant):")
start = time.time()
stdin, stdout, stderr = ssh.exec_command("timeout 10 curl -v http://127.0.0.1:5001/api/ai/health 2>&1 | tail -20")
result = stdout.read().decode()
elapsed = time.time() - start
print(f"Elapsed: {elapsed:.1f}s")
print(result)

if"HTTP/1.1 200" in result or '{"healthy"' in result:
    print("✅ Health endpoint works!")
else:
    print("❌ Health endpoint failed/timeout")
    
    # If health doesn't work, backend is completely broken
    print("\n⚠️  Backend is not responding at all. Let's check why...")
    
    # Check if it's even listening
    stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep :5001")
    port_info = stdout.read().decode()
    print(f"Port 5001: {port_info}")
    
    # Get latest logs
    stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 10 --no-pager | tail -10")
    logs = stdout.read().decode()
    print(f"\nLatest logs:\n{logs}")

ssh.close()
