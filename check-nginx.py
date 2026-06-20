#!/usr/bin/env python3
"""Check nginx timeout config"""

import paramiko

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

stdin, stdout, stderr = ssh.exec_command("grep -n 'proxy_read_timeout\\|proxy_send_timeout\\|keepalive_timeout\\|send_timeout' /etc/nginx/sites-available/learnwithai.tech.conf")
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command("cat /etc/nginx/sites-available/learnwithai.tech.conf | grep -A 20 'location /api'")
print(stdout.read().decode())

ssh.close()
