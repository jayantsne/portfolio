const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('https://jayant-portfolio-api.jayant-ai.workers.dev/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    console.log('Login Response:', JSON.stringify(data, null, 2));
    console.log('Status:', response.status);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
