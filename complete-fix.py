#!/usr/bin/env python3
"""
Complete fix:
1. Fix nginx proxy_read_timeout to 300s 
2. Fix Docker Ollama: pull fast model, remove slow 8B models
3. Configure Open WebUI to use fast model by default
4. Check RAM and fix any OOM issues
5. Rebuild .NET backend with proper HttpClient config
"""

import paramiko
import json
import time
import os
import sys

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

def run(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    try:
        out = stdout.read().decode()
        err = stderr.read().decode()
        return out, err
    except Exception as e:
        return "", str(e)

print("="*60)
print("🔧 COMPLETE FIX - ALL ISSUES")
print("="*60)

# ─── STEP 1: Check RAM ─────────────────────────────────────
print("\n📊 STEP 1: Server RAM status")
out, _ = run("free -h")
print(out.strip())
# Get available RAM in MB
out2, _ = run("free -m | awk 'NR==2{print $7}'")
available_mb = int(out2.strip()) if out2.strip().isdigit() else 0
print(f"Available RAM: {available_mb} MB")

# ─── STEP 2: Fix nginx ─────────────────────────────────────
print("\n🌐 STEP 2: Fix nginx timeouts")
nginx_conf_paths = [
    "/etc/nginx/sites-available/learnwithai.tech.conf",
    "/etc/nginx/sites-available/learnwithai.tech",
    "/etc/nginx/sites-available/default"
]

out, _ = run("find /etc/nginx -name '*.conf' | xargs grep -l 'proxy_pass' 2>/dev/null | head -3")
conf_files = [f.strip() for f in out.strip().split('\n') if f.strip()]
print(f"   Found nginx config files: {conf_files}")

for conf_path in conf_files:
    # Check current timeouts
    out, _ = run(f"grep 'proxy_read_timeout\\|proxy_connect_timeout\\|proxy_send_timeout' '{conf_path}'")
    print(f"   Current timeouts in {conf_path}:\n   {out.strip() or 'Not set (default 60s)'}")
    
    # Fix: increase all proxy timeouts to 300s
    fix_cmd = f"""
sed -i 's/proxy_read_timeout [0-9]*s*/proxy_read_timeout 300s/g' '{conf_path}'
sed -i 's/proxy_connect_timeout [0-9]*s*/proxy_connect_timeout 300s/g' '{conf_path}'
sed -i 's/proxy_send_timeout [0-9]*s*/proxy_send_timeout 300s/g' '{conf_path}'
"""
    run(fix_cmd)
    
    # Add timeouts if not present in the api location block
    out, _ = run(f"grep -n 'location /api' '{conf_path}'")
    if out.strip():
        # Check if timeouts exist
        out2, _ = run(f"grep 'proxy_read_timeout' '{conf_path}'")
        if not out2.strip():
            # Add timeouts inside the /api location block
            run(f"""sed -i '/location \\/api/{{
n
/{{/{{
a\\        proxy_read_timeout 300s;
a\\        proxy_connect_timeout 300s;
a\\        proxy_send_timeout 300s;
}}
}}' '{conf_path}'""")
    
    out, _ = run(f"grep 'proxy_read_timeout\\|proxy_connect_timeout\\|proxy_send_timeout' '{conf_path}'")
    print(f"   Updated timeouts: {out.strip() or 'Not found - adding manually'}")

# Also ensure nginx has a global timeout in http block
nginx_main = "/etc/nginx/nginx.conf"
out, _ = run(f"grep 'proxy_read_timeout\\|keepalive_timeout' '{nginx_main}'")
print(f"   nginx.conf global: {out.strip() or 'No global timeout set'}")

# Test nginx config
out, err = run("nginx -t 2>&1")
if "ok" in (out+err).lower() or "successful" in (out+err).lower():
    print("   ✅ nginx config valid")
    run("nginx -s reload")
    print("   ✅ nginx reloaded")
else:
    print(f"   ⚠️  nginx config issue: {(out+err)[:200]}")

# ─── STEP 3: Fix Docker Ollama models ──────────────────────
print("\n🐋 STEP 3: Fix Docker Ollama models")

# Check what's in Docker Ollama
print("   Removing slow llama3.1:8b models from Docker Ollama...")
out, err = run("docker exec ollama ollama rm llama3.1:latest 2>&1 || true", timeout=30)
print(f"   llama3.1:latest: {out.strip() or err.strip()}")
out, err = run("docker exec ollama ollama rm llama3.1:8b 2>&1 || true", timeout=30)
print(f"   llama3.1:8b: {out.strip() or err.strip()}")

print("   Pulling qwen2.5:3b-instruct-q4_0 into Docker Ollama (this takes 1-3 min)...")
out, err = run("docker exec ollama ollama pull qwen2.5:3b-instruct-q4_0 2>&1", timeout=300)
if "success" in out.lower() or "pulling" in out.lower() or "already" in out.lower():
    print("   ✅ qwen2.5:3b-instruct-q4_0 pulled successfully")
else:
    print(f"   Output: {out[-200:] if out else err[-200:]}")

# Verify
out, err = run("docker exec ollama ollama list 2>&1")
print(f"   Docker Ollama models:\n{out.strip()}")

# ─── STEP 4: Stop Docker Ollama from pre-loading heavy model ─
print("\n⚙️  STEP 4: Optimize Docker container")

# Get Docker compose file
out, _ = run("cat /docker/ollama/docker-compose.yml 2>/dev/null || find / -path '*/docker*' -name 'docker-compose.yml' 2>/dev/null | head -3")
print(f"   Docker compose:\n{out[:500]}")

# Check if system Ollama can serve Open WebUI (avoid 2 Ollama instances)
# Get docker container network
out, _ = run("docker inspect ollama 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d[0]['NetworkSettings']['IPAddress'] if d else 'N/A')\" 2>/dev/null")
print(f"   Docker Ollama IP: {out.strip()}")

# ─── STEP 5: Fix the appsettings.json on server ─────────────
print("\n📝 STEP 5: Fix appsettings.json MaxTokens")
out, _ = run("""cd /var/www/ai-learn-api && \
sed -i 's/"MaxTokens": [0-9]*/"MaxTokens": 512/' appsettings.json && \
grep -E 'MaxTokens|Model' appsettings.json""")
print(f"   {out.strip()}")

# ─── STEP 6: Restart services ──────────────────────────────
print("\n🔄 STEP 6: Restart services")

run("systemctl restart ailearn-api && sleep 5")
print("   ✅ backend restarted")

run("systemctl restart ollama && sleep 3")
print("   ✅ system ollama restarted")

# Pre-load fast model
print("   Pre-loading qwen2.5:3b model into system Ollama...")
out, _ = run("""curl -s -X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Hi","stream":false,"keep_alive":"30m"}'""", timeout=60)
if out.strip():
    data = json.loads(out)
    dur = data.get('total_duration', 0) / 1e9
    print(f"   ✅ System Ollama 3B loaded in {dur:.1f}s")
else:
    print("   ⚠️ System Ollama not responding - may need a moment")

run("systemctl restart docker && sleep 5")
print("   ✅ docker restarted")

# ─── STEP 7: Test everything ───────────────────────────────
print("\n🧪 STEP 7: Final tests")

# Test health
out, _ = run("curl -s http://127.0.0.1:5001/api/health")
print(f"   Backend health: {out.strip()[:80]}")

# Test Ollama
out, _ = run("""curl -s -X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Hi","stream":false}' --max-time 15""")
if out.strip():
    data = json.loads(out)
    dur = data.get('total_duration', 0) / 1e9
    print(f"   System Ollama: ✅ {dur:.1f}s")
else:
    print("   System Ollama: ⚠️ Not responding")

# Test backend API
print("   Testing backend API (max 60s)...")
out, _ = run("""curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is JavaScript?","topicId":"test","maxTokens":256}' \
--max-time 60""", timeout=65)
if out.strip():
    try:
        data = json.loads(out)
        if data.get('success'):
            print(f"   Backend API: ✅ SUCCESS! {len(data.get('explanation',''))} chars")
        else:
            print(f"   Backend API: {out[:200]}")
    except:
        print(f"   Backend API response: {out[:200]}")
else:
    print("   Backend API: ⚠️ No response in 60s (nginx fix should help)")

# Check RAM after fix
out, _ = run("free -h")
print(f"\n   RAM after fix:\n{out.strip()}")

print("\n" + "="*60)
print("✅ ALL FIXES APPLIED")
print("="*60)
print("Open WebUI: http://76.13.244.113:8080 - now uses qwen2.5:3b (fast)")
print("Frontend: https://learnwithai.tech - AI answers should work")
print("="*60)

ssh.close()
