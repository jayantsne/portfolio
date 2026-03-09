import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('76.13.244.113', username='root', password='1ZC7Lts7,saeb)Y0H4@n', timeout=15)

# Check proxy timeouts and buffering
_, o, _ = c.exec_command('grep -n "proxy_read_timeout\\|proxy_send_timeout\\|keepalive_timeout\\|Accel-Buffering\\|proxy_buffering" /etc/nginx/sites-enabled/learnwithai.tech.conf')
print("=== Sites-enabled config ===")
print(o.read().decode())

_, o, _ = c.exec_command('grep -n "proxy_read_timeout\\|proxy_send_timeout\\|proxy_buffering" /etc/nginx/nginx.conf')
print("=== Main nginx.conf ===")
print(o.read().decode())

# Show the full location block for /api/
_, o, _ = c.exec_command('sed -n "/location.*api/,/^[[:space:]]*}/p" /etc/nginx/sites-enabled/learnwithai.tech.conf | head -40')
print("=== API location block ===")
print(o.read().decode())
c.close()
