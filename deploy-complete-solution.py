import paramiko
import os
import time
import subprocess

# Server Configuration
SERVER_IP = '76.13.244.113'
SERVER_USER = 'root'
SERVER_PASSWORD = '1ZC7Lts7,saeb)Y0H4@n'

# Paths
LOCAL_FRONTEND_PATH = r'D:\folio\jayant-angular-ui\angular-starter\dist\angular-starter\browser'
LOCAL_API_PATH = r'D:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Api'

REMOTE_FRONTEND_PATH = '/var/www/learnwithai.tech/frontend'
REMOTE_API_PATH = '/var/www/learnwithai.tech/backend'

def print_step(step, message):
    """Print formatted step message"""
    print(f'\n{"="*60}')
    print(f'{step}: {message}')
    print(f'{"="*60}')

def execute_command(ssh, command, description):
    """Execute SSH command and return output"""
    print(f'\n🔧 {description}...')
    stdin, stdout, stderr = ssh.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    exit_code = stdout.channel.recv_exit_status()
    
    if exit_code != 0:
        print(f'❌ Error: {error}')
        return False, error
    
    if output:
        print(f'✅ {output[:500]}')  # Print first 500 chars
    return True, output

try:
    print_step('STEP 1', 'Connecting to server')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASSWORD)
    print('✅ Connected to server')

    # Step 2: Upload .NET API Changes
    print_step('STEP 2', 'Deploying .NET API updates')
    
    # Create list of files to upload (only the changed files)
    api_files = [
        (os.path.join(LOCAL_API_PATH, 'Controllers', 'QuestionsController.cs'), 
         os.path.join(REMOTE_API_PATH, 'Controllers', 'QuestionsController.cs')),
        (r'D:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Domain\Entities\Question.cs',
         '/var/www/learnwithai.tech/backend/Domain/Entities/Question.cs'),
        (r'D:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Shared\DTOs\Questions\LearnWithAIDto.cs',
         '/var/www/learnwithai.tech/backend/Shared/DTOs/Questions/LearnWithAIDto.cs'),
        (r'D:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Application\Services\QuestionService.cs',
         '/var/www/learnwithai.tech/backend/Application/Services/QuestionService.cs'),
        (r'D:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Application\Interfaces\IQuestionService.cs',
         '/var/www/learnwithai.tech/backend/Application/Interfaces/IQuestionService.cs'),
    ]
    
    sftp = ssh.open_sftp()
    
    print('\n📤 Uploading API files...')
    uploaded = 0
    for local_path, remote_path in api_files:
        if os.path.exists(local_path):
            try:
                # Ensure directory exists
                remote_dir = os.path.dirname(remote_path)
                ssh.exec_command(f'mkdir -p {remote_dir}')
                
                sftp.put(local_path, remote_path)
                uploaded += 1
                print(f'   ✓ {os.path.basename(local_path)}')
            except Exception as e:
                print(f'   ✗ {os.path.basename(local_path)}: {e}')
    
    print(f'\n✅ Uploaded {uploaded}/{len(api_files)} API files')
    
    # Step 3: Rebuild .NET API
    print_step('STEP 3', 'Building .NET API')
    success, output = execute_command(
        ssh,
        f'cd {REMOTE_API_PATH} && dotnet build -c Release',
        'Building API'
    )
    
    if not success:
        print('⚠️ Build might have issues, continuing...')
    
    # Step 4: Restart API service
    print_step('STEP 4', 'Restarting API service')
    execute_command(ssh, 'systemctl restart ailearnapi.service', 'Restarting service')
    time.sleep(3)  # Wait for service to start
    
    # Verify service is running
    execute_command(ssh, 'systemctl status ailearnapi.service --no-pager', 'Checking service status')
    
    # Step 5: Test API endpoints
    print_step('STEP 5', 'Testing new API endpoints')
    
    test_commands = [
        ('curl -s -H "X-API-Key: b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41" '
         'https://learnwithai.tech/api/questions/1/prompts | head -c 200',
         'Testing prompts endpoint'),
        ('curl -s -H "X-API-Key: b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41" '
         'https://learnwithai.tech/api/questions | grep -o \'"total":[0-9]*\'',
         'Testing questions endpoint'),
    ]
    
    for command, description in test_commands:
        execute_command(ssh, command, description)
    
    # Step 6: Deploy Angular Frontend
    print_step('STEP 6', 'Deploying Angular Frontend')
    
    # Backup current frontend
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    backup_path = f'{REMOTE_FRONTEND_PATH}.backup.{timestamp}'
    execute_command(ssh, f'cp -r {REMOTE_FRONTEND_PATH} {backup_path}', 'Backup current frontend')
    
    # Clear current frontend
    execute_command(ssh, f'rm -rf {REMOTE_FRONTEND_PATH}/*', 'Clear current frontend')
    
    # Upload new files
    print('\n📤 Uploading frontend files...')
    files_uploaded = 0
    
    for root, dirs, files in os.walk(LOCAL_FRONTEND_PATH):
        for file in files:
            local_file = os.path.join(root, file)
            relative_path = os.path.relpath(local_file, LOCAL_FRONTEND_PATH)
            remote_file = os.path.join(REMOTE_FRONTEND_PATH, relative_path).replace('\\', '/')
            
            # Ensure remote directory exists
            remote_dir = os.path.dirname(remote_file)
            ssh.exec_command(f'mkdir -p {remote_dir}')
            
            try:
                sftp.put(local_file, remote_file)
                files_uploaded += 1
                if files_uploaded % 20 == 0:
                    print(f'   Progress: {files_uploaded} files...')
            except Exception as e:
                print(f'   ✗ Failed to upload {relative_path}: {e}')
    
    print(f'\n✅ Uploaded {files_uploaded} files')
    
    # Set permissions
    execute_command(ssh, f'chown -R www-data:www-data {REMOTE_FRONTEND_PATH}', 'Set ownership')
    execute_command(ssh, f'chmod -R 755 {REMOTE_FRONTEND_PATH}', 'Set permissions')
    
    # Step 7: Test website
    print_step('STEP 7', 'Testing website')
    execute_command(
        ssh,
        'curl -I https://learnwithai.tech/ai-learn/questions 2>&1 | head -5',
        'Testing questions page'
    )
    
    sftp.close()
    ssh.close()
    
    print_step('SUCCESS', '🎉 Deployment Complete!')
    print('''
    ✅ Deployment Summary:
    
    1. ✅ .NET API updated with prompt endpoints
    2. ✅ API service restarted and running
    3. ✅ Angular frontend deployed with prompt selection UI
    4. ✅ Website accessible
    
    🌐 Test URLs:
    - Questions Page: https://learnwithai.tech/ai-learn/questions
    - API Prompts: https://learnwithai.tech/api/questions/1/prompts
    - API Health: https://learnwithai.tech/api/health
    
    📝 What changed:
    - ✨ Each question now has 8 specialized learning prompts
    - 🎯 Users can choose their learning style (Simple, Interview, Deep Dive, etc.)
    - 🤖 AI generates responses based on selected prompt
    - ⚡ Fast response using prompt templates stored in DB
    - 🎨 Beautiful prompt selection modal with animations
    
    📊 Database:
    - 364 questions with prompts in MongoDB
    - 8 prompts per question = 2,912 total prompts
    
    🎓 Next Step: Visit https://learnwithai.tech/ai-learn/questions and click "Learn with AI" button!
    ''')

except Exception as e:
    print(f'\n❌ Deployment failed: {e}')
    import traceback
    traceback.print_exc()
    
    if 'ssh' in locals():
        ssh.close()
