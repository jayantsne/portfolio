#!/usr/bin/env python3
"""Generate SSH key, install on VPS, print private key for GitHub Secrets."""
import paramiko
import os

KEY_PATH = os.path.expanduser(r'~\.ssh\github_actions_learnwithai')

# Generate key if not exists
if not os.path.exists(KEY_PATH):
    key = paramiko.RSAKey.generate(4096)
    key.write_private_key_file(KEY_PATH)
    with open(KEY_PATH + '.pub', 'w') as f:
        f.write(f'ssh-rsa {key.get_base64()} github-actions-learnwithai')
    print('Generated new SSH key')
else:
    key = paramiko.RSAKey(filename=KEY_PATH)
    print('Using existing SSH key')

pub_key = open(KEY_PATH + '.pub').read().strip()
print(f'Public key (first 60 chars): {pub_key[:60]}...')

# Install public key on server
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('76.13.244.113', username='root', password='<DEPLOY_SSH_PASSWORD>', timeout=30)
print('Connected to server')

cmd = (
    'mkdir -p ~/.ssh && chmod 700 ~/.ssh && '
    f'grep -qxF "{pub_key}" ~/.ssh/authorized_keys 2>/dev/null || '
    f'echo "{pub_key}" >> ~/.ssh/authorized_keys && '
    'chmod 600 ~/.ssh/authorized_keys && echo OK'
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f'Server response: {out or "(no output)"}')
if err:
    print(f'Stderr: {err}')
client.close()

# Print private key
print()
print('=' * 60)
print('Copy the text below as GitHub Secret: VPS_SSH_PRIVATE_KEY')
print('=' * 60)
print(open(KEY_PATH).read())
print('=' * 60)
print()
print('Steps to add:')
print('  1. Go to your GitHub repo')
print('  2. Settings → Secrets and variables → Actions')
print('  3. New repository secret')
print('  4. Name: VPS_SSH_PRIVATE_KEY')
print('  5. Paste the key above → Save')
print()
print('Once added, every push to main auto-deploys frontend + backend!')
