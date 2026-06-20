#!/usr/bin/env python3
"""Diagnose and fix Ollama models and Open WebUI on port 8080"""

import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

def run(cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    try:
        out = stdout.read().decode()
        err = stderr.read().decode()
        return out, err
    except:
        return "", ""

print("="*60)
print("🔍 DIAGNOSING SERVER ON PORT 8080")
print("="*60)

# What is running on port 8080
print("\n1. What is on port 8080:")
out, _ = run("ss -tlnp | grep 8080")
print(f"   {out.strip() or 'Nothing found'}")

out, _ = run("netstat -tlnp 2>/dev/null | grep 8080")
print(f"   {out.strip() or 'No netstat result'}")

# Check all running services
print("\n2. Services running:")
out, _ = run("systemctl list-units --type=service --state=running | grep -E 'ollama|webui|open|admin|model'")
print(out.strip() or "   None matching")

# Check for Open WebUI specifically
print("\n3. Checking for Open WebUI:")
out, _ = run("docker ps 2>/dev/null | grep -i 'webui\\|ollama\\|open'")
if out.strip():
    print(f"   Docker containers found:\n{out}")
else:
    print("   No docker containers (or docker not running)")

out, _ = run("docker ps -a 2>/dev/null | head -20")
if out.strip():
    print(f"\n   All containers:\n{out}")

# Check what process is on 8080
print("\n4. Process on port 8080:")
out, _ = run("fuser 8080/tcp 2>/dev/null")
if out.strip():
    pid = out.strip()
    print(f"   PID: {pid}")
    out2, _ = run(f"ps -p {pid} -o cmd --no-headers 2>/dev/null")
    print(f"   Command: {out2.strip()}")
else:
    out, _ = run("lsof -i :8080 2>/dev/null | head -5")
    print(out.strip() or "   Nothing found")

# Check Ollama models available
print("\n5. Ollama models available:")
out, _ = run("curl -s http://localhost:11434/api/tags")
if out.strip():
    try:
        data = json.loads(out)
        models = data.get('models', [])
        if models:
            for m in models:
                size_gb = m.get('size', 0) / (1024**3)
                print(f"   - {m['name']} ({size_gb:.2f} GB)")
        else:
            print("   No models installed")
    except:
        print(f"   Raw: {out[:200]}")
else:
    print("   Ollama not responding")

# Check Ollama service config
print("\n6. Ollama environment config:")
out, _ = run("cat /etc/systemd/system/ollama.service.d/override.conf 2>/dev/null")
print(out.strip() or "   No override config found")

out, _ = run("systemctl show ollama --property=Environment 2>/dev/null")
print(f"   {out.strip()}")

# Check if OLLAMA_HOST is set to allow external access
print("\n7. Ollama host binding:")
out, _ = run("curl -s http://0.0.0.0:11434/api/tags 2>/dev/null | head -50")
out2, _ = run("curl -s http://localhost:11434/api/tags 2>/dev/null | head -50")
if out2.strip():
    print("   ✅ Ollama accessible on localhost:11434")
else:
    print("   ❌ Ollama NOT accessible on localhost:11434")

# Check what open-webui is pointing to
print("\n8. Looking for Open WebUI config:")
out, _ = run("find / -name 'config.json' -path '*/open-webui/*' 2>/dev/null | head -5")
if out.strip():
    print(f"   Found: {out.strip()}")
    for path in out.strip().split('\n')[:2]:
        content, _ = run(f"cat '{path}'")
        print(f"   Content: {content[:300]}")
else:
    print("   No Open WebUI config found")

# Check docker-compose or docker run command
print("\n9. Docker run history / compose:")
out, _ = run("cat /root/docker-compose.yml 2>/dev/null || cat /opt/docker-compose.yml 2>/dev/null || cat /home/docker-compose.yml 2>/dev/null")
if out.strip():
    print(out[:500])
else:
    out, _ = run("find / -name 'docker-compose*' 2>/dev/null | head -5")
    if out.strip():
        print(f"   Found: {out.strip()}")
        firstfile = out.strip().split('\n')[0]
        content, _ = run(f"cat '{firstfile}'")
        print(f"   Content:\n{content[:500]}")
    else:
        print("   No docker-compose found")

# Check environment variables for the 8080 service
print("\n10. Systemd service on 8080:")
out, _ = run("grep -r '8080' /etc/systemd/system/ 2>/dev/null | head -10")
print(out.strip() or "   No systemd service on 8080")

ssh.close()
print("\n" + "="*60)
print("Diagnosis complete.")
print("="*60)
