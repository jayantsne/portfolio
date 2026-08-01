import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
@Injectable({ providedIn: 'root' })
export class GlobalLoaderService {
  private active = 0; private state = new BehaviorSubject(false);
  readonly visible$: Observable<boolean> = this.state.pipe(switchMap(show => show ? timer(180).pipe(map(() => true)) : of(false)), distinctUntilChanged());
  begin(): void { this.active++; this.state.next(true); }
  end(): void { this.active = Math.max(0, this.active - 1); if (!this.active) this.state.next(false); }
}
