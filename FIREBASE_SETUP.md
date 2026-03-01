# Firebase / Google Login Setup

Google Sign-In uses Firebase Authentication. The app code is already wired up—you just need to paste 3 values from the Firebase console.

## Steps

### 1. Open Firebase Console
Go to → https://console.firebase.google.com

### 2. Select Your Project
Click on **myportfolioadmin-d45bd** (the project already exists based on your `authDomain`).

### 3. Enable Google Sign-In
1. Left sidebar → **Authentication**
2. **Sign-in method** tab
3. Click **Google** → toggle to **Enabled**
4. Set a support email → **Save**

### 4. Enable Authorised Domains
1. Still in Authentication → **Settings** tab
2. **Authorised domains** section
3. Add `learnwithai.tech` (your production domain)
4. `localhost` should already be there for local dev

### 5. Get Your Web App Config
1. Click the ⚙️ gear icon → **Project Settings**
2. Scroll to **Your apps** section
3. If no web app exists, click **</>** to create one
4. Click on your web app → **SDK setup and configuration** → select **Config**
5. You'll see something like:
```js
const firebaseConfig = {
  apiKey: "AIzaSy-XXXX",
  authDomain: "myportfolioadmin-d45bd.firebaseapp.com",
  projectId: "myportfolioadmin-d45bd",
  storageBucket: "myportfolioadmin-d45bd.appspot.com",
  messagingSenderId: "123456789",     ← copy this
  appId: "1:123456789:web:abcdef"     ← copy this
};
```

### 6. Update environment files

Edit **both** files with your real values:

**`angular-starter/src/environments/environment.ts`** (local dev)
**`angular-starter/src/environments/environment.prod.ts`** (production)

```typescript
firebase: {
  apiKey: 'AIzaSy-XXXX',              // from Firebase console
  authDomain: 'myportfolioadmin-d45bd.firebaseapp.com',
  projectId: 'myportfolioadmin-d45bd',
  storageBucket: 'myportfolioadmin-d45bd.appspot.com',
  messagingSenderId: '123456789',       // from Firebase console
  appId: '1:123456789:web:abcdef'       // from Firebase console
}
```

### 7. Deploy
After filling in the values, rebuild and redeploy the Angular app:
```bash
ng build --configuration production
# then push to your server
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `auth/invalid-api-key` | Wrong `apiKey` | Copy again from Firebase console |
| `auth/unauthorized-domain` | Domain not whitelisted | Add domain in Authentication → Settings → Authorised domains |
| `auth/popup-blocked` | Browser blocked pop-up | Allow popups for the site |
| Redirect instead of popup | `signInWithPopup` blocked | Ensure HTTPS in production |
