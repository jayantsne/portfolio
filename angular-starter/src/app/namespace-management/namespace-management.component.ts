import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-namespace-management',
  templateUrl: './namespace-management.component.html',
  styleUrls: ['./namespace-management.component.css']
})
export class NamespaceManagementComponent implements OnInit {
  newNamespace: any = {
    name: '',
    description: ''
  };
  
  existingNamespaces: any[] = [
    { id: 'AUTH_KV', name: 'AUTH_KV', description: 'User authentication data', created: new Date('2026-01-01') },
    { id: 'QUESTIONS_KV', name: 'QUESTIONS_KV', description: 'Interview questions database', created: new Date('2026-01-01') },
    { id: 'PROGRESS_KV', name: 'PROGRESS_KV', description: 'User progress tracking', created: new Date('2026-01-01') },
    { id: 'CHAT_KV', name: 'CHAT_KV', description: 'AI chat conversations', created: new Date('2026-01-01') }
  ];
  
  namespaceValidation: any = {
    isValid: false,
    hasError: false,
    errorMessage: '',
    checks: {
      hasUppercase: false,
      hasUnderscore: false,
      endsWithKV: false,
      noSpecialChars: false,
      notDuplicate: false
    }
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  validateNamespace(): void {
    const name = this.newNamespace.name.trim();
    
    // Reset validation
    this.namespaceValidation = {
      isValid: false,
      hasError: false,
      errorMessage: '',
      checks: {
        hasUppercase: false,
        hasUnderscore: false,
        endsWithKV: false,
        noSpecialChars: false,
        notDuplicate: false
      }
    };

    if (!name) {
      return;
    }

    // Check uppercase
    this.namespaceValidation.checks.hasUppercase = name === name.toUpperCase() && /[A-Z]/.test(name);
    
    // Check underscore
    this.namespaceValidation.checks.hasUnderscore = name.includes('_');
    
    // Check ends with KV
    this.namespaceValidation.checks.endsWithKV = name.endsWith('_KV');
    
    // Check no special chars (only letters, numbers, underscore)
    this.namespaceValidation.checks.noSpecialChars = /^[A-Z0-9_]+$/.test(name);
    
    // Check not duplicate
    this.namespaceValidation.checks.notDuplicate = !this.existingNamespaces.some(ns => ns.name === name);

    // Overall validation
    this.namespaceValidation.isValid = 
      this.namespaceValidation.checks.hasUppercase &&
      this.namespaceValidation.checks.hasUnderscore &&
      this.namespaceValidation.checks.endsWithKV &&
      this.namespaceValidation.checks.noSpecialChars &&
      this.namespaceValidation.checks.notDuplicate;

    if (!this.namespaceValidation.isValid) {
      if (!this.namespaceValidation.checks.notDuplicate) {
        this.namespaceValidation.errorMessage = 'Namespace already exists';
      } else if (!this.namespaceValidation.checks.endsWithKV) {
        this.namespaceValidation.errorMessage = 'Must end with _KV';
      } else if (!this.namespaceValidation.checks.hasUppercase) {
        this.namespaceValidation.errorMessage = 'Must be all uppercase';
      } else {
        this.namespaceValidation.errorMessage = 'Invalid namespace format';
      }
      this.namespaceValidation.hasError = true;
    }
  }

  createNamespace(): void {
    if (!this.namespaceValidation.isValid) {
      alert('Please fix validation errors before creating namespace');
      return;
    }

    const newNs = {
      id: this.newNamespace.name,
      name: this.newNamespace.name,
      description: this.newNamespace.description || 'No description provided',
      created: new Date()
    };

    this.existingNamespaces.push(newNs);
    
    alert(`✅ Namespace "${newNs.name}" created successfully!\n\nIn production, run: npx wrangler kv:namespace create "${newNs.name}"`);
    
    // Reset form
    this.newNamespace = { name: '', description: '' };
    this.validateNamespace();
  }

  deleteNamespace(namespace: any): void {
    if (confirm(`Are you sure you want to delete namespace "${namespace.name}"? This action cannot be undone.`)) {
      this.existingNamespaces = this.existingNamespaces.filter(ns => ns.id !== namespace.id);
      alert(`🗑️ Namespace "${namespace.name}" deleted.`);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
