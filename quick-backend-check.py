#!/usr/bin/env python3
"""Simple check - is backend listening and responding"""

import paramiko

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

print("🔍 Quick backend check:\n")

# Port check
stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep :5001")
port = stdout.read().decode()
print(f"Port 5001: {port if port else '❌ NOT LISTENING'}\n")

# Service status
stdin, stdout, stderr = ssh.exec_command("systemctl is-active ailearn-api")
active = stdout.read().decode().strip()
print(f"Service: {active}\n")

# Recent logs (just errors)
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api -n 20 --no-pager | grep -E 'error|Error|ERROR|fail|Fail|FAIL|exception|Exception'")
errors = stdout.read().decode()
if errors:
    print("Recent errors:")
    print(errors)
else:
    print("✅ No recent errors\n")

# Test health endpoint
stdin, stdout, stderr = ssh.exec_command("timeout 5 curl -s http://127.0.0.1:5001/api/ai/health")
health = stdout.read().decode()
print(f"Health check: {health if health else '❌ Timeout/No response'}")

ssh.close()
