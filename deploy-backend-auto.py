#!/usr/bin/env python3
"""
Automated backend deployment script
Uploads ASP.NET backend to production server
"""
import subprocess
import sys
import os

def main():
    server = "76.13.244.113"
    username = "root"
    password = "1ZC7Lts7,saeb)Y0H4@n"
    local_path = r"d:\folio\jayant-angular-ui\enterprise-dotnet-api\publish"
    remote_path = "/var/www/ai-learn-api"
    
    print("🚀 Starting automated deployment...")
    print(f"📁 Local: {local_path}")
    print(f"🌐 Remote: {username}@{server}:{remote_path}")
    print()
    
    # Check if paramiko is available
    try:
        import paramiko
        from scp import SCPClient
        print("✅ Using Python SSH/SCP libraries...")
        deploy_with_paramiko(server, username, password, local_path, remote_path)
    except ImportError:
        print("⚠️  paramiko/scp not installed")
        print("📦 Installing required packages...")
        
        # Install paramiko and scp
        subprocess.run([sys.executable, "-m", "pip", "install", "paramiko", "scp"], 
                      check=True, capture_output=True)
        
        print("✅ Packages installed! Retrying deployment...")
        import paramiko
        from scp import SCPClient
        deploy_with_paramiko(server, username, password, local_path, remote_path)

def deploy_with_paramiko(server, username, password, local_path, remote_path):
    """Deploy using paramiko SSH library"""
    import paramiko
    from scp import SCPClient
    import glob
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"🔐 Connecting to {server}...")
        ssh.connect(server, username=username, password=password, timeout=30)
        print("✅ Connected!")
        
        # Clear remote directory
        print(f"🧹 Clearing {remote_path}...")
        stdin, stdout, stderr = ssh.exec_command(f"rm -rf {remote_path}/*")
        stdout.channel.recv_exit_status()  # Wait for command
        
        # Upload files using SCP
        print("📤 Uploading files...")
        with SCPClient(ssh.get_transport(), progress=progress_callback) as scp:
            # Get all files in publish directory
            files = glob.glob(os.path.join(local_path, "*"))
            total_files = len(files)
            
            for idx, file_path in enumerate(files, 1):
                if os.path.isfile(file_path):
                    filename = os.path.basename(file_path)
                    print(f"   [{idx}/{total_files}] {filename}")
                    scp.put(file_path, remote_path)
        
        print("✅ Upload complete!")
        
        # Set permissions
        print("🔧 Setting permissions...")
        commands = [
            f"chmod +x {remote_path}/AILearnAPI.Api",
            f"chown -R www-data:www-data {remote_path}",
            "systemctl restart ailearn-api",
            "systemctl status ailearn-api --no-pager"
        ]
        
        for cmd in commands:
            print(f"   Running: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                error = stderr.read().decode()
                if error:
                    print(f"   ⚠️  {error}")
        
        print("✅ Service restarted!")
        print()
        print("🎉 DEPLOYMENT COMPLETE!")
        print()
        print("🧪 Test the API:")
        print("   http://learnwithai.tech/api/ai/ollama/health")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

def progress_callback(filename, size, sent):
    """Progress callback for SCP"""
    pass  # Silent progress

if __name__ == "__main__":
    main()
