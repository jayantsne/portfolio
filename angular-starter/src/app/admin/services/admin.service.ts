import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    username: string;
    email: string;
    role: string;
    lastLogin?: string;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  type: string;
  endpoint: string;
  model: string;
  apiKeys: string[];
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    lastUsed?: string;
    successRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;
  private user: AdminLoginResponse['user'] | null = null;

  constructor(private http: HttpClient) {}

  async login(username: string, password: string): Promise<AdminLoginResponse> {
    const response = await this.http.post<AdminLoginResponse>(
      `${this.apiUrl}/login`,
      { username, password },
      { withCredentials: true }
    ).toPromise();

    if (response.success && response.user) {
      this.user = response.user;
    }

    return response;
  }

  logout(): void {
    this.user = null;
  }

  isLoggedIn(): boolean {
    return !!this.user;
  }

  getToken(): string | null {
    return null;
  }

  getUser(): any {
    return this.user;
  }

  async getProviders(): Promise<AIProvider[]> {
    return await this.http.get<AIProvider[]>(`${this.apiUrl}/providers`, { withCredentials: true }).toPromise() as AIProvider[];
  }

  async updateProvider(id: string, updates: any): Promise<any> {
    return await this.http.put(`${this.apiUrl}/providers/${id}`, updates, { withCredentials: true }).toPromise();
  }

  async addApiKey(providerId: string, apiKey: string): Promise<any> {
    return await this.http.post(`${this.apiUrl}/providers/add-key`, {
      providerId,
      apiKey
    }, { withCredentials: true }).toPromise();
  }

  async removeApiKey(providerId: string, apiKey: string): Promise<any> {
    return await this.http.request('DELETE', `${this.apiUrl}/providers/remove-key`, {
      withCredentials: true,
      body: { providerId, apiKey }
    }).toPromise();
  }
}
