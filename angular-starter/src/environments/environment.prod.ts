export const environment = {
  production: true,
  apiUrl: 'http://learnwithai.tech/api',  // VPS Backend API
  groqApiKeys: [
    // ⚠️ ADD YOUR GROQ API KEYS HERE FOR PRODUCTION
    // Get free keys at: https://console.groq.com/keys
    // Free tier: 30 req/min, 14,400 req/day per key
    // Add multiple keys for better rate limits
    'gsk_YOUR_PRODUCTION_KEY_1',
    'gsk_YOUR_PRODUCTION_KEY_2',
    'gsk_YOUR_PRODUCTION_KEY_3'
  ]
};
