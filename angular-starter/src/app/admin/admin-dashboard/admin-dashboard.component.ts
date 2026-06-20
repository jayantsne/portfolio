import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, AIProvider } from '../services/admin.service';
import { CustomAuthService } from '../../shared/custom-auth.service';

type AdminTab = 'providers' | 'users';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  providers: AIProvider[] = [];
  loading = true;
  error = '';
  user: any = null;
  selectedProvider: AIProvider | null = null;
  showAddKeyModal = false;
  newApiKey = '';

  activeTab: AdminTab = 'providers';

  constructor(
    private adminService: AdminService,
    private router: Router,
    private customAuth: CustomAuthService
  ) {}

  async ngOnInit() {
    const isAdmin = this.adminService.isLoggedIn() || this.customAuth.isAdmin;

    if (!isAdmin) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.user = this.adminService.isLoggedIn()
      ? this.adminService.getUser()
      : { username: this.customAuth.currentUser?.username ?? 'Admin', role: 'admin' };

    await this.loadProviders();
  }

  async loadProviders() {
    this.loading = true;
    this.error = '';
    
    try {
      this.providers = await this.adminService.getProviders();
    } catch (error: any) {
      this.error = 'Failed to load providers';
      console.error('Load providers error:', error);
    } finally {
      this.loading = false;
    }
  }

  async toggleProvider(provider: AIProvider) {
    try {
      await this.adminService.updateProvider(provider.id, {
        enabled: !provider.enabled
      });
      provider.enabled = !provider.enabled;
    } catch (error) {
      console.error('Toggle provider error:', error);
      alert('Failed to update provider');
    }
  }

  async updatePriority(provider: AIProvider, newPriority: number) {
    try {
      await this.adminService.updateProvider(provider.id, {
        priority: newPriority
      });
      provider.priority = newPriority;
      // Re-sort providers
      this.providers.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Update priority error:', error);
      alert('Failed to update priority');
    }
  }

  openAddKeyModal(provider: AIProvider) {
    this.selectedProvider = provider;
    this.newApiKey = '';
    this.showAddKeyModal = true;
  }

  closeAddKeyModal() {
    this.showAddKeyModal = false;
    this.selectedProvider = null;
    this.newApiKey = '';
  }

  async addApiKey() {
    if (!this.selectedProvider || !this.newApiKey.trim()) {
      return;
    }

    try {
      await this.adminService.addApiKey(this.selectedProvider.id, this.newApiKey.trim());
      await this.loadProviders();
      this.closeAddKeyModal();
    } catch (error) {
      console.error('Add API key error:', error);
      alert('Failed to add API key');
    }
  }

  async removeApiKey(provider: AIProvider, keyPreview: string) {
    if (!confirm(`Remove API key ending with ${keyPreview.slice(-4)}?`)) {
      return;
    }

    try {
      // Extract last 4 chars for identification
      const last4 = keyPreview.slice(-4);
      await this.adminService.removeApiKey(provider.id, last4);
      await this.loadProviders();
    } catch (error) {
      console.error('Remove API key error:', error);
      alert('Failed to remove API key');
    }
  }

  logout() {
    if (this.adminService.isLoggedIn()) {
      this.adminService.logout();
      this.router.navigate(['/admin-login']);
    } else {
      this.customAuth.logout();
      this.router.navigate(['/']);
    }
  }

  goToDeployment(): void {
    this.router.navigate(['/admin-deploy']);
  }

  goToAnalytics(): void {
    this.router.navigate(['/admin-analytics']);
  }

  getProviderIcon(type: string): string {
    return type === 'local' ? '🖥️' : '☁️';
  }

  getStatusColor(enabled: boolean): string {
    return enabled ? '#10b981' : '#ef4444';
  }

  formatDate(date?: string): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }
}
