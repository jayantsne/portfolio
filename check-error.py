#!/usr/bin/env python3
"""Check backend logs for the actual error"""

import paramiko

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

print("📋 Latest backend error:\n")

stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api --since '2 minutes ago' -n 50 --no-pager")
logs = stdout.read().decode()

# Find the exception
lines = logs.split('\n')
for i, line in enumerate(lines):
    if 'exception' in line.lower() or 'error' in line.lower():
        # Print context around the error
        start = max(0, i - 2)
        end = min(len(lines), i + 10)
        print('\n'.join(lines[start:end]))
        break

ssh.close()
