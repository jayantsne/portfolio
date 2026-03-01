import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { environment } from '../../environments/environment';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private app: FirebaseApp;
  private auth: Auth;

  private _user = new BehaviorSubject<AppUser | null>(null);
  /** Emits the current signed-in user, or null when signed out. */
  user$: Observable<AppUser | null> = this._user.asObservable();

  /** Emits true once Firebase has resolved the initial auth state (1 fire only). */
  private _authReady = new BehaviorSubject<boolean>(false);
  authReady$: Observable<boolean> = this._authReady.asObservable();

  constructor(private zone: NgZone) {
    // Initialise Firebase once (guards against hot-reload double-init)
    this.app = getApps().length
      ? getApps()[0]
      : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);

    if (!this.isConfigured) {
      // Credentials are placeholders — skip the Firebase auth check entirely
      // so the sign-in button shows immediately instead of spinning forever.
      this._authReady.next(true);
      return;
    }

    onAuthStateChanged(this.auth, (fbUser: FirebaseUser | null) => {
      this.zone.run(() => {
        this._user.next(fbUser ? this.toAppUser(fbUser) : null);
        // Signal that Firebase has checked the cached session
        if (!this._authReady.getValue()) this._authReady.next(true);
      });
    }, () => {
      // Auth error (e.g. network failure) — still unblock the UI
      this.zone.run(() => {
        if (!this._authReady.getValue()) this._authReady.next(true);
      });
    });
  }

  /** Returns false when Firebase credentials are still placeholder values */
  get isConfigured(): boolean {
    const cfg = environment.firebase;
    return (
      !!cfg.apiKey &&
      !cfg.apiKey.startsWith('YOUR_') &&
      !!cfg.appId &&
      !cfg.appId.startsWith('YOUR_')
    );
  }

  get currentUser(): AppUser | null {
    return this._user.getValue();
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.isConfigured) {
      throw new Error(
        'Firebase is not configured. Please add your Firebase credentials to environment.ts.\n' +
        'Steps:\n' +
        '1. Go to https://console.firebase.google.com\n' +
        '2. Select project "myportfolioadmin-d45bd"\n' +
        '3. Project Settings → Your apps → Web app → Config\n' +
        '4. Copy apiKey, messagingSenderId, and appId into environment.ts'
      );
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(this.auth, provider);
  }

  async signOutUser(): Promise<void> {
    await signOut(this.auth);
  }

  private toAppUser(fb: FirebaseUser): AppUser {
    return {
      uid: fb.uid,
      displayName: fb.displayName,
      email: fb.email,
      photoURL: fb.photoURL
    };
  }
}
