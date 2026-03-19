import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lightweight bus that lets any component request the auth modal to open
 * without depending on the Router or navigating to the same URL.
 *
 * Usage — sender:
 *   this.authTrigger.requestLogin();
 *
 * Usage — subscriber (HeaderComponent):
 *   this.authTrigger.login$.subscribe(() => this.authModal?.open('login'));
 */
@Injectable({ providedIn: 'root' })
export class AuthTriggerService implements OnDestroy {
  private _login$ = new Subject<void>();

  /** Observable that emits whenever a component wants the login modal opened. */
  readonly login$ = this._login$.asObservable();

  /** Call this to open the login modal from anywhere in the app. */
  requestLogin(): void {
    this._login$.next();
  }

  ngOnDestroy(): void {
    this._login$.complete();
  }
}
