#!/usr/bin/env python3
"""Diagnose why Ollama is taking too long"""
import paramiko
import json
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

def run(cmd, timeout=180):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

print("=" * 60)
print("⚡ SPEED DIAGNOSIS")
print("=" * 60)

# Check model in memory
print("\n1. Model in memory?")
out, _ = run("curl -s http://localhost:11434/api/ps")
print(f"   {out.strip()[:200]}")

# Test direct Ollama call with same kind of prompt (512 tokens)
print("\n2. Direct Ollama - short (50 tokens)...")
start = time.time()
out, _ = run("""curl -s -X POST http://localhost:11434/api/generate \
-H "Content-Type: application/json" \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"What is 2+2?","stream":false,"options":{"num_predict":50}}' \
--max-time 60""", timeout=65)
elapsed = time.time() - start
if out.strip():
    data = json.loads(out)
    dur = data.get('total_duration', 0) / 1e9
    toks = data.get('eval_count', 0)
    print(f"   ✅ {elapsed:.1f}s wall, {dur:.1f}s Ollama, {toks} tokens, {toks/dur if dur else 0:.1f} tok/s")
    print(f"   Response: {data.get('response','')[:100]}")
else:
    print(f"   ❌ No response in {elapsed:.1f}s")

print("\n3. Direct Ollama - 512 tokens...")
start = time.time()
out, _ = run("""curl -s -X POST http://localhost:11434/api/generate \
-H "Content-Type: application/json" \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Explain JavaScript in detail","stream":false,"options":{"num_predict":512}}' \
--max-time 120""", timeout=125)
elapsed = time.time() - start
if out.strip():
    data = json.loads(out)
    dur = data.get('total_duration', 0) / 1e9
    toks = data.get('eval_count', 0)
    load = data.get('load_duration', 0) / 1e9
    print(f"   ✅ {elapsed:.1f}s wall, {dur:.1f}s total, load={load:.1f}s, {toks} tokens, {toks/dur if dur else 0:.1f} tok/s")
    print(f"   Preview: {data.get('response','')[:120]}")
else:
    print(f"   ❌ No response in {elapsed:.1f}s")

# CPU/load check
print("\n4. System resources:")
out, _ = run("cat /proc/cpuinfo | grep 'model name' | head -1")
print(f"   CPU: {out.strip()}")
out, _ = run("nproc")
print(f"   Cores: {out.strip()}")
out, _ = run("uptime")
print(f"   Load: {out.strip()}")
out, _ = run("free -h | grep Mem")
print(f"   RAM: {out.strip()}")

ssh.close()
