import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
@Injectable({ providedIn: 'root' })
export class GlobalLoaderService {
  private active = 0; private state = new BehaviorSubject(false);
  readonly visible$: Observable<boolean> = this.state.pipe(distinctUntilChanged());
  begin(): void { this.active++; this.state.next(true); }
  end(): void { this.active = Math.max(0, this.active - 1); if (!this.active) this.state.next(false); }
}
