import paramiko
import sys
import time

hostname = '76.13.244.113'
username = 'root'
password = '<DEPLOY_SSH_PASSWORD>'
port = 22

def execute_command(client, command, description):
    """Execute a command and print results"""
    print(f"\n{'='*60}")
    print(f"🔧 {description}")
    print(f"{'='*60}")
    stdin, stdout, stderr = client.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    exit_code = stdout.channel.recv_exit_status()
    
    if output:
        print(output)
    if error:
        print(f"⚠️ Error output: {error}")
    
    return exit_code, output, error

def fix_server():
    try:
        print(f"🔌 Connecting to {hostname}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print(f"✅ Connected successfully\n")
        
        # Step 1: Test nginx configuration
        execute_command(client, 
            "nginx -t",
            "Testing Nginx Configuration"
        )
        
        # Step 2: Check if SSL certificates exist
        execute_command(client,
            "ls -la /etc/letsencrypt/live/learnwithai.tech/ 2>&1 || echo 'SSL certificates not found'",
            "Checking SSL Certificates"
        )
        
        # Step 3: Check nginx config file
        execute_command(client,
            "cat /etc/nginx/sites-available/learnwithai.tech.conf 2>&1 || echo 'Config file not found'",
            "Checking Nginx Config File"
        )
        
        # Step 4: Check if frontend files exist
        execute_command(client,
            "ls -lah /var/www/learnwithai.tech/frontend/ 2>&1",
            "Checking Frontend Files"
        )
        
        # Step 5: Check nginx error log
        execute_command(client,
            "tail -50 /var/log/nginx/error.log 2>&1 || echo 'No error log'",
            "Checking Nginx Error Logs"
        )
        
        # Step 6: Fix permissions
        execute_command(client,
            "chown -R www-data:www-data /var/www/learnwithai.tech/frontend 2>&1",
            "Fixing Frontend File Permissions"
        )
        
        # Step 7: Try to start nginx
        print(f"\n{'='*60}")
        print("🚀 Attempting to start Nginx...")
        print(f"{'='*60}")
        
        exit_code, output, error = execute_command(client,
            "systemctl start nginx",
            "Starting Nginx"
        )
        
        time.sleep(2)
        
        # Step 8: Check nginx status
        execute_command(client,
            "systemctl status nginx --no-pager | head -15",
            "Nginx Status After Start"
        )
        
        # Step 9: Check if ports are now listening
        execute_command(client,
            "netstat -tulpn | grep -E ':(80|443|5000)'",
            "Port Listeners"
        )
        
        # Step 10: Test the website
        execute_command(client,
            "curl -I http://localhost 2>&1 | head -10",
            "Testing Website (HTTP)"
        )
        
        client.close()
        print(f"\n{'='*60}")
        print("✅ Diagnostic and fix attempt complete!")
        print(f"{'='*60}")
        print("\n🌐 Try accessing: http://76.13.244.113 or https://learnwithai.tech")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    fix_server()
