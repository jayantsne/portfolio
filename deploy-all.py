#!/usr/bin/env python3
"""
Deploy:
1. Updated .NET backend (streaming endpoint + qwen2.5:3b + llama3.2:3b config)
2. Updated Angular frontend (streaming display + search suggestions)
3. Pull llama3.2:3b on server
4. Disable nginx proxy buffering for SSE
"""

import paramiko
import os
import time
import json

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

BACKEND_DIR  = r"d:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Api\publish"
FRONTEND_DIR = r"d:\folio\jayant-angular-ui\angular-starter\dist\angular-starter"
REMOTE_BACKEND  = "/var/www/ai-learn-api"
REMOTE_FRONTEND = "/var/www/learnwithai.tech/frontend"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

def run(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

# ─────────────────────────────────────────────
print("="*60)
print("🚀 FULL DEPLOY: backend + frontend + server config")
print("="*60)

# ── 1. Stop backend service ──────────────────
print("\n1️⃣  Stopping backend service...")
run("systemctl stop ailearn-api")
print("   Stopped")

# ── 2. Upload .NET backend ───────────────────
print("\n2️⃣  Uploading .NET backend...")
sftp = ssh.open_sftp()
uploaded = 0
for root, dirs, files in os.walk(BACKEND_DIR):
    for file in files:
        local_path = os.path.join(root, file)
        relative   = os.path.relpath(local_path, BACKEND_DIR)
        remote     = f"{REMOTE_BACKEND}/{relative}".replace("\\", "/")
        remote_dir = os.path.dirname(remote)
        try:
            sftp.stat(remote_dir)
        except:
            run(f"mkdir -p '{remote_dir}'")
        sftp.put(local_path, remote)
        uploaded += 1
        if uploaded % 15 == 0:
            print(f"   {uploaded} files...")
print(f"   ✅ Uploaded {uploaded} backend files")

# ── 3. Upload Angular frontend ───────────────
print("\n3️⃣  Uploading Angular frontend...")
out, _ = run(f"ls {REMOTE_FRONTEND} 2>/dev/null | head -1")
if not out.strip():
    # Try to find the actual frontend directory
    out2, _ = run("find /var/www -name 'index.html' -not -path '*/ai-learn-api/*' 2>/dev/null | head -3")
    print(f"   Web root candidates: {out2.strip()}")
    web_roots = [p.strip() for p in out2.splitlines() if p.strip()]
    if web_roots:
        REMOTE_FRONTEND = os.path.dirname(web_roots[0])
        print(f"   Using web root: {REMOTE_FRONTEND}")
    else:
        REMOTE_FRONTEND = "/var/www/html"
        run(f"mkdir -p {REMOTE_FRONTEND}")

frontend_uploaded = 0
for root, dirs, files in os.walk(FRONTEND_DIR):
    for file in files:
        local_path = os.path.join(root, file)
        relative   = os.path.relpath(local_path, FRONTEND_DIR)
        remote     = f"{REMOTE_FRONTEND}/{relative}".replace("\\", "/")
        remote_dir = os.path.dirname(remote)
        try:
            sftp.stat(remote_dir)
        except:
            run(f"mkdir -p '{remote_dir}'")
        sftp.put(local_path, remote)
        frontend_uploaded += 1
        if frontend_uploaded % 20 == 0:
            print(f"   {frontend_uploaded} files...")
print(f"   ✅ Uploaded {frontend_uploaded} frontend files to {REMOTE_FRONTEND}")

sftp.close()

# ── 4. Fix permissions ───────────────────────
print("\n4️⃣  Fixing permissions...")
run(f"chmod +x {REMOTE_BACKEND}/AILearnAPI.Api")
run(f"chown -R www-data:www-data {REMOTE_BACKEND}")
run(f"chown -R www-data:www-data {REMOTE_FRONTEND}")
print("   ✅ Done")

# ── 5. Nginx: disable proxy buffering for SSE ─
print("\n5️⃣  Patching nginx: disable proxy_buffering for /api (SSE support)...")
out, _ = run("grep 'proxy_buffering off' /etc/nginx/sites-available/learnwithai.tech.conf")
if 'proxy_buffering off' in out:
    print("   ✅ proxy_buffering off already present")
else:
    # Add proxy_buffering off inside the /api location block
    run(r"""sed -i '/location \/api {/a \        proxy_buffering off;' /etc/nginx/sites-available/learnwithai.tech.conf""")
    out2, _ = run("nginx -t 2>&1")
    if 'successful' in out2.lower():
        run("nginx -s reload")
        print("   ✅ nginx patched - proxy_buffering off added to /api")
    else:
        print(f"   ⚠️  nginx test: {out2.strip()[:100]}")

# ── 6. Pull llama3.2:3b ──────────────────────
print("\n6️⃣  Checking/pulling llama3.2:3b (backup tutor model)...")
out, _ = run("curl -s http://localhost:11434/api/tags")
if out.strip():
    models = json.loads(out).get('models', [])
    names  = [m['name'] for m in models]
    print(f"   Current models: {names}")
    if 'llama3.2:3b' not in names:
        print("   Pulling llama3.2:3b (~2GB, may take 3-5 min)...")
        out2, err2 = run("ollama pull llama3.2:3b 2>&1", timeout=360)
        result = (out2 + err2).strip()
        if 'success' in result.lower():
            print("   ✅ llama3.2:3b pulled successfully")
        else:
            print(f"   ⚠️  Pull result: {result[-150:]}")
    else:
        print("   ✅ llama3.2:3b already available")
else:
    print("   ⚠️  Could not connect to Ollama")

# ── 7. Verify appsettings on server ──────────
print("\n7️⃣  Verifying server appsettings.json...")
out, _ = run(f"grep -E '\"Model\"|\"BackupModel\"|\"MaxTokens\"' {REMOTE_BACKEND}/appsettings.json")
print(f"   {out.strip()}")

# ── 8. Start backend service ─────────────────
print("\n8️⃣  Starting backend service...")
run("systemctl start ailearn-api && sleep 4")
out, _ = run("systemctl is-active ailearn-api")
print(f"   Status: {out.strip()}")

# ── 9. Quick tests ───────────────────────────
print("\n🧪 QUICK SMOKE TESTS")

print("   Backend health:")
out, _ = run("curl -s http://127.0.0.1:5001/api/health --max-time 5")
print(f"   {out.strip()[:80]}")

print("\n   Ollama models:")
out, _ = run("curl -s http://localhost:11434/api/tags | python3 -c \"import sys,json;d=json.load(sys.stdin);[print('     '+m['name']) for m in d.get('models',[])]\"")
print(out.strip() or "   (none loaded)")

print("\n   Streaming endpoint (5s check, tokens should appear):")
out, _ = run("""curl -s -X POST http://127.0.0.1:5001/api/ai/stream \
-H "Content-Type: application/json" \
-d '{"question":"What is a variable?","maxTokens":30}' \
--max-time 15 -N 2>&1 | head -c 300""", timeout=20)
print(f"   {out.strip()[:250]}")

ssh.close()

print("\n" + "="*60)
print("✅ DEPLOY COMPLETE")
print(f"   Frontend: https://learnwithai.tech")
print(f"   Backend:  https://learnwithai.tech/api/ai/health")
print(f"   Stream:   https://learnwithai.tech/api/ai/stream (POST)")
print("="*60)
