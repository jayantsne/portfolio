export const environment = {
  production: true,
  apiUrl: 'https://learnwithai.tech/api',
  apiKey: 'b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41',
  groqApiKeys: [
    'gsk_YOUR_PRODUCTION_KEY_1',
    'gsk_YOUR_PRODUCTION_KEY_2',
    'gsk_YOUR_PRODUCTION_KEY_3'
  ],
  // ─── Firebase ──────────────────────────────────────────────────────
  // Same project as dev — fill in the 3 values from Firebase console.
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'myportfolioadmin-d45bd.firebaseapp.com',
    projectId: 'myportfolioadmin-d45bd',
    storageBucket: 'myportfolioadmin-d45bd.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  }
};
