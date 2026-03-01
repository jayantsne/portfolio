import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  private apiUrl = 'http://76.13.244.113:5000/api/admin';
  private tokenKey = 'admin_token';
  private userKey = 'admin_user';

  constructor(private http: HttpClient) {}

  async login(username: string, password: string): Promise<AdminLoginResponse> {
    const response = await this.http.post<AdminLoginResponse>(`${this.apiUrl}/login`, {
      username,
      password
    }).toPromise();

    if (response.success && response.token) {
      localStorage.setItem(this.tokenKey, response.token);
      if (response.user) {
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
      }
    }

    return response;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): any {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  async getProviders(): Promise<AIProvider[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    return await this.http.get<AIProvider[]>(`${this.apiUrl}/providers`, { headers }).toPromise() as AIProvider[];
  }

  async updateProvider(id: string, updates: any): Promise<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    return await this.http.put(`${this.apiUrl}/providers/${id}`, updates, { headers }).toPromise();
  }

  async addApiKey(providerId: string, apiKey: string): Promise<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    return await this.http.post(`${this.apiUrl}/providers/add-key`, {
      providerId,
      apiKey
    }, { headers }).toPromise();
  }

  async removeApiKey(providerId: string, apiKey: string): Promise<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json'
    });

    return await this.http.request('DELETE', `${this.apiUrl}/providers/remove-key`, {
      headers,
      body: { providerId, apiKey }
    }).toPromise();
  }
}
