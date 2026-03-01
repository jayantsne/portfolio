import {
  Component, EventEmitter, Output, OnInit, OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CustomAuthService } from '../shared/custom-auth.service';

type Mode = 'login' | 'signup';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrls:  ['./auth-modal.component.css']
})
export class AuthModalComponent implements OnInit, OnDestroy {

  @Output() closed   = new EventEmitter<void>();
  @Output() loggedIn = new EventEmitter<void>();

  isOpen    = false;
  mode: Mode = 'login';
  isLoading  = false;
  errorMsg   = '';
  successMsg = '';
  showPwd    = false;
  showConfPwd = false;

  loginForm!:  FormGroup;
  signupForm!: FormGroup;

  constructor(
    private fb:      FormBuilder,
    private authSvc: CustomAuthService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signupForm = this.fb.group({
      username:        [''],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  ngOnDestroy(): void {}

  // ─── Open / close ─────────────────────────────────────────────────────────

  open(mode: Mode = 'login'): void {
    this.mode       = mode;
    this.isOpen     = true;
    this.errorMsg   = '';
    this.successMsg = '';
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
    this.loginForm.reset();
    this.signupForm.reset();
    this.errorMsg   = '';
    this.successMsg = '';
    this.closed.emit();
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('auth-overlay')) this.close();
  }

  setMode(m: Mode): void {
    this.mode     = m;
    this.errorMsg = '';
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  login(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    const { email, password } = this.loginForm.value;
    this.isLoading = true;
    this.errorMsg  = '';

    this.authSvc.login(email, password).subscribe({
      next: () => {
        this.isLoading  = false;
        this.successMsg = 'Welcome back!';
        setTimeout(() => { this.close(); this.loggedIn.emit(); }, 800);
      },
      error: err => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Invalid email or password.';
      }
    });
  }

  // ─── Signup ───────────────────────────────────────────────────────────────

  signup(): void {
    if (this.signupForm.invalid) { this.signupForm.markAllAsTouched(); return; }
    const { email, password, username } = this.signupForm.value;
    this.isLoading = true;
    this.errorMsg  = '';

    this.authSvc.signup(email, password, username || undefined).subscribe({
      next: () => {
        this.isLoading  = false;
        this.successMsg = 'Account created! Welcome 🎉';
        setTimeout(() => { this.close(); this.loggedIn.emit(); }, 900);
      },
      error: err => {
        this.isLoading = false;
        this.errorMsg  = err?.error?.message ?? 'Could not create account. Try again.';
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private passwordsMatch(group: AbstractControl) {
    const p  = group.get('password')?.value;
    const cp = group.get('confirmPassword')?.value;
    return p === cp ? null : { mismatch: true };
  }

  f(form: 'login' | 'signup', field: string): AbstractControl | null {
    return form === 'login'
      ? this.loginForm.get(field)
      : this.signupForm.get(field);
  }
}
