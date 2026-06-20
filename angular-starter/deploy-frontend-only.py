import paramiko
import os
import time

# Server Configuration
SERVER_IP = '76.13.244.113'
SERVER_USER = 'root'
SERVER_PASSWORD = '<DEPLOY_SSH_PASSWORD>'

# Correct path - from workspace root
script_dir = os.path.dirname(os.path.abspath(__file__))
# Build output is in dist\angular-starter\
LOCAL_FRONTEND_PATH = os.path.join(script_dir, 'dist', 'angular-starter')

REMOTE_FRONTEND_PATH = '/var/www/learnwithai.tech/frontend'

print(f'📁 Looking for files in: {LOCAL_FRONTEND_PATH}')
print(f'📁 Exists: {os.path.exists(LOCAL_FRONTEND_PATH)}')

if os.path.exists(LOCAL_FRONTEND_PATH):
    files_count = sum([len(files) for r, d, files in os.walk(LOCAL_FRONTEND_PATH)])
    print(f'📦 Found {files_count} files to upload\n')
else:
    print('❌ Directory not found!')
    exit(1)

try:
    print('============================================================')
    print('Deploying Angular Frontend')
    print('============================================================\n')
    
    print('🔌 Connecting to server...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASSWORD)
    print('✅ Connected\n')

    # Backup
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    backup_path = f'{REMOTE_FRONTEND_PATH}.backup.{timestamp}'
    print(f'Step 1: Backup current frontend to {backup_path}')
    ssh.exec_command(f'cp -r {REMOTE_FRONTEND_PATH} {backup_path}')
    time.sleep(2)
    print('✅ Backup complete\n')
    
    # Clear
    print('Step 2: Clear current frontend folder')
    ssh.exec_command(f'rm -rf {REMOTE_FRONTEND_PATH}/*')
    time.sleep(1)
    print('✅ Cleared\n')
    
    # Upload
    print('Step 3: Upload new files via SFTP')
    sftp = ssh.open_sftp()
    
    files_uploaded = 0
    for root, dirs, files in os.walk(LOCAL_FRONTEND_PATH):
        for file in files:
            local_file = os.path.join(root, file)
            relative_path = os.path.relpath(local_file, LOCAL_FRONTEND_PATH)
            remote_file = os.path.join(REMOTE_FRONTEND_PATH, relative_path).replace('\\', '/')
            
            # Create remote directory if needed
            remote_dir = os.path.dirname(remote_file)
            try:
                sftp.stat(remote_dir)
            except:
                ssh.exec_command(f'mkdir -p {remote_dir}')
                time.sleep(0.1)
            
            # Upload file
            try:
                sftp.put(local_file, remote_file)
                files_uploaded += 1
                if files_uploaded % 20 == 0:
                    print(f'   Progress: {files_uploaded}/{files_count} files')
            except Exception as e:
                print(f'   ✗ Failed: {relative_path}: {e}')
    
    print(f'\n✅ All {files_uploaded} files uploaded\n')
    
    # Permissions
    print('Step 4: Set correct permissions')
    ssh.exec_command(f'chown -R www-data:www-data {REMOTE_FRONTEND_PATH}')
    ssh.exec_command(f'chmod -R 755 {REMOTE_FRONTEND_PATH}')
    time.sleep(1)
    print('✅ Permissions set\n')
    
    # Test
    print('Step 5: Test website')
    stdin, stdout, stderr = ssh.exec_command('curl -I https://learnwithai.tech/ai-learn/questions 2>&1 | head -5')
    result = stdout.read().decode('utf-8')
    print(result)
    
    if 'HTTP/2 200' in result or 'HTTP/1.1 200' in result:
        print('\n✅ Website is accessible!\n')
    else:
        print('\n⚠️ Website might have issues\n')
    
    sftp.close()
    ssh.close()
    
    print('============================================================')
    print('✅ DEPLOYMENT SUCCESSFUL!')
    print('============================================================')
    print('\n🌐 Visit: https://learnwithai.tech/ai-learn/questions')
    print('🎯 Click "Learn with AI" to see the new prompt selection modal!')
    print('\n📝 Features:')
    print('  - 8 specialized learning prompts per question')
    print('  - Beautiful prompt selection UI')
    print('  - AI loading animation while generating')
    print('  - Fast responses using stored prompts\n')

except Exception as e:
    print(f'\n❌ Deployment failed: {e}')
    import traceback
    traceback.print_exc()
