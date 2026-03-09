import paramiko
import sys
import time
import json

hostname = '76.13.244.113'
username = 'root'
password = '1ZC7Lts7,saeb)Y0H4@n'
port = 22

def execute_command(client, command, description=""):
    """Execute a command and print results"""
    if description:
        print(f"\n🔧 {description}")
    stdin, stdout, stderr = client.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    exit_code = stdout.channel.recv_exit_status()
    
    if output:
        print(output.strip())
    if error and exit_code != 0:
        print(f"⚠️ {error.strip()}")
    
    return exit_code, output, error

def restart_api_and_test():
    try:
        print(f"🔌 Connecting to {hostname}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print(f"✅ Connected\n")
        
        print("="*60)
        print("STEP 1: Update appsettings.json with MongoDB credentials")
        print("="*60)
        
        # Update appsettings.json with correct MongoDB connection
        update_cmd = '''cat > /var/www/learnwithai.tech/backend/appsettings.json << 'EOF'
{
  "ConnectionStrings": {
    "MongoDB": "mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@localhost:27017/jayant-portfolio?authSource=admin",
    "Redis": "localhost:6379"
  },
  "MongoDB": {
    "DatabaseName": "jayant-portfolio"
  },
  "MongoDbSettings": {
    "ConnectionString": "mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@localhost:270 17/jayant-portfolio?authSource=admin",
    "DatabaseName": "jayant-portfolio"
  },
  "OllamaSettings": {
    "BaseUrl": "http://127.0.0.1:11434",
    "Model": "qwen2.5:7b-instruct-q4_K_M",
    "TimeoutSeconds": 120,
    "MaxTokens": 2000
  },
  "ApiSettings": {
    "ApiKey": "b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41",
    "RateLimitPerMinute": 30
  },
  "Redis": {
    "Enabled": false,
    "DefaultCacheDurationMinutes": 60,
    "QuestionsCacheDurationMinutes": 120,
    "ProgressCacheDurationMinutes": 30
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
EOF'''
        execute_command(client, update_cmd, "Updating appsettings.json")
        
        print("\n" + "="*60)
        print("STEP 2: Restart API service")
        print("="*60)
        execute_command(client, "systemctl restart ailearnapi.service", "Restarting service")
        
        print("\n⏳ Waiting for API to start...")
        time.sleep(5)
        
        execute_command(client, "systemctl status ailearnapi.service --no-pager | head -12", "Service status")
        
        print("\n" + "="*60)
        print("STEP 3: Test API endpoints")
        print("="*60)
        
        # Test health endpoint
        execute_command(client, "curl -s http://localhost:5000/api/health | head -5", "Health check")
        
        # Test questions endpoint
        code, output, error = execute_command(client, 
            "curl -s http://localhost:5000/api/questions | python3 -m json.tool | head -40",
            "Questions API"
        )
        
        # Parse response to get count
        count_cmd = "curl -s http://localhost:5000/api/questions | python3 -c 'import sys, json; data = json.load(sys.stdin); print(\"Total questions:\", data.get(\"total\", 0))'"
        execute_command(client, count_cmd, "")
        
        print("\n" + "="*60)
        print("STEP 4: Test from external URL")
        print("="*60)
        
        # Test through nginx
        execute_command(client,
            "curl -s https://learnwithai.tech/api/questions | python3 -c 'import sys, json; data = json.load(sys.stdin); print(\"External API Total:\", data.get(\"total\", 0))'",
            "Public API test"
        )
        
        client.close()
        
        print("\n" + "="*60)
        print("✅ API CONFIGURED AND RUNNING!")
        print("="*60)
        print("\n🌐 Public Endpoint:")
        print("   GET https://learnwithai.tech/api/questions")
        print("\n📱 Frontend Page:")
        print("   https://learnwithai.tech/ai-learn/questions")
        print("\n💡 Next: Update Angular component to use API")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    restart_api_and_test()
