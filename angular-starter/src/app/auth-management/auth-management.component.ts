import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-auth-management',
  templateUrl: './auth-management.component.html',
  styleUrls: ['./auth-management.component.css']
})
export class AuthManagementComponent implements OnInit {
  authSettings: any = {
    faceIdEnabled: true,
    twoFactorEnabled: true,
    voiceLoginEnabled: false,
    biometricEnabled: true,
    smsAuthEnabled: false,
    emailAuthEnabled: true
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
    this.loadAuthSettings();
  }

  loadAuthSettings(): void {
    const savedSettings = localStorage.getItem('authSettings');
    if (savedSettings) {
      this.authSettings = JSON.parse(savedSettings);
    }
  }

  saveAuthSettings(): void {
    localStorage.setItem('authSettings', JSON.stringify(this.authSettings));
    alert('✅ Authentication settings saved successfully!');
  }

  toggleAuthFeature(feature: string): void {
    this.authSettings[feature] = !this.authSettings[feature];
    this.saveAuthSettings();
  }

  resetAuthSettings(): void {
    if (confirm('Are you sure you want to reset all authentication settings to defaults?')) {
      this.authSettings = {
        faceIdEnabled: true,
        twoFactorEnabled: true,
        voiceLoginEnabled: false,
        biometricEnabled: true,
        smsAuthEnabled: false,
        emailAuthEnabled: true
      };
      this.saveAuthSettings();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
