// Script to initialize admin user in KV storage
// Run this once: node init-admin.js

const API_URL = 'https://jayant-portfolio-api.jayant-ai.workers.dev/api';

async function initializeAdmin() {
  try {
    console.log('🔧 Initializing admin user...');
    
    const response = await fetch(`${API_URL}/auth/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'admin',
        password: 'admin'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Admin user initialized successfully!');
      console.log('   Username: admin');
      console.log('   Password: admin');
    } else {
      console.log('⚠️  Response:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

initializeAdmin();
