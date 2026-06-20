#!/usr/bin/env python3
"""Push just appsettings.json and test with 90s timeout"""
import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "<DEPLOY_SSH_PASSWORD>"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

sftp = ssh.open_sftp()

def run(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

# Upload fixed appsettings.json
print("📤 Uploading appsettings.json (MaxTokens=512, Model=3b)...")
sftp.put(
    r"d:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Api\publish\appsettings.json",
    "/var/www/ai-learn-api/appsettings.json"
)
sftp.close()
print("   ✅ Uploaded")

# Verify
out, _ = run("grep -E '\"Model\"|\"MaxTokens\"' /var/www/ai-learn-api/appsettings.json")
print(f"   Config: {out.strip()}")

# Restart backend
print("\n🔄 Restarting backend...")
run("systemctl restart ailearn-api && sleep 4")
out, _ = run("systemctl is-active ailearn-api")
print(f"   Status: {out.strip()}")

# Test AI API with 90s timeout
print("\n🤖 Testing AI API (90s, maxTokens=512)...")
print("   Asking: 'What is 2+2?'")
start = time.time()
out, _ = run("""curl -s -X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","topicId":"math","maxTokens":512}' \
--max-time 90""", timeout=95)
elapsed = time.time() - start

if out.strip():
    try:
        data = json.loads(out)
        if data.get('success'):
            explanation = data.get('explanation', '')
            print(f"\n   ✅ SUCCESS in {elapsed:.1f}s! ({len(explanation)} chars)")
            print(f"   Preview: {explanation[:200]}")
        else:
            print(f"\n   ❌ Error ({elapsed:.1f}s): {data.get('error','')}: {data.get('details','')[:200]}")
    except Exception as e:
        print(f"\n   Raw ({elapsed:.1f}s): {out[:300]}")
else:
    print(f"\n   ⚠️  No response in {elapsed:.1f}s")
    out2, _ = run("journalctl -u ailearn-api -n 20 --no-pager")
    print(f"   Logs:\n{out2[-500:]}")

ssh.close()
print("\n✅  Done")
