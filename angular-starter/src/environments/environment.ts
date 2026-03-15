// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: '/api',
  apiKey: 'b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41',
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
    apiKey: 'YOUR_FIREBASE_API_KEY',          // e.g. AIzaSy...
    authDomain: 'myportfolioadmin-d45bd.firebaseapp.com',
    projectId: 'myportfolioadmin-d45bd',
    storageBucket: 'myportfolioadmin-d45bd.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',  // numeric, e.g. 123456789
    appId: 'YOUR_APP_ID'                      // e.g. 1:123:web:abc123
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
