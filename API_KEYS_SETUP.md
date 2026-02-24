# API Keys Configuration

## ⚠️ IMPORTANT: Never commit API keys to Git!

This project uses the Groq API for AI features. You need to add your API keys in the environment files.

## For Local Development

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://jayant-portfolio-api.jayant-ai.workers.dev/api',
  groqApiKeys: [
    'gsk_YOUR_ACTUAL_KEY_1',  // Replace with your actual key
    'gsk_YOUR_ACTUAL_KEY_2',  // Add more keys for better limits
    'gsk_YOUR_ACTUAL_KEY_3'
  ]
};
```

## For Production

Edit `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'http/learnwithai.tech/api',
  groqApiKeys: [
    'gsk_YOUR_PRODUCTION_KEY_1',  // Replace with your production keys
    'gsk_YOUR_PRODUCTION_KEY_2',
    'gsk_YOUR_PRODUCTION_KEY_3'
  ]
};
```

## Getting Groq API Keys

1. Go to https://console.groq.com/keys
2. Sign up for free
3. Create API keys
4. **Free tier:** 30 requests/minute, 14,400 requests/day per key
5. Add multiple keys for better rate limits

## Security Best Practices

✅ **DO:**
- Keep API keys in environment files
- Add `environment.prod.ts` to `.gitignore` if it contains real keys
- Use environment variables in production
- Rotate keys regularly

❌ **DON'T:**
- Commit API keys to Git
- Share API keys publicly
- Hardcode keys in service files

## Alternative: Use Environment Variables

For even better security, consider using Angular environment variables or a backend proxy to handle API calls.
