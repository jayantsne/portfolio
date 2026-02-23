import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

  const firebaseConfig = {
    apiKey: "AIzaSyCk0xzuG1GSDbNd2eeVVURe2LWdes1XPE8",
  authDomain: "myportfolioadmin.firebaseapp.com",
  projectId: "myportfolioadmin",
  storageBucket: "myportfolioadmin.firebasestorage.app",
  messagingSenderId: "840113821693",
  appId: "1:840113821693:web:c478026d3066423bba6b94",
  measurementId: "G-X94MS8XML4"
  };
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);