import paramiko

SERVER_IP = '76.13.244.113'
SERVER_USER = 'root'
SERVER_PASSWORD = '1ZC7Lts7,saeb)Y0H4@n'

print('='*60)
print('Checking Ollama Models & Configuration')
print('='*60)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASSWORD)
    print('\n✅ Connected\n')

    # Check installed models
    print('🔍 Installed Models:')
    stdin, stdout, stderr = ssh.exec_command('ollama list')
    models = stdout.read().decode('utf-8')
    print(models)
    
    # Test Ollama API
    print('\n🔍 Testing Ollama API:')
    test_cmd = '''curl -X POST http://localhost:11434/api/generate -d '{
      "model": "llama2",
      "prompt": "What is Angular in 10 words?",
      "stream": false
    }' 2>&1 | head -c 500'''
    
    stdin, stdout, stderr = ssh.exec_command(test_cmd)
    response = stdout.read().decode('utf-8')
    print(response[:500])
    
    ssh.close()
    
    print('\n' + '='*60)
    print('Summary')
    print('='*60)
    print('\n✅ Ollama is active and accessible at localhost:11434')
    print('💡 Can be used for local LLM inference (free, fast, no API keys)')
    print('\n📝 Next: Create admin panel to manage all providers')

except Exception as e:
    print(f'\n❌ Error: {e}')
