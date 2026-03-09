import paramiko, io, re

host = "76.13.244.113"
user = "root"
password = "1ZC7Lts7,saeb)Y0H4@n"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=password, timeout=15)

# Upload a patch script via SFTP
patch_script = b"""
import re, os
files = [
    '/etc/nginx/sites-available/learnwithai.tech',
    '/etc/nginx/sites-available/learnwithai.tech.conf',
]
for path in files:
    if not os.path.exists(path):
        continue
    txt = open(path).read()
    orig = txt
    txt = re.sub(r"add_header 'Access-Control-Allow-Headers'[^;]+;",
                 "add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-API-Key' always;", txt)
    txt = re.sub(r"add_header 'Access-Control-Allow-Origin'[^;]+;",
                 "add_header 'Access-Control-Allow-Origin' '*' always;", txt)
    open(path, 'w').write(txt)
    print('patched', path, 'changes:', txt != orig)
"""

sftp = c.open_sftp()
sftp.putfo(io.BytesIO(patch_script), '/tmp/patchnginx.py')
sftp.close()

_, out, err = c.exec_command('python3 /tmp/patchnginx.py && nginx -t && systemctl reload nginx && echo DONE')
print(out.read().decode())
print(err.read().decode())
c.close()
