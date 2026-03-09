import paramiko
import sys
import time

hostname = '76.13.244.113'
username = 'root'
password = '1ZC7Lts7,saeb)Y0H4@n'
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

def fix_mongodb():
    try:
        print(f"🔌 Connecting to {hostname}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print(f"✅ Connected\n")
        
        print("="*60)
        print("STEP 1: Check MongoDB binding")
        print("="*60)
        execute_command(client, "grep bindIp /etc/mongod.conf", "")
        execute_command(client, "netstat -tulpn | grep 27017", "Current port status")
        
        print("\n" + "="*60)
        print("STEP 2: Configure Firewall (UFW)")
        print("="*60)
        execute_command(client, "ufw status | grep 27017 || echo 'Port 27017 not in firewall'", "Check current rules")
        execute_command(client, "ufw allow 27017/tcp", "Opening port 27017")
        execute_command(client, "ufw status | grep 27017", "Verify rule added")
        
        print("\n" + "="*60)
        print("STEP 3: Check existing MongoDB users")
        print("="*60)
        execute_command(client, 
            'mongosh admin --quiet --eval "db.getUsers()" 2>&1 | head -20',
            "List admin users"
        )
        
        print("\n" + "="*60)
        print("STEP 4: Recreate MongoDB user with correct password")
        print("="*60)
        
        # Drop existing user and recreate
        mongo_script = """
mongosh admin --quiet --eval '
try {
    db.dropUser("jbadmin");
    print("✓ Dropped existing jbadmin user");
} catch(e) {
    print("ℹ User jbadmin does not exist");
}

try {
    db.createUser({
        user: "jbadmin",
        pwd: "1ZC7Lts7,saeb)Y0H4@n",
        roles: [
            { role: "userAdminAnyDatabase", db: "admin" },
            { role: "readWriteAnyDatabase", db: "admin" },
            { role: "dbAdminAnyDatabase", db: "admin" }
        ]
    });
    print("✅ Created user jbadmin with full administrative privileges");
} catch(e) {
    print("❌ Failed to create user: " + e);
}

print("\\n📋 Verifying user creation:");
db.getUser("jbadmin");
'
"""
        execute_command(client, mongo_script, "Creating MongoDB user")
        
        print("\n" + "="*60)
        print("STEP 5: Test authentication")
        print("="*60)
        test_cmd = 'mongosh "mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@localhost:27017/admin" --quiet --eval "db.runCommand({connectionStatus: 1})" 2>&1'
        execute_command(client, test_cmd, "Testing connection")
        
        print("\n" + "="*60)
        print("STEP 6: Check jayant-portfolio database")
        print("="*60)
        check_db_cmd = 'mongosh "mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@localhost:27017/jayant-portfolio?authSource=admin" --quiet --eval "db.questions.countDocuments()" 2>&1'
        execute_command(client, check_db_cmd, "Counting questions")
        
        print("\n" + "="*60)
        print("STEP 7: Test remote connection from server")
        print("="*60)
        remote_test = f'mongosh "mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@{hostname}:27017/jayant-portfolio?authSource=admin" --quiet --eval "db.getName()" 2>&1'
        execute_command(client, remote_test, "Testing remote connection")
        
        client.close()
        
        print("\n" + "="*60)
        print("✅ MONGODB CONFIGURATION COMPLETE!")
        print("="*60)
        print("\n📱 Use this connection string in MongoDB Compass:")
        print(f"\n   mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@{hostname}:27017/jayant-portfolio?authSource=admin")
        print(f"\n🌐 Or fill in manually:")
        print(f"   Hostname: {hostname}")
        print(f"   Port: 27017")
        print(f"   Username: jbadmin")
        print(f"   Password: 1ZC7Lts7,saeb)Y0H4@n")
        print(f"   Auth Database: admin")
        print(f"   Default Database: jayant-portfolio")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    fix_mongodb()
