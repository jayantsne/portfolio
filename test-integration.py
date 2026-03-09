import paramiko
import json

hostname = '76.13.244.113'
username = 'root'
password = '1ZC7Lts7,saeb)Y0H4@n'

def test_integration():
    try:
        print("🧪 Testing API Integration\n")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=22, username=username, password=password, timeout=15)
        
        print("="*60)
        print("Test 1: API Questions Endpoint")
        print("="*60)
        stdin, stdout, stderr = client.exec_command(
            'curl -s -H "X-API-Key: b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41" https://learnwithai.tech/api/questions | python3 -m json.tool | head -80'
        )
        result = stdout.read().decode('utf-8')
        print(result)
        
        print("\n" + "="*60)
        print("Test 2: Count Questions")
        print("="*60)
        stdin, stdout, stderr = client.exec_command(
            'curl -s -H "X-API-Key: b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41" https://learnwithai.tech/api/questions | python3 -c "import sys, json; d = json.load(sys.stdin); print(f\'Total: {d.get(\\\"total\\\", 0)} questions\')"'
        )
        result = stdout.read().decode('utf-8')
        print(result)
        
        print("\n" + "="*60)
        print("Test 3: Frontend Access")
        print("="*60)
        stdin, stdout, stderr = client.exec_command(
            'curl -I https://learnwithai.tech/ai-learn/questions 2>&1 | head -10'
        )
        result = stdout.read().decode('utf-8')
        print(result)
        
        client.close()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETE!")
        print("="*60)
        print("\n🌐 Visit: https://learnwithai.tech/ai-learn/questions")
        print("📊 API: https://learnwithai.tech/api/questions")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    test_integration()
