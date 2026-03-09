import paramiko
import time

SERVER_IP = '76.13.244.113'
SERVER_USER = 'root'
SERVER_PASSWORD = '1ZC7Lts7,saeb)Y0H4@n'

print('='*60)
print('Checking Server for LLM Services')
print('='*60)

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASSWORD)
    print('\n✅ Connected to server\n')

    checks = [
        ('Ollama', 'which ollama; systemctl status ollama 2>&1 | grep -E "Active|loaded"'),
        ('Text Generation WebUI', 'ps aux | grep -i "gradio\\|text-generation-webui" | grep -v grep'),
        ('LocalAI', 'ps aux | grep -i "local-ai\\|localai" | grep -v grep'),
        ('vLLM', 'ps aux | grep -i vllm | grep -v grep'),
        ('Docker Containers', 'docker ps 2>/dev/null | grep -E "llm|ollama|llama|mistral|phi"'),
        ('Python Processes', 'ps aux | grep -E "python.*llm|python.*model" | grep -v grep'),
        ('Open Ports (AI Services)', 'netstat -tlnp 2>/dev/null | grep -E "11434|5000|7860|8080|8000" || ss -tlnp 2>/dev/null | grep -E "11434|5000|7860|8080|8000"'),
    ]

    results = {}
    
    for name, command in checks:
        print(f'🔍 Checking: {name}...')
        stdin, stdout, stderr = ssh.exec_command(command)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        
        if output:
            print(f'   ✅ Found:\n{output[:500]}\n')
            results[name] = output
        else:
            print(f'   ❌ Not found\n')
            results[name] = None
    
    # Check GPU
    print('🔍 Checking: GPU availability...')
    stdin, stdout, stderr = ssh.exec_command('nvidia-smi 2>&1 || echo "No GPU"')
    gpu_output = stdout.read().decode('utf-8')
    print(f'   {gpu_output[:300]}\n')
    
    ssh.close()
    
    print('='*60)
    print('Summary')
    print('='*60)
    
    found_services = [k for k, v in results.items() if v]
    if found_services:
        print(f'\n✅ Found {len(found_services)} potential LLM service(s):')
        for service in found_services:
            print(f'   - {service}')
    else:
        print('\n❌ No LLM services found on server')
        print('\n💡 Recommendation: Use frontend API key rotation (already implemented)')
        print('   - Groq: Free, fast, unlimited tokens')
        print('   - Gemini: Free, 60 req/min per key')
        print('   - HuggingFace: Free, good limits')
    
    print('\n📝 Next: Create admin panel to manage API providers')

except Exception as e:
    print(f'\n❌ Error: {e}')
    import traceback
    traceback.print_exc()
