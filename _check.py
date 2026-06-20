import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('76.13.244.113', username='root', password='<DEPLOY_SSH_PASSWORD>', timeout=30)
_, o, _ = c.exec_command(
    'ls /var/www/learnwithai.tech/ 2>/dev/null; echo SPLIT; '
    'grep -E "root|server_name" /etc/nginx/sites-enabled/* 2>/dev/null; echo SPLIT; '
    'cat /etc/systemd/system/ailearnapi.service 2>/dev/null | head -20'
)
print(o.read().decode())
c.close()
