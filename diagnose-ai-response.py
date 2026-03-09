#!/usr/bin/env python3
"""
Diagnose AI Response Issue
Check backend logs and test Ollama endpoint directly
"""

import paramiko
import json
from datetime import datetime

# Server configuration
SERVER = "76.13.244.113"
USERNAME = "root"
PORT = 22

def run_ssh_command(ssh, command, show_output=True):
    """Execute SSH command and return output"""
    stdin, stdout, stderr = ssh.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    
    if show_output and output:
        print(output)
    if error:
        print(f"Error: {error}")
    
    return output, error

print("="*70)
print("🔍 DIAGNOSING AI RESPONSE ISSUE")
print("="*70)

try:
    # Connect to server
    print("\n1. Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER, port=PORT, username=USERNAME)
    print("✅ Connected to server")
    
    # Check backend service status
    print("\n2. Checking backend service status...")
    output, _ = run_ssh_command(ssh, "systemctl status ailearn-api --no-pager -l | head -20")
    
    # Check recent backend logs
    print("\n3. Checking recent backend logs (last 30 lines)...")
    output, _ = run_ssh_command(ssh, "journalctl -u ailearn-api -n 30 --no-pager")
    
    # Check Ollama service
    print("\n4. Checking Ollama status...")
    output, _ = run_ssh_command(ssh, "systemctl status ollama --no-pager | head -15")
    
    # Test Ollama directly
    print("\n5. Testing Ollama API directly...")
    test_payload = {
        "model": "qwen2.5:7b-instruct-q4_K_M",
        "prompt": "Explain JavaScript Promises in one sentence.",
        "stream": False
    }
    
    cmd = f"""curl -s -X POST http://localhost:11434/api/generate \\
        -H 'Content-Type: application/json' \\
        -d '{json.dumps(test_payload)}' \\
        --max-time 60"""
    
    print("   Sending test request to Ollama...")
    output, error = run_ssh_command(ssh, cmd)
    
    if output:
        try:
            result = json.loads(output)
            if 'response' in result:
                print(f"   ✅ Ollama Response: {result['response'][:200]}...")
            else:
                print(f"   ⚠️ Unexpected response: {output[:500]}")
        except json.JSONDecodeError:
            print(f"   ⚠️ Non-JSON response: {output[:500]}")
    
    # Test our ASP.NET API endpoint
    print("\n6. Testing ASP.NET API endpoint...")
    test_question = {
        "question": "Explain JavaScript Promises briefly"
    }
    
    cmd = f"""curl -sk -X POST https://learnwithai.tech/api/ai/ollama \\
        -H 'Content-Type: application/json' \\
        -d '{json.dumps(test_question)}' \\
        --max-time 60"""
    
    print("   Sending test request to ASP.NET API...")
    output, error = run_ssh_command(ssh, cmd)
    
    if output:
        print(f"   Response preview: {output[:500]}")
        if len(output) > 500:
            print(f"   ... (total length: {len(output)} chars)")
    
    # Check nginx logs for recent API requests
    print("\n7. Checking recent nginx logs for /api/ai/ollama requests...")
    output, _ = run_ssh_command(ssh, 
        "tail -50 /var/log/nginx/access.log | grep '/api/ai/ollama' | tail -10")
    
    # Check nginx error logs
    print("\n8. Checking nginx error logs...")
    output, _ = run_ssh_command(ssh, 
        "tail -20 /var/log/nginx/error.log")
    
    ssh.close()
    
    print("\n" + "="*70)
    print("🔍 DIAGNOSIS COMPLETE")
    print("="*70)
    print("\nNext Steps:")
    print("1. Review the logs above for any errors")
    print("2. Check if Ollama is responding")
    print("3. Verify ASP.NET API is processing requests")
    print("4. Check for timeout or CORS issues")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
