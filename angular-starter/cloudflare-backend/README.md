# Cloudflare Workers Backend Deployment

## Setup

### 1. Install Dependencies
```powershell
cd cloudflare-backend
npm install
```

### 2. Install Wrangler CLI (if not installed)
```powershell
npm install -g wrangler
```

### 3. Login to Cloudflare
```powershell
wrangler login
```

### 4. Deploy to Cloudflare Workers
```powershell
npm run deploy
```

## Development

### Run locally
```powershell
npm run dev
```

This will start the development server at http://localhost:8787

## After Deployment

1. You'll get a Workers URL like: `https://jayant-portfolio-api.YOUR-SUBDOMAIN.workers.dev`

2. Update your Angular `environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://jayant-portfolio-api.YOUR-SUBDOMAIN.workers.dev/api'
};
```

3. Redeploy your frontend:
```powershell
npm run deploy:hosting
```

## Pricing

Cloudflare Workers Free Tier:
- 100,000 requests/day
- 10ms CPU time per request
- More than enough for your portfolio site!

## MongoDB Atlas Setup

Make sure MongoDB Atlas allows connections from anywhere (0.0.0.0/0) since Cloudflare Workers use dynamic IPs.

1. Go to MongoDB Atlas Dashboard
2. Network Access > Add IP Address
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Confirm

## Notes

- The API uses Hono (similar to Express but optimized for edge runtimes)
- All your existing endpoints work the same way
- Mongoose is supported in Cloudflare Workers
- CORS is configured for your Firebase hosting domain
