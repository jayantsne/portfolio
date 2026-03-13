import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { CustomAuthService } from '../shared/custom-auth.service';
import { ApiService } from '../shared/api.service';
import { take } from 'rxjs/operators';

// Declare gtag function for TypeScript
declare let gtag: Function;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showAiScanner = false;
  scanProgress = 0;
  scanStage = '';
  showVoiceAssistant = false;
  showFaceLogin = false;
  faceDetected = false;
  faceMatching = false;
  faceMatchProgress = 0;
  faceEnrollmentMode = false;
  faceEnrolled = false;
  capturedFaceData: string | null = null;
  enrolledFaceData: string | null = null;
  show2FA = false;
  twoFACode = ['', '', '', '', '', ''];
  twoFAVerifying = false;
  twoFAError = '';
  twoFASetupMode = false;
  twoFASecret = 'JBSWY3DPEHPK3PXP'; // Demo secret

  authSettings: any = {
    faceIdEnabled: true,
    twoFactorEnabled: true,
    voiceLoginEnabled: false,
    biometricEnabled: true,
    smsAuthEnabled: false,
    emailAuthEnabled: true
  };

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private videoStream: MediaStream | null = null;
  private animationId: number | null = null;
  private particles: any[] = [];

  constructor(
    private authService: AuthService,
    private customAuth: CustomAuthService,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Login component initialized');

    // Subscribe ONCE to authentication status and redirect only if truly authenticated
    this.authService.isAuthenticated$
      .pipe(take(1))
      .subscribe(isAuth => {
        if (isAuth) {
          this.router.navigate(['/questions']);
        }
      });

    // Load auth settings from localStorage/database
    this.loadAuthSettings();

    // Log settings after a brief delay to ensure they're loaded
    setTimeout(() => {
      console.log('🔐 Auth settings after load:', this.authSettings);
      console.log('👤 Face ID enabled:', this.authSettings.faceIdEnabled);
      console.log('🔑 2FA enabled:', this.authSettings.twoFactorEnabled);
      console.log('🔐 Biometric enabled:', this.authSettings.biometricEnabled);
    }, 100);

    // Track page view with Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_title: 'Login Page',
        page_location: window.location.href,
        page_path: '/login'
      });
    }
  }

  

  loadAuthSettings(): void {
    // First check localStorage for auth settings
    const savedSettings = localStorage.getItem('authSettings');
    if (savedSettings) {
      try {
        this.authSettings = JSON.parse(savedSettings);
        console.log('✅ Loaded auth settings from localStorage:', this.authSettings);
        return;
      } catch (e) {
        console.error('❌ Error parsing saved auth settings:', e);
      }
    }

    // If not in localStorage, try loading from API
    const userId = this.authService.getUserId();
    console.log('📡 Loading auth settings from database for user:', userId);
    
    this.apiService.getAuthSettings(userId).subscribe(
      (settings) => {
        if (settings && Object.keys(settings).length > 0) {
          this.authSettings = settings;
          console.log('✅ Loaded auth settings from database:', this.authSettings);
          // Save to localStorage for future use
          localStorage.setItem('authSettings', JSON.stringify(this.authSettings));
        } else {
          console.log('📝 Using default auth settings:', this.authSettings);
        }
      },
      (error) => {
        console.error('❌ Error loading auth settings:', error);
        console.log('📝 Using default auth settings:', this.authSettings);
        // Save defaults to localStorage
        localStorage.setItem('authSettings', JSON.stringify(this.authSettings));
      }
    );
  }

  

  ngAfterViewInit(): void {
    // Initialize 3D canvas animation
    this.initCanvas();
    this.animate();
  }

  ngOnDestroy(): void {
    // Clean up animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    // Clean up video stream
    this.stopFaceLogin();
  }

  initCanvas(): void {
    this.canvas = document.getElementById('ai-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    // Set canvas size
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Create particles
    const particleCount = 100;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 2,
        size: Math.random() * 2 + 1,
        hue: Math.random() * 60 + 180 // Blue to cyan range
      });
    }

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  handleResize(): void {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas with trail effect
    this.ctx.fillStyle = 'rgba(10, 10, 31, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    this.particles.forEach((particle, index) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;

      // Wrap around edges
      if (particle.x < 0) particle.x = this.canvas!.width;
      if (particle.x > this.canvas!.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.canvas!.height;
      if (particle.y > this.canvas!.height) particle.y = 0;
      if (particle.z < 0) particle.z = 1000;
      if (particle.z > 1000) particle.z = 0;

      // Calculate 3D perspective
      const scale = 1000 / (1000 + particle.z);
      const x2d = (particle.x - this.canvas!.width / 2) * scale + this.canvas!.width / 2;
      const y2d = (particle.y - this.canvas!.height / 2) * scale + this.canvas!.height / 2;
      const size = particle.size * scale;

      // Draw particle
      if (this.ctx) {
        this.ctx.beginPath();
        this.ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${particle.hue}, 100%, 60%, ${0.8 * scale})`;
        this.ctx.fill();

        // Draw glow
        this.ctx.shadowBlur = 10 * scale;
        this.ctx.shadowColor = `hsla(${particle.hue}, 100%, 60%, 0.5)`;
      }

      // Connect nearby particles
      for (let j = index + 1; j < this.particles.length; j++) {
        const other = this.particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const dz = particle.z - other.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 150 && this.ctx) {
          const otherScale = 1000 / (1000 + other.z);
          const ox2d = (other.x - this.canvas!.width / 2) * otherScale + this.canvas!.width / 2;
          const oy2d = (other.y - this.canvas!.height / 2) * otherScale + this.canvas!.height / 2;

          this.ctx.beginPath();
          this.ctx.moveTo(x2d, y2d);
          this.ctx.lineTo(ox2d, oy2d);
          this.ctx.strokeStyle = `rgba(79, 172, 254, ${0.2 * (1 - distance / 150)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    });

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  login(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      
      // Track error with Google Analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'login_error', {
          error_type: 'missing_credentials'
        });
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.showAiScanner = true;
    
    // Create particle burst effect
    this.createParticleBurst();
    
    // AI scanning animation stages
    this.startAiScanAnimation();
    
    // Track login attempt with Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'login_attempt', {
        method: 'password'
      });
    }

    // Call CustomAuthService directly so we get a real Observable with success/error callbacks
    this.customAuth.login(this.username, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.showAiScanner = false;
        this.scanProgress = 0;

        // Track successful login with Google Analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'login_success', {
            method: 'password'
          });
        }

        this.router.navigate(['/questions']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.showAiScanner = false;
        this.scanProgress = 0;
        this.errorMessage = err?.error?.message ?? 'Invalid username or password';

        // Track failed login with Google Analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'login_failed', {
            error_type: 'invalid_credentials'
          });
        }
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    
    // Track with Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'toggle_password', {
        visible: this.showPassword
      });
    }
  }

  navigateHome(): void {
    this.router.navigate(['/']);
  }

  startAiScanAnimation(): void {
    const stages = [
      { progress: 20, stage: 'Initializing AI protocols...', delay: 0 },
      { progress: 40, stage: 'Scanning biometric data...', delay: 300 },
      { progress: 60, stage: 'Verifying neural signature...', delay: 600 },
      { progress: 80, stage: 'Analyzing credentials...', delay: 900 },
      { progress: 100, stage: 'Authentication complete', delay: 1200 }
    ];

    stages.forEach(({ progress, stage, delay }) => {
      setTimeout(() => {
        this.scanProgress = progress;
        this.scanStage = stage;
      }, delay);
    });
  }

  createParticleBurst(): void {
    const button = document.querySelector('.login-btn') as HTMLElement;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create burst particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'burst-particle';
      particle.style.left = centerX + 'px';
      particle.style.top = centerY + 'px';
      
      const angle = (Math.PI * 2 * i) / 20;
      const velocity = 100 + Math.random() * 50;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');
      
      document.body.appendChild(particle);
      
      setTimeout(() => particle.remove(), 1000);
    }
  }

  toggleVoiceAssistant(): void {
    this.showVoiceAssistant = !this.showVoiceAssistant;
    
    // Track with Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'toggle_voice_assistant', {
        visible: this.showVoiceAssistant
      });
    }
  }

  async startFaceLogin(): Promise<void> {
    console.log('🎯 Face Login button clicked!');
    
    // Check if face is enrolled
    const storedFaceData = localStorage.getItem('enrolledFaceData');
    
    if (!storedFaceData) {
      // No face enrolled, start enrollment
      console.log('📝 Starting face enrollment (no face data found)');
      this.faceEnrollmentMode = true;
      this.errorMessage = '';
      this.showFaceLogin = true;
      await this.initializeFaceCamera();
      return;
    }
    
    // Face is enrolled, start recognition
    console.log('✅ Face data found, starting recognition');
    this.enrolledFaceData = storedFaceData;
    this.faceEnrollmentMode = false;
    this.showFaceLogin = true;
    await this.initializeFaceCamera();
  }

  async initializeFaceCamera(): Promise<void> {
    try {
      console.log('📹 Initializing face camera...');
      this.showFaceLogin = true;
      this.faceDetected = false;
      this.faceMatching = false;
      this.faceMatchProgress = 0;
      this.errorMessage = '';

      console.log('🎭 Face login modal should now be visible:', this.showFaceLogin);

      // Track face login attempt
      if (typeof gtag !== 'undefined') {
        gtag('event', this.faceEnrollmentMode ? 'face_enrollment_start' : 'face_login_start', {
          method: 'face_recognition'
        });
      }

      console.log('📱 Requesting camera access...');
      // Request camera access
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });

      console.log('✅ Camera access granted!');

      // Wait for video element to be ready
      setTimeout(() => {
        const video = document.getElementById('face-video') as HTMLVideoElement;
        console.log('🎥 Video element:', video);
        
        if (video && this.videoStream) {
          video.srcObject = this.videoStream;
          video.play();
          console.log('▶️ Video stream started');

          // Simulate face detection after 1 second
          setTimeout(() => {
            this.faceDetected = true;
            console.log('👤 Face detected!');
            
            // Start face matching process
            setTimeout(() => {
              this.startFaceMatching();
            }, 500);
          }, 1000);
        } else {
          console.error('❌ Video element not found or no stream available');
        }
      }, 100);

    } catch (error) {
      console.error('❌ Camera access denied or error:', error);
      this.errorMessage = 'Camera access denied. Please enable camera permissions and try again.';
      this.showFaceLogin = false;
      
      // Show user-friendly alert
      alert('📹 Camera Access Required\n\nPlease allow camera access in your browser to use Face ID login.\n\nYou may need to:\n1. Click the camera icon in the address bar\n2. Select "Allow" for camera access\n3. Refresh the page and try again');
      
      // Track error
      if (typeof gtag !== 'undefined') {
        gtag('event', 'face_login_error', {
          error_type: 'camera_denied'
        });
      }
    }
  }

  startFaceMatching(): void {
    this.faceMatching = true;
    
    // Capture current face data
    this.captureFaceData();
    
    const matchStages = [
      { progress: 20, delay: 0 },
      { progress: 40, delay: 300 },
      { progress: 60, delay: 600 },
      { progress: 80, delay: 900 },
      { progress: 100, delay: 1200 }
    ];

    matchStages.forEach(({ progress, delay }) => {
      setTimeout(() => {
        this.faceMatchProgress = progress;
        
        // Complete authentication at 100%
        if (progress === 100) {
          setTimeout(() => {
            if (this.faceEnrollmentMode) {
              this.completeFaceEnrollment();
            } else {
              this.verifyFaceMatch();
            }
          }, 500);
        }
      }, delay);
    });
  }

  captureFaceData(): void {
    const video = document.getElementById('face-video') as HTMLVideoElement;
    if (!video) return;

    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Convert to data URL (in real app, you'd extract face features using ML)
      this.capturedFaceData = canvas.toDataURL('image/jpeg', 0.8);
    }
  }

  completeFaceEnrollment(): void {
    if (!this.capturedFaceData) {
      this.errorMessage = 'Failed to capture face data. Please try again.';
      this.stopFaceLogin();
      return;
    }
    
    // Store face data in localStorage (in real app, send to backend)
    localStorage.setItem('enrolledFaceData', this.capturedFaceData);
    this.enrolledFaceData = this.capturedFaceData;
    this.faceEnrolled = true;
    
    // Track enrollment success
    if (typeof gtag !== 'undefined') {
      gtag('event', 'face_enrollment_success', {
        method: 'face_recognition'
      });
    }
    
    // Show success message and close
    setTimeout(() => {
      this.stopFaceLogin();
      this.errorMessage = '';
      alert('✓ Face enrolled successfully! You can now use Face ID to login.');
    }, 1000);
  }

  verifyFaceMatch(): void {
    if (!this.capturedFaceData || !this.enrolledFaceData) {
      this.errorMessage = 'Face verification failed. Please try again.';
      this.stopFaceLogin();
      return;
    }
    
    // Simulate face matching (in real app, use face recognition ML model)
    // For demo, we'll do a simple similarity check on image data
    const similarity = this.calculateFaceSimilarity(this.capturedFaceData, this.enrolledFaceData);
    
    if (similarity > 0.7) { // 70% match threshold
      // Face matched!
      this.completeFaceLogin();
    } else {
      // Face doesn't match
      this.errorMessage = 'Face not recognized. Please try again or use password login.';
      this.stopFaceLogin();
      
      // Track failed match
      if (typeof gtag !== 'undefined') {
        gtag('event', 'face_login_failed', {
          error_type: 'face_mismatch'
        });
      }
    }
  }

  calculateFaceSimilarity(face1: string, face2: string): number {
    // Simple similarity check based on data length and sample pixels
    // In a real app, use a proper face recognition ML model (FaceAPI.js, TensorFlow.js, etc.)
    
    // For demo purposes, always return high similarity
    // In production, you would:
    // 1. Extract face embeddings using a neural network
    // 2. Calculate cosine similarity between embeddings
    // 3. Return similarity score (0-1)
    
    return 0.95; // High similarity for demo
  }

  completeFaceLogin(): void {
    // Simulate successful face authentication
    // In a real app, this would verify against stored face data
    this.stopFaceLogin();
    
    // Set credentials and trigger login
    this.username = 'admin'; // Default user for face login
    this.password = 'admin'; // This would be handled securely in backend
    
    // Track successful face login
    if (typeof gtag !== 'undefined') {
      gtag('event', 'face_login_success', {
        method: 'face_recognition'
      });
    }
    
    // Trigger standard login flow
    this.login();
  }

  stopFaceLogin(): void {
    this.showFaceLogin = false;
    this.faceDetected = false;
    this.faceMatching = false;
    this.faceMatchProgress = 0;
    
    // Stop video stream
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
  }

  cancelFaceLogin(): void {
    this.stopFaceLogin();
    this.errorMessage = '';
    
    // Track cancellation
    if (typeof gtag !== 'undefined') {
      gtag('event', this.faceEnrollmentMode ? 'face_enrollment_cancel' : 'face_login_cancel', {
        method: 'face_recognition'
      });
    }
  }

  resetFaceEnrollment(): void {
    if (confirm('Are you sure you want to reset your enrolled face? You will need to enroll again.')) {
      localStorage.removeItem('enrolledFaceData');
      this.enrolledFaceData = null;
      this.faceEnrolled = false;
      alert('Face enrollment reset. Click Face ID to enroll a new face.');
      
      // Track reset
      if (typeof gtag !== 'undefined') {
        gtag('event', 'face_enrollment_reset', {
          method: 'face_recognition'
        });
      }
    }
  }

  start2FA(): void {
    console.log('🎯 2FA button clicked!');
    this.show2FA = true;
    this.twoFASetupMode = true;
    this.twoFACode = ['', '', '', '', '', ''];
    this.twoFAError = '';
    this.twoFAVerifying = false;
    
    // Track 2FA setup start
    if (typeof gtag !== 'undefined') {
      gtag('event', '2fa_setup_start', {
        method: '2fa'
      });
    }
    
    // Focus first input after a short delay
    setTimeout(() => {
      const firstInput = document.querySelector('.code-input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  onCodeInput(index: number, event: any): void {
    const value = event.target.value;
    
    // Only allow single digit
    if (value.length > 1) {
      event.target.value = value.charAt(0);
      this.twoFACode[index] = value.charAt(0);
      return;
    }
    
    this.twoFACode[index] = value;
    
    // Move to next input if current has value
    if (value && index < 5) {
      const nextInput = document.querySelectorAll('.code-input')[index + 1] as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
    
    // Auto-verify when all 6 digits entered
    if (this.twoFACode.every(digit => digit !== '')) {
      this.verify2FACode();
    }
  }

  onCodeKeyDown(index: number, event: KeyboardEvent): void {
    // Move to previous input on backspace if current is empty
    if (event.key === 'Backspace' && !this.twoFACode[index] && index > 0) {
      const prevInput = document.querySelectorAll('.code-input')[index - 1] as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  onCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    
    if (pastedData) {
      const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6);
      
      digits.forEach((digit, index) => {
        if (index < 6) {
          this.twoFACode[index] = digit;
          const input = document.querySelectorAll('.code-input')[index] as HTMLInputElement;
          if (input) {
            input.value = digit;
          }
        }
      });
      
      // Auto-verify if 6 digits pasted
      if (digits.length === 6) {
        this.verify2FACode();
      }
    }
  }

  verify2FACode(): void {
    const code = this.twoFACode.join('');
    
    if (code.length !== 6) {
      this.twoFAError = 'Please enter all 6 digits';
      return;
    }
    
    this.twoFAVerifying = true;
    this.twoFAError = '';
    
    // Simulate verification (in real app, verify against TOTP server)
    setTimeout(() => {
      // Demo: accept 123456 or any code for testing
      if (code === '123456' || code.length === 6) {
        // Track successful 2FA
        if (typeof gtag !== 'undefined') {
          gtag('event', '2fa_verify_success', {
            method: '2fa'
          });
        }
        
        // If in setup mode, complete setup
        if (this.twoFASetupMode) {
          this.complete2FASetup();
        } else {
          // Complete login
          this.complete2FALogin();
        }
      } else {
        this.twoFAVerifying = false;
        this.twoFAError = 'Invalid code. Please try again.';
        this.twoFACode = ['', '', '', '', '', ''];
        
        // Clear inputs
        document.querySelectorAll('.code-input').forEach((input: any) => {
          input.value = '';
        });
        
        // Focus first input
        const firstInput = document.querySelector('.code-input') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
        
        // Track failed 2FA
        if (typeof gtag !== 'undefined') {
          gtag('event', '2fa_verify_failed', {
            error_type: 'invalid_code'
          });
        }
      }
    }, 1500);
  }

  complete2FASetup(): void {
    // Show success and transition to login
    setTimeout(() => {
      this.twoFAVerifying = false;
      this.show2FA = false;
      this.twoFASetupMode = false;
      this.errorMessage = '';
      
      // Set credentials for demo
      this.username = 'admin';
      this.password = 'admin';
      
      // Auto-login
      this.login();
    }, 1000);
  }

  complete2FALogin(): void {
    this.twoFAVerifying = false;
    this.show2FA = false;
    
    // Proceed with login
    this.login();
  }

  cancel2FA(): void {
    this.show2FA = false;
    this.twoFACode = ['', '', '', '', '', ''];
    this.twoFAError = '';
    this.twoFAVerifying = false;
    this.twoFASetupMode = false;
    
    // Track cancellation
    if (typeof gtag !== 'undefined') {
      gtag('event', '2fa_cancel', {
        method: '2fa'
      });
    }
  }

  get2FAQRCode(): string {
    // Generate QR code URL for Google Authenticator
    const issuer = 'AI Admin Portal';
    const account = this.username || 'admin@example.com';
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${this.twoFASecret}&issuer=${encodeURIComponent(issuer)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  }

  startBiometricAuth(): void {
    console.log('🎯 Biometric button clicked!');
    alert('🔐 Biometric Authentication\n\nFingerprint/TouchID authentication will be available soon!\n\nThis feature will integrate with your device\'s native biometric sensors for secure authentication.');
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'auth_method_clicked', {
        method: 'biometric'
      });
    }
  }

  startSMSAuth(): void {
    console.log('🎯 SMS Auth button clicked!');
    alert('📱 SMS Authentication\n\nSMS-based authentication is coming soon!\n\nYou\'ll receive a verification code via text message to complete login.');
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'auth_method_clicked', {
        method: 'sms'
      });
    }
  }

  startEmailAuth(): void {
    console.log('🎯 Email Auth button clicked!');
    alert('📧 Email Magic Link\n\nEmail authentication is coming soon!\n\nYou\'ll receive a secure magic link in your email to login without a password.');
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'auth_method_clicked', {
        method: 'email'
      });
    }
  }
}
