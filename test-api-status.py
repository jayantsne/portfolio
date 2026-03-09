import paramiko, json

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('76.13.244.113', username='root', password='1ZC7Lts7,saeb)Y0H4@n', timeout=15)

# Check service status and test the endpoint
cmd = '''systemctl is-active ailearn-api
echo "---"
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:5001/api/ai/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41" \
  -d '{"question":"What is async await","maxTokens":20}' \
  --max-time 30
echo ""
echo "---"
curl -s -X POST http://127.0.0.1:5001/api/ai/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41" \
  -d '{"question":"hi","maxTokens":5}' \
  --max-time 15 | head -c 300
'''

_, o, e = c.exec_command(cmd)
print(o.read().decode())
err = e.read().decode()
if err:
    print("STDERR:", err)
c.close()
