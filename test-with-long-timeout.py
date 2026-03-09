#!/usr/bin/env python3
"""Test with LONG timeout to see if backend eventually responds"""

import paramiko
import time

HOST = "76.13.244.113"
USERNAME = "root"
PASSWORD = "1ZC7Lts7,saeb)Y0H4@n"

print("🧪 Testing with 2-minute timeout to see if backend completes...\n")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

# First confirm Ollama is fast
print("1️⃣  Quick Ollama direct test...")
start = time.time()
stdin, stdout, stderr = ssh.exec_command("""curl -s -X POST http://localhost:11434/api/generate \
-d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Test","stream":false}' --max-time 10""")
result = stdout.read().decode()
elapsed = time.time() - start
print(f"   ✅ Ollama responded in {elapsed:.1f}s")

# Now test backend with LONG timeout
print("\n2️⃣  Testing backend API with 120 second timeout...")
print("   (If Ollama is fast, backend should respond in 5-15 seconds)")

test_cmd = """curl -v -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
-X POST http://127.0.0.1:5001/api/ai/ollama \
-H "Content-Type: application/json" \
-d '{"question":"What is 2+2?","difficultyLevel":"easy","topicId":"math"}' \
--max-time 120 2>&1"""

start = time.time()
print("   Request sent, waiting for response...")

# Monitor progress
stdin, stdout, stderr = ssh.exec_command(test_cmd)

for i in range(12):  # Check every 10 seconds for up to 120 seconds
    time.sleep(10)
    if stdout.channel.exit_status_ready():
        break
    elapsed = time.time() - start
    print(f"   ... still waiting ({elapsed:.0f}s)")

result = stdout.read().decode()  
elapsed = time.time() - start

print(f"\n   Request completed after {elapsed:.1f}s")

if "HTTP_CODE:200" in result:
    lines = result.split('\n')
    time_line = [l for l in lines if l.startswith('TIME:')]
    response_lines = [l for l in lines if not l.startswith('HTTP_CODE:') and not l.startswith('TIME:') and not l.startswith('*') and not l.startswith('>') and not l.startswith('<')]
    response = '\n'.join(response_lines)
    
    print("   🎉 SUCCESS!")
    print(f"   {time_line[0] if time_line else ''}")
    print(f"   Response length: {len(response)} chars")
    print(f"   Preview: {response[:200]}...")
elif "HTTP_CODE:" in result:
    code = [l for l in result.split('\n') if l.startswith('HTTP_CODE:')]
    print(f"   ❌ Failed with {code[0] if code else 'unknown'}")
    
    # Look for specific error in verbose output
    if "Empty reply from server" in result:
        print("   Error: Server closed connection")
    elif "Operation timed out" in result:
        print("   Error: Request timed out")
    elif "Connection refused" in result:
        print("   Error: Connection refused")
    
    # Show verbose curl output for diagnosis
    print("\n   Curl verbose output (last 30 lines):")
    print('\n'.join(result.split('\n')[-30:]))
else:
    print("   ❌ No HTTP response")
    print(f"   Output: {result[:1000]}")

# Check if there's a recent error
print("\n3️⃣  Checking for errors in last 2 minutes...")
stdin, stdout, stderr = ssh.exec_command("journalctl -u ailearn-api --since '2 minutes ago' | grep -i exception | tail -5")
errors = stdout.read().decode()
if errors:
    print("   Recent exceptions:")
    print(errors)
else:
    print("   ✅ No exceptions")

ssh.close()
