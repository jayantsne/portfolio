import { Injectable }  from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Observable }  from 'rxjs';
import { CustomAuthService } from './custom-auth.service';

// ── DTOs ──────────────────────────────────────────────────────────────────
export interface UserSummary {
  userId:          string;
  username:        string;
  email:           string;
  role:            'ADMIN' | 'USER';
  isAuthenticated: boolean;
  lastLogin:       string | null;
  isAdmin:         boolean;
}

export interface UserListResponse {
  total: number;
  users: UserSummary[];
}

export interface AssignRoleRequest {
  targetUserId: string;
  role:         'ADMIN' | 'USER';
}

// ── Service ────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UserManagementService {

  private readonly base = '/api/auth';

  constructor(
    private http:    HttpClient,
    private authSvc: CustomAuthService
  ) {}

  /**
   * Returns a paginated list of all registered users.
   * Requires ADMIN role — the backend enforces this via [Authorize(Roles="ADMIN")].
   */
  getUsers(skip = 0, limit = 100): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(
      `${this.base}/admin/users?skip=${skip}&limit=${limit}`,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }

  /**
   * Assigns a new role (ADMIN | USER) to the specified user.
   * Requires ADMIN role on the caller.
   * Note: self-demotion is blocked by the backend.
   */
  assignRole(targetUserId: string, role: 'ADMIN' | 'USER'): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.base}/assign-role`,
      { targetUserId, role } as AssignRoleRequest,
      { headers: this.authSvc.getAuthHeaders() }
    );
  }
}
