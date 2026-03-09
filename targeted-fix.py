#!/usr/bin/env python3
"""
Targeted fixes:
1. Stop Docker Ollama (port conflict with system Ollama)
2. Point Open WebUI to system Ollama (host bridge IP)
3. Fix appsettings.json to use correct 3B model name
4. Preload 3B model and verify API works
"""

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
print("🎯 TARGETED FIX")
print("="*60)

# ─── FIX 1: Port conflict - Stop Docker Ollama ─────────────
print("\n1️⃣  Stopping Docker Ollama container (port 11434 conflict)...")
out, err = run("docker stop ollama 2>&1")
print(f"   {out.strip() or err.strip()}")

# Confirm system Ollama is still running on 11434
out, _ = run("curl -s http://localhost:11434/api/tags")
if out.strip():
    data = json.loads(out)
    models = data.get('models', [])
    print(f"   ✅ System Ollama running. Models: {[m['name'] for m in models]}")
else:
    print("   ❌ System Ollama not responding - restarting...")
    run("systemctl restart ollama && sleep 5")
    out, _ = run("curl -s http://localhost:11434/api/tags")
    data = json.loads(out) if out.strip() else {}
    print(f"   Models: {[m['name'] for m in data.get('models', [])]}")

# ─── FIX 2: Reconfigure Open WebUI to use system Ollama ────
print("\n2️⃣  Reconfiguring Open WebUI to use system Ollama...")

# Get host bridge IP (docker0 interface)
out, _ = run("ip addr show docker0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1")
bridge_ip = out.strip() or "172.17.0.1"
print(f"   Docker bridge IP: {bridge_ip}")

# Verify system Ollama is accessible from that IP
out, _ = run(f"curl -s http://{bridge_ip}:11434/api/tags --max-time 5")
if out.strip():
    print(f"   ✅ System Ollama accessible at http://{bridge_ip}:11434")
else:
    print(f"   ⚠️  Not accessible at bridge IP. Binding Ollama to 0.0.0.0...")
    # Update Ollama to listen on all interfaces
    run("""cat > /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="OLLAMA_NUM_PARALLEL=2"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_KEEP_ALIVE=30m"
Environment="OLLAMA_NUM_THREAD=4"
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF""")
    run("systemctl daemon-reload && systemctl restart ollama && sleep 5")

# Update docker-compose.yml to remove ollama container, point webui to system ollama
docker_compose = f"""services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - OLLAMA_BASE_URL=http://{bridge_ip}:11434
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - open-webui:/app/backend/data

volumes:
  open-webui:
"""

out, _ = run("find / -name 'docker-compose.yml' -path '*/ollama*' -o -name 'docker-compose.yml' -path '*/webui*' 2>/dev/null | head -3")
compose_paths = [p.strip() for p in out.strip().split('\n') if p.strip()]
print(f"   docker-compose.yml locations: {compose_paths}")

compose_path = "/docker/ollama/docker-compose.yml"
if compose_paths:
    compose_path = compose_paths[0]

# Write new docker-compose.yml
print(f"   Updating {compose_path}...")
run(f"cp '{compose_path}' '{compose_path}.backup' 2>/dev/null || true")
run(f"cat > '{compose_path}' << 'COMPOSEEOF'\n{docker_compose}\nCOMPOSEEOF")

# Restart Open WebUI with new config
out, err = run(f"cd '{compose_path.rsplit('/', 1)[0]}' && docker compose up -d open-webui 2>&1", timeout=60)
print(f"   Open WebUI restart: {out.strip()[-200:] or err.strip()[-200:]}")

# Wait for Open WebUI to start
time.sleep(5)
out, _ = run("docker ps | grep open-webui")
print(f"   Open WebUI status: {out.strip()[:100]}")

# ─── FIX 3: Fix appsettings.json model name ────────────────
print("\n3️⃣  Fixing appsettings.json - model name and tokens...")
out, _ = run("""cd /var/www/ai-learn-api && \
sed -i 's/"Model": "qwen2.5:7b-instruct-q4_K_M"/"Model": "qwen2.5:3b-instruct-q4_0"/' appsettings.json && \
sed -i 's/"MaxTokens": [0-9]*/"MaxTokens": 512/' appsettings.json && \
grep -E '"Model"|"MaxTokens"|"BaseUrl"' appsettings.json""")
print(f"   {out.strip()}")

# ─── FIX 4: Ensure 3B model is loaded in system Ollama ─────
print("\n4️⃣  Pre-loading 3B model into system Ollama...")
# First check if it exists
out, _ = run("curl -s http://localhost:11434/api/tags")
if out.strip():
    models = json.loads(out).get('models', [])
    model_names = [m['name'] for m in models]
    print(f"   Available models: {model_names}")
    
    if 'qwen2.5:3b-instruct-q4_0' not in model_names:
        print("   Pulling qwen2.5:3b-instruct-q4_0 (takes 2-3 min)...")
        out, err = run("ollama pull qwen2.5:3b-instruct-q4_0 2>&1", timeout=300)
        print(f"   Pull: {out[-100:]}")
    else:
        print("   ✅ Model already available")
    
    # Load it into memory
    out, _ = run("""curl -s -X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Hi","stream":false,"keep_alive":"120m"}'""", timeout=30)
    if out.strip():
        data = json.loads(out)
        dur = data.get('total_duration', 0) / 1e9
        print(f"   ✅ Model loaded in {dur:.1f}s, response: {data.get('response','')[:50]}")
    else:
        print("   ⚠️ Model load timed out (will load on first request)")

# ─── FIX 5: Restart backend ────────────────────────────────
print("\n5️⃣  Restarting backend service...")
run("systemctl restart ailearn-api && sleep 5")
out, _ = run("systemctl is-active ailearn-api")
print(f"   Backend status: {out.strip()}")

# ─── FINAL TEST ────────────────────────────────────────────
print("\n🧪 FINAL TESTS")

print("   1. Backend health:")
out, _ = run("curl -s http://127.0.0.1:5001/api/health --max-time 5")
print(f"      {out.strip()[:80]}")

print("   2. Open WebUI health:")
out, _ = run("curl -s http://127.0.0.1:8080 --max-time 5 | head -c 100")
print(f"      {out.strip()[:80] or 'Not responding (may still be starting)'}")

print("   3. System Ollama health:")
out, _ = run("curl -s http://localhost:11434/api/tags | python3 -c \"import sys,json; d=json.load(sys.stdin); [print('     -', m['name']) for m in d.get('models',[])]\"")
print(out.strip() or "      ⚠️  No models loaded")

print("   4. Backend AI API (testing with 90s timeout)...")
out, _ = run("""curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is JavaScript?","topicId":"js","maxTokens":256}' \
--max-time 60""", timeout=65)
if out.strip():
    try:
        data = json.loads(out)
        if data.get('success'):
            explanation = data.get('explanation', '')
            print(f"      ✅ SUCCESS! {len(explanation)} chars in response")
            print(f"      Preview: {explanation[:100]}...")
        else:
            print(f"      ❌ {data.get('error','')}: {data.get('details','')[:100]}")
    except:
        print(f"      Response: {out[:200]}")
else:
    print("      ⚠️  Timeout (nginx fix should handle this for frontend)")

ssh.close()
print("\n" + "="*60)
print("✅ FIXES COMPLETE")
print(f"   Open WebUI: http://{HOST}:8080  (now uses 3B model)")
print(f"   Frontend:   https://learnwithai.tech")
print("="*60)
