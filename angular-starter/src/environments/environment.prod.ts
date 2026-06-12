export const environment = {
  production: true,
  apiUrl: 'https://learnwithai.tech/api',
  apiKey: '<API_KEY>',
  groqApiKeys: [
    'gsk_YOUR_PRODUCTION_KEY_1',
    'gsk_YOUR_PRODUCTION_KEY_2',
    'gsk_YOUR_PRODUCTION_KEY_3'
  ],
  // ─── Firebase ──────────────────────────────────────────────────────
  // Same project as dev — fill in the 3 values from Firebase console.
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
    projectId: 'myportfolioadmin',
    storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'YOUR_FIREBASE_APP_ID',
    measurementId: 'YOUR_FIREBASE_MEASUREMENT_ID'
  }
};
