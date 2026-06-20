import paramiko
import sys

hostname = '76.13.244.113'
username = 'root'
password = '<DEPLOY_SSH_PASSWORD>'
port = 22

def execute_command(client, command, description=""):
    """Execute a command and print results"""
    if description:
        print(f"\n{'='*60}")
        print(f"🔧 {description}")
        print(f"{'='*60}")
    stdin, stdout, stderr = client.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    exit_code = stdout.channel.recv_exit_status()
    
    if output:
        print(output.strip())
    if error and exit_code != 0:
        print(f"⚠️ {error.strip()}")
    
    return exit_code, output, error

def import_questions_to_mongodb():
    try:
        print(f"🔌 Connecting to {hostname}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print(f"✅ Connected\n")
        
        print("="*60)
        print("STEP 1: Check if questions already exist")
        print("="*60)
        check_cmd = 'mongosh "mongodb://jbadmin:<MONGODB_PASSWORD_URL_ENCODED>@localhost:27017/jayant-portfolio?authSource=admin" --quiet --eval "db.questions.countDocuments()"'
        code, output, error = execute_command(client, check_cmd, "")
        
        count = int(output.strip()) if output.strip().isdigit() else 0
        print(f"Current question count: {count}")
        
        if count > 0:
            print(f"\n⚠️ Database already has {count} questions!")
            print("Do you want to:")
            print("  1. Keep existing and skip import")
            print("  2. Clear and import from Atlas backup")
            choice = input("Enter choice (1 or 2): ").strip()
            
            if choice == "2":
                print("\n" + "="*60)
                print("STEP 2: Clearing existing questions")
                print("="*60)
                clear_cmd = 'mongosh "mongodb://jbadmin:<MONGODB_PASSWORD_URL_ENCODED>@localhost:27017/jayant-portfolio?authSource=admin" --quiet --eval "db.questions.deleteMany({})"'
                execute_command(client, clear_cmd, "")
            elif choice == "1":
                print("\n✅ Keeping existing questions. Exiting...")
                client.close()
                return
            else:
                print("\n❌ Invalid choice. Exiting...")
                client.close()
                return
        
        print("\n" + "="*60)
        print("STEP 3: Import questions from MongoDB Atlas")
        print("="*60)
        
        # Use mongorestore to import from Atlas
        atlas_uri = "mongodb+srv://bjayantsne_db_user:<MONGODB_PASSWORD>@cluster0.9liq2qs.mongodb.net/jayant-portfolio"
        
        import_cmd = f'''
# Create temp directory
mkdir -p /tmp/mongo-backup

# Export from Atlas
mongodump --uri="{atlas_uri}" --collection=questions --out=/tmp/mongo-backup

# Import to local MongoDB
mongorestore --uri="mongodb://jbadmin:<MONGODB_PASSWORD_URL_ENCODED>@localhost:27017/jayant-portfolio?authSource=admin" --dir=/tmp/mongo-backup/jayant-portfolio --drop

# Cleanup
rm -rf /tmp/mongo-backup

# Count imported questions
mongosh "mongodb://jbadmin:<MONGODB_PASSWORD_URL_ENCODED>@localhost:27017/jayant-portfolio?authSource=admin" --quiet --eval "print('✅ Total questions imported:', db.questions.countDocuments())"
'''
        
        execute_command(client, import_cmd, "Importing from Atlas")
        
        print("\n" + "="*60)
        print("STEP 4: Verify data")
        print("="*60)
        verify_cmd = 'mongosh "mongodb://jbadmin:<MONGODB_PASSWORD_URL_ENCODED>@localhost:27017/jayant-portfolio?authSource=admin" --quiet --eval "db.questions.findOne()" | head -30'
        execute_command(client, verify_cmd, "Sample question")
        
        print("\n" + "="*60)
        print("STEP 5: Restart .NET API")
        print("="*60)
        execute_command(client, "systemctl restart ailearnapi.service", "Restarting API")
        execute_command(client, "sleep 3 && systemctl status ailearnapi.service --no-pager | head -10", "API Status")
        
        print("\n" + "="*60)
        print("STEP 6: Test API endpoint")
        print("="*60)
        test_cmd = 'curl -s http://localhost:5000/api/questions | jq -r ".total" || echo "Failed to fetch"'
        execute_command(client, test_cmd, "Testing /api/questions")
        
        client.close()
        
        print("\n" + "="*60)
        print("✅ IMPORT COMPLETE!")
        print("="*60)
        print("\n🌐 Questions should now be available at:")
        print("   https://learnwithai.tech/api/questions")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    import_questions_to_mongodb()
