import paramiko, io

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('76.13.244.113', username='root', password='1ZC7Lts7,saeb)Y0H4@n', timeout=15)

patch = b"""
import re
path = '/etc/nginx/sites-enabled/learnwithai.tech.conf'
txt = open(path).read()
txt = re.sub(r"add_header 'Access-Control-Allow-Headers'[^;]+;",
             "add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-API-Key' always;", txt)
txt = re.sub(r"add_header 'Access-Control-Allow-Origin'[^;]+;",
             "add_header 'Access-Control-Allow-Origin' '*' always;", txt)
open(path, 'w').write(txt)
print('patched')
"""

sftp = c.open_sftp()
sftp.putfo(io.BytesIO(patch), '/tmp/patchenabled.py')
sftp.close()

_, o, e = c.exec_command('python3 /tmp/patchenabled.py && nginx -t && systemctl reload nginx && echo RELOADED')
print(o.read().decode())
print(e.read().decode())
c.close()
