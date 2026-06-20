import paramiko
import os
import sys
from pathlib import Path

hostname = '76.13.244.113'
username = 'root'
password = '<DEPLOY_SSH_PASSWORD>'
port = 22

def deploy_angular_app():
    try:
        print("🔌 Connecting to server...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print("✅ Connected\n")
        
        # Check if dist folder exists
        script_dir = Path(__file__).parent
        dist_path = script_dir / 'dist' / 'angular-starter'
        
        if not dist_path.exists():
            # Try alternative path (if run from parent directory)
            dist_path = Path('angular-starter/dist/angular-starter')
            if not dist_path.exists():
                print("❌ Dist folder not found. Please build first:")
                print("   cd angular-starter && npm run build -- --configuration production")
                sys.exit(1)
        
        print("="*60)
        print("Step 1: Backup current frontend")
        print("="*60)
        stdin, stdout, stderr = client.exec_command(
            "cp -r /var/www/learnwithai.tech/frontend /var/www/learnwithai.tech/frontend.backup.$(date +%Y%m%d_%H%M%S)"
        )
        stdout.channel.recv_exit_status()
        print("✅ Backup created")
        
        print("\n" + "="*60)
        print("Step 2: Clear current frontend folder")
        print("="*60)
        stdin, stdout, stderr = client.exec_command(
            "rm -rf /var/www/learnwithai.tech/frontend/*"
        )
        stdout.channel.recv_exit_status()
        print("✅ Frontend folder cleared")
        
        print("\n" + "="*60)
        print("Step 3: Upload new files via SFTP")
        print("="*60)
        
        sftp = client.open_sftp()
        local_files = list(dist_path.rglob('*'))
        total = len([f for f in local_files if f.is_file()])
        uploaded = 0
        
        for local_file in local_files:
            if local_file.is_file():
                relative_path = local_file.relative_to(dist_path)
                remote_file = f"/var/www/learnwithai.tech/frontend/{relative_path.as_posix()}"
                
                # Create remote directory if needed
                remote_dir = os.path.dirname(remote_file)
                try:
                    sftp.stat(remote_dir)
                except FileNotFoundError:
                    stdin, stdout, stderr = client.exec_command(f"mkdir -p {remote_dir}")
                    stdout.channel.recv_exit_status()
                
                # Upload file
                sftp.put(str(local_file), remote_file)
                uploaded += 1
                if uploaded % 10 == 0 or uploaded == total:
                    print(f"   Progress: {uploaded}/{total} files")
        
        sftp.close()
        print("✅ All files uploaded")
        
        print("\n" + "="*60)
        print("Step 4: Set correct permissions")
        print("="*60)
        stdin, stdout, stderr = client.exec_command(
            "chown -R www-data:www-data /var/www/learnwithai.tech/frontend && chmod -R 755 /var/www/learnwithai.tech/frontend"
        )
        stdout.channel.recv_exit_status()
        print("✅ Permissions set")
        
        print("\n" + "="*60)
        print("Step 5: Test website")
        print("="*60)
        stdin, stdout, stderr = client.exec_command(
            "curl -I https://learnwithai.tech/ai-learn/questions 2>&1 | head -5"
        )
        result = stdout.read().decode('utf-8')
        print(result)
        
        client.close()
        
        print("\n" + "="*60)
        print("✅ DEPLOYMENT SUCCESSFUL!")
        print("="*60)
        print("\n🌐 Your website is now live:")
        print("   https://learnwithai.tech")
        print("   https://learnwithai.tech/ai-learn/questions")
        print("\n📊 API Endpoint:")
        print("   GET https://learnwithai.tech/api/questions")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    deploy_angular_app()
