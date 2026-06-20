import paramiko
import sys

# Server details
hostname = '76.13.244.113'
username = 'root'
password = '<DEPLOY_SSH_PASSWORD>'
port = 22

# Commands to diagnose the server
commands = [
    'echo "=== SERVICE STATUS ==="',
    'systemctl status ailearnapi.service --no-pager | head -20',
    'echo -e "\n=== NGINX STATUS ==="',
    'systemctl status nginx --no-pager | head -10', 
    'echo -e "\n=== MONGODB STATUS ==="',
    'systemctl status mongod --no-pager | head -10',
    'echo -e "\n=== RUNNING PROCESSES ==="',
    'ps aux | grep -E "dotnet|nginx|mongod" | grep -v grep',
    'echo -e "\n=== BACKEND API TEST ==="',
    'curl -I http://localhost:5000/api/health 2>&1 | head -10 || echo "API not responding"',
    'echo -e "\n=== DEPLOYED FILES ==="',
    'ls -lah /var/www/learnwithai.tech/ 2>&1',
    'echo -e "\n=== BACKEND DLL FILES ==="',
    'ls -la /var/www/learnwithai.tech/backend/*.dll 2>&1 || echo "No DLL files found"',
    'echo -e "\n=== RECENT API LOGS ==="',  
    'journalctl -u ailearnapi.service -n 30 --no-pager 2>&1',
    'echo -e "\n=== NGINX ERROR LOGS ==="',
    'tail -20 /var/log/nginx/learnwithai.tech_error.log 2>&1 || echo "No nginx error log"',
    'echo -e "\n=== PORT LISTENERS ==="',
    'netstat -tulpn | grep -E ":(80|443|5000|27017)"'
]

def check_server():
    try:
        print(f"🔌 Connecting to {hostname}...")
        
        # Create SSH client
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print(f"✅ Connected to {hostname}\n")
        
        # Execute commands
        for cmd in commands:
            stdin, stdout, stderr = client.exec_command(cmd)
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            
            if output:
                print(output)
            if error and 'echo' not in cmd:
                print(f"Error: {error}")
        
        # Close connection
        client.close()
        print(f"\n👋 Connection closed")
        
    except paramiko.AuthenticationException:
        print("❌ Authentication failed. Check credentials.")
        sys.exit(1)
    except paramiko.SSHException as e:
        print(f"❌ SSH error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    check_server()
