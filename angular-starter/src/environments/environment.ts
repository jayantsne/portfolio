// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: '/api',
  apiKey: '<API_KEY>',
  groqApiKeys: [] as string[],
  // groqApiKeys: ['gsk_YOUR_ACTUAL_KEY_HERE'],  // Add your GROQ API keys here
  // ─── Firebase ──────────────────────────────────────────────────────
  // Google login will NOT work until you fill in the 3 values below.
  // Steps:
  //  1. Go to https://console.firebase.google.com
  //  2. Select project "myportfolioadmin-d45bd"  (or create one)
  //  3. Authentication → Sign-in method → Enable Google
  //  4. Project Settings (gear icon) → Your apps → Web app
  //  5. Click </> to register a web app if none exists
  //  6. Copy the firebaseConfig object values into the fields below
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

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
