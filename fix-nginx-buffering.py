import paramiko, io

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('76.13.244.113', username='root', password='<DEPLOY_SSH_PASSWORD>', timeout=15)

patch = b"""
import re
path = '/etc/nginx/sites-enabled/learnwithai.tech.conf'
txt = open(path).read()

# Add proxy_buffering off after proxy_read_timeout in the api location block
old = "        proxy_read_timeout 300s;\\n        proxy_connect_timeout 300s;"
new = "        proxy_read_timeout 300s;\\n        proxy_connect_timeout 300s;\\n        proxy_buffering off;"

if 'proxy_buffering off' not in txt:
    txt = txt.replace(old, new, 1)
    open(path, 'w').write(txt)
    print('patched: added proxy_buffering off')
else:
    print('already has proxy_buffering off')
"""

sftp = c.open_sftp()
sftp.putfo(io.BytesIO(patch), '/tmp/patchbuf.py')
sftp.close()

_, o, e = c.exec_command('python3 /tmp/patchbuf.py && nginx -t && systemctl reload nginx && echo RELOADED')
print(o.read().decode())
print(e.read().decode())
c.close()
