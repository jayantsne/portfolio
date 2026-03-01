import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {
    // Check if already logged in
    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin-dashboard']);
    }
  }

  async onSubmit() {
    if (!this.username || !this.password) {
      this.error = 'Please enter username and password';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const response = await this.adminService.login(this.username, this.password);
      
      if (response.success) {
        // Navigate to admin dashboard
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.error = response.message || 'Login failed';
      }
    } catch (error: any) {
      this.error = error.message || 'Login failed. Please try again.';
      console.error('Login error:', error);
    } finally {
      this.loading = false;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
