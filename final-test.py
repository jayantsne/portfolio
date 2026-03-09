#!/usr/bin/env python3
"""Final verification test + cleanup"""

import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

def run(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

print("="*60)
print("🔍 FINAL VERIFICATION")
print("="*60)

# Remove old large models
print("\n🗑️  Removing old llama3.1 models (free RAM)...")
for model in ["llama3.1:latest", "llama3.1:8b"]:
    out, err = run(f"ollama rm {model} 2>&1")
    result = (out + err).strip()
    print(f"   {model}: {result}")

out, _ = run("curl -s http://localhost:11434/api/tags")
models = json.loads(out).get('models', []) if out.strip() else []
print(f"\n✅ System Ollama models: {[m['name'] for m in models]}")

# Check RAM
out, _ = run("free -h | grep Mem")
print(f"   RAM: {out.strip()}")

# Verify backend config
print("\n📋 Backend config verification:")
out, _ = run("grep -E '\"Model\"|\"MaxTokens\"|\"BaseUrl\"' /var/www/ai-learn-api/appsettings.json")
print(f"   {out.strip()}")

# Backend health
print("\n💚 Backend health:")
out, _ = run("curl -s http://127.0.0.1:5001/api/health --max-time 5")
print(f"   {out.strip()[:120]}")

# Verify nginx timeouts
print("\n⏱️  Nginx timeouts:")
out, _ = run("grep -E 'proxy_(read|connect|send)_timeout' /etc/nginx/sites-available/learnwithai.tech.conf | head -5")
print(f"   {out.strip()}")

# Test AI with generous timeout (90s)
print("\n🤖 Testing AI API (90s timeout)...")
start = time.time()
out, _ = run("""curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","topicId":"math","maxTokens":100}' \
--max-time 90""", timeout=95)
elapsed = time.time() - start

if out.strip():
    try:
        data = json.loads(out)
        if data.get('success'):
            explanation = data.get('explanation', '')
            print(f"   ✅ SUCCESS in {elapsed:.1f}s! {len(explanation)} chars")
            print(f"   Response: {explanation[:150]}")
        else:
            print(f"   ❌ Error: {data.get('error','')}: {data.get('details','')[:150]}")
    except Exception as e:
        print(f"   Raw: {out[:200]}")
else:
    print(f"   ⚠️  No response in {elapsed:.1f}s")
    # Check service logs
    out2, _ = run("journalctl -u ailearn-api -n 30 --no-pager")
    print(f"   Last logs:\n{out2[-600:]}")

# Open WebUI status
print("\n🌐 Open WebUI status:")
out, _ = run("docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' | grep -E 'NAMES|webui'")
print(f"   {out.strip()}")

# Verify OllamaService CTS fix is deployed
print("\n🔧 Verifying independent CTS fix is deployed:")
out, _ = run("ls -la /var/www/ai-learn-api/AILearnAPI.Api.dll")
print(f"   Binary timestamp: {out.strip()}")

ssh.close()

print("\n" + "="*60)
print("✅ VERIFICATION COMPLETE")
print(f"\n   Frontend: https://learnwithai.tech")
print(f"   Open WebUI: http://{HOST}:8080")
print("="*60)
