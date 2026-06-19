import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { RatedAnswer, AnswerRating } from '../models/rated-answer.model';
import { environment } from '../../environments/environment';
import { AI_BACKEND } from '../config/ai.config';
import { AppConfigService } from '../shared/app-config.service';
import { CustomAuthService } from '../shared/custom-auth.service';
import { LlmProviderService } from '../shared/llm-provider.service';

// Free AI Service with MULTI-PROVIDER FALLBACK
// 🔥 STRATEGY: If one provider fails/limits, automatically try next!
// PROVIDERS: Gemini → Groq → HuggingFace → Together.ai
// 1. API Key Rotation - Multiple keys per provider
// 2. Response Caching - Store answers to avoid duplicate API calls
// 3. Rate Limiting - Prevent hitting limits too fast
// 4. AUTO-FALLBACK - Switch providers on failure

@Injectable({
  providedIn: 'root'
})
export class AILearnService {
  // 🚀 PRIMARY: GOOGLE GEMINI (Best quality, fastest)
  // Get free keys: https://aistudio.google.com/app/apikey
  // Free tier: 60 req/min, 1,500 req/day, 1M tokens/month per key
  // 🎯 TARGET: 20 keys = 30,000 requests/day!
  private readonly GEMINI_API_KEYS: string[] = [];
  
  // 🔄 PRIMARY: GROQ (Super fast, free tier, BEST CHOICE!) 🚀
  // Get free keys: https://console.groq.com/keys
  // Free tier: 30 req/min, 14,400 req/day, UNLIMITED tokens per key
  // 🎯 Add your keys in environment.ts or environment.prod.ts
  private readonly GROQ_API_KEYS = environment.groqApiKeys.filter(key => !key.startsWith('YOUR_'));
  
  // 🔄 FALLBACK 2: HUGGINGFACE (Good for open models)
  // Get free keys: https://huggingface.co/settings/tokens
  // Free tier: Very generous limits, free models
  // 🎯 TARGET: 15 keys = Strong backup capacity (50,000+ req/day!)
  private readonly HF_API_KEYS: string[] = [];
  
  // 🔄 FALLBACK 3: TOGETHER.AI (Premium quality models)
  // Get free keys: https://api.together.xyz/settings/api-keys
  // Free tier: $25 credit for new users (lasts months!)
  // 🎯 TARGET: 10 keys = Premium backup
  private readonly TOGETHER_API_KEYS: string[] = [];
  
  // 🌟 NEW: OPENROUTER (100+ AI models with one API key!)
  // Get free key: https://openrouter.ai/keys
  // Free tier: Access to free models like Llama, Mistral, etc.
  // Free tier: 10 req/min on free models, unlimited on paid models
  // 🎯 TARGET: 5 keys = Massive model selection!
  private readonly OPENROUTER_API_KEYS: string[] = [];

  // 🏠 SERVER OLLAMA: Proxied through ASP.NET API (SECURE & UNLIMITED!)
  // 🎯 Server: 76.13.244.113 (learnwithai.tech)
  // 🎯 Ollama accessed via ASP.NET API at /api/ai/ollama
  // 🎯 UNLIMITED requests - Backend handles Ollama internally
  // ⚠️ NOT exposed directly to browser - security best practice!
  // ── Loaded from ai.config.ts ─────────────────────────────────────────
  private get OLLAMA_ENABLED()         { return this.appCfg.cfg.ollamaEnabled; }
  private readonly OLLAMA_VIA_BACKEND  = true;
  private get OLLAMA_MODELS()          { return this.appCfg.cfg.modelOllamaFallbacks; }
  private currentOllamaModelIndex = 0;
  private readonly USE_BACKEND_PROXY   = true;
  private readonly ASPNET_API_BASE_URL = AI_BACKEND.BASE_URL;
  
  // 💡 Cloudflare Workers (Backup for API)
  // Create new free Cloudflare account → Deploy same worker → Add URL below
  private readonly BACKEND_WORKERS = [
    'https://jayant-portfolio-api.jayant-ai.workers.dev/api/ai',  // Worker 1 - Primary (100K/day)
    // 'https://jayant-portfolio-api-2.YOUR-ACCOUNT-2.workers.dev/api/ai',  // Worker 2 - Add account 2 (100K/day)
    // 'https://jayant-portfolio-api-3.YOUR-ACCOUNT-3.workers.dev/api/ai',  // Worker 3 - Add account 3 (100K/day)
    // 'https://jayant-portfolio-api-4.YOUR-ACCOUNT-4.workers.dev/api/ai',  // Worker 4 - Add account 4 (100K/day)
    // 'https://jayant-portfolio-api-5.YOUR-ACCOUNT-5.workers.dev/api/ai',  // Worker 5 - Add account 5 (100K/day)
  ];
  
  private currentWorkerIndex = 0; // Round-robin index for load balancing
  private workerRequestCounts: number[] = new Array(this.BACKEND_WORKERS.length).fill(0); // Track usage per worker
  private readonly MAX_REQUESTS_PER_WORKER_DAY = 95000; // Stay under 100K limit (5K buffer)
  
  // Get current backend URL with automatic load balancing
  private get BACKEND_API_URL(): string {
    return this.getNextAvailableWorker();
  }
  
  // 🎯 Start with Groq (fastest & most reliable free tier) → then try backend → then others
  private currentProvider: 'backend' | 'groq' | 'gemini' | 'huggingface' | 'together' | 'openrouter' | 'ollama' = 'backend';
  private providerFailCount = { backend: 0, groq: 0, gemini: 0, huggingface: 0, together: 0, openrouter: 0, ollama: 0 };

  /** Track active streaming XHR so it can be aborted if user asks a new question */
  private activeXhr: XMLHttpRequest | null = null;
  
  private currentKeyIndex = 0;
  private requestCount = 0;
  private lastRequestTime = Date.now();
  private conversationId: string | null = localStorage.getItem('conversationId');
  
  // 🎯 SMART RATE LIMIT HANDLER (AUTO-RECOVERY!)
  // Track usage per key with cooldown periods
  private keyUsageTracker: Map<string, {
    requestCount: number;
    lastRequestTime: number;
    cooldownUntil: number;  // Timestamp when key will be available again
    totalFailures: number;
    isExhausted: boolean;
  }> = new Map();
  
  // Cooldown periods — dynamically loaded from DB via AppConfigService
  private get COOLDOWN_PERIODS() { return this.appCfg.cfg.cooldownMs as Record<string, number>; }
  
  // Rate limits per provider — dynamically loaded from DB via AppConfigService
  private get RATE_LIMITS() { return this.appCfg.cfg.perProviderLimits; }
  
  // 🧠 SMART AI FEATURES
  private questionHistory: Array<{question: string; category: string; timestamp: number}> = [];
  private get MAX_HISTORY() { return this.appCfg.cfg.maxHistory; }
  
  // Provider strengths for smart routing
  private readonly PROVIDER_STRENGTHS = {
    backend: ['all', 'general'],  // Best for everything (has all providers)
    groq: ['speed', 'code', 'technical'],  // Super fast, great for code
    gemini: ['detailed', 'creative', 'explanation'],  // Best for detailed explanations
    huggingface: ['simple', 'quick'],  // Good for simple questions
    together: ['complex', 'reasoning'],  // Good for complex reasoning
    openrouter: ['versatile', 'fallback'],  // Versatile fallback
    ollama: ['reliable', 'unlimited', 'local']  // Local server - always available
  };
  
  // STRATEGY 2: RESPONSE CACHING — edit src/app/config/ai.config.ts → AI_CACHE
  private get CACHE_KEY_PREFIX()     { return this.appCfg.cfg.cacheKeyPrefix; }
  private get CACHE_DURATION_HOURS() { return this.appCfg.cfg.cacheDurationHours; }
  private get CACHE_VERSION()        { return this.appCfg.cfg.cacheVersion; }

  // STRATEGY 3: RATE LIMITING — edit src/app/config/ai.config.ts → AI_RATE_LIMITS
  private get MAX_REQUESTS_PER_MINUTE() { return this.appCfg.cfg.maxRequestsPerMinute; }
  private get REQUEST_DELAY_MS()        { return this.appCfg.cfg.requestDelayMs; }
  
  // DATABASE STORAGE FOR TOP-RATED ANSWERS
  private readonly RATED_ANSWERS_KEY = 'ai_rated_answers';
  private readonly MIN_RATING_FOR_DB = 4; // Only store 4+ star answers
  
  // 📊 API USAGE TRACKING (NEW!)
  private readonly API_STATS_KEY = 'ai_api_stats';
  private apiStats = {
    totalApiCalls: 0,           // Fresh API calls made
    cachedResponses: 0,         // Loaded from cache
    likedAnswers: 0,            // Loaded from liked DB
    apiCallsSavedByCache: 0,    // How many API calls avoided
    lastResetDate: new Date().toDateString(),
    todayApiCalls: 0,           // Reset daily
    estimatedCostSaved: 0       // Rough estimate
  };
  
  constructor(private http: HttpClient, private appCfg: AppConfigService, private authSvc?: CustomAuthService, private llmSvc?: LlmProviderService) {
    this.loadRequestCount();
    this.loadApiStats();
    this.checkDailyReset();
    this.loadWorkerUsage(); // Load multi-worker usage tracking
    this.checkApiKeysConfiguration(); // Validate API keys and show helpful setup message
  }
  
  /**
   * Load API statistics from localStorage
   */
  private loadApiStats(): void {
    try {
      const saved = localStorage.getItem(this.API_STATS_KEY);
      if (saved) {
        this.apiStats = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load API stats:', error);
    }
  }
  
  /**
   * Save API statistics to localStorage
   */
  private saveApiStats(): void {
    try {
      localStorage.setItem(this.API_STATS_KEY, JSON.stringify(this.apiStats));
    } catch (error) {
      console.warn('Failed to save API stats:', error);
    }
  }
  
  /**
   * Check if we need to reset daily counter
   */
  private checkDailyReset(): void {
    const today = new Date().toDateString();
    if (this.apiStats.lastResetDate !== today) {
      console.log('📅 New day! Resetting daily API counter');
      this.apiStats.todayApiCalls = 0;
      this.apiStats.lastResetDate = today;
      this.saveApiStats();
    }
  }
  
  /**
   * Check API keys configuration and show helpful setup message
   */
  private checkApiKeysConfiguration(): void {
    const groqKeys = this.getValidKeys(this.GROQ_API_KEYS);
    const geminiKeys = this.getValidKeys(this.GEMINI_API_KEYS);
    const hfKeys = this.getValidKeys(this.HF_API_KEYS);
    const togetherKeys = this.getValidKeys(this.TOGETHER_API_KEYS);
    const openrouterKeys = this.getValidKeys(this.OPENROUTER_API_KEYS);
    
    const totalConfiguredKeys = groqKeys.length + geminiKeys.length + hfKeys.length + 
                                togetherKeys.length + openrouterKeys.length;
    
    if (totalConfiguredKeys === 0 && !this.OLLAMA_ENABLED) {
      console.warn(`
⚠️ ========================================================
⚠️  NO API KEYS CONFIGURED!
⚠️ ========================================================

Your AI Learning Assistant needs at least 1 API key to work.

🚀 QUICKEST SETUP (5 minutes):

1. Get FREE Groq API key: https://console.groq.com/keys
   - Click "Sign in with Google" (no password!)
   - Click "Create API Key" → Copy it
   
2. Store the key in the backend/admin provider settings.

3. Keep private provider keys out of Angular environment files.

4. Reload app - Done! 🎉

💡 Why Groq?
   ✅ FREE: 14,400 requests/day per key
   ✅ FAST: 500 tokens/second (fastest AI)
   ✅ NO CREDIT CARD: Just Google sign-in

📖 Full guide: See QUICK_API_SETUP.md

Current status:
- Groq: ${groqKeys.length} keys configured
- Gemini: ${geminiKeys.length} keys configured
- HuggingFace: ${hfKeys.length} keys configured
- Together: ${togetherKeys.length} keys configured
- OpenRouter: ${openrouterKeys.length} keys configured
- Ollama: ${this.OLLAMA_ENABLED ? 'Enabled (requires ASP.NET backend)' : 'Disabled'}

⚠️ ========================================================
      `);
    } else if (totalConfiguredKeys === 0 && this.OLLAMA_ENABLED) {
      console.warn(`
⚠️ Only Ollama is enabled (requires ASP.NET backend implementation)

Add a Groq key for instant results: https://console.groq.com/keys
See QUICK_API_SETUP.md for details.
      `);
    } else {
      console.log(`
✅ AI Service Ready!

Configured providers:
- Groq: ${groqKeys.length} key(s) (14,400 req/day each)
- Gemini: ${geminiKeys.length} key(s) (1,500 req/day each)
- HuggingFace: ${hfKeys.length} key(s)
- Together: ${togetherKeys.length} key(s)
- OpenRouter: ${openrouterKeys.length} key(s)
- Ollama: ${this.OLLAMA_ENABLED ? 'Enabled' : 'Disabled'}

Total capacity: ${groqKeys.length * 14400 + geminiKeys.length * 1500}+ requests/day
      `);
    }
  }
  
  /**
   * Track API call made
   */
  private trackApiCall(): void {
    this.apiStats.totalApiCalls++;
    this.apiStats.todayApiCalls++;
    this.saveApiStats();
    console.log(`📊 API Call #${this.apiStats.totalApiCalls} (Today: ${this.apiStats.todayApiCalls})`);
  }
  
  /**
   * Track cached response used (no API call!)
   */
  private trackCachedResponse(): void {
    this.apiStats.cachedResponses++;
    this.apiStats.apiCallsSavedByCache++;
    this.apiStats.estimatedCostSaved += 0.01; // Rough $0.01 per call saved
    this.saveApiStats();
    console.log(`💾 Cache HIT! Total saved: ${this.apiStats.apiCallsSavedByCache} calls ($${this.apiStats.estimatedCostSaved.toFixed(2)})`);
  }
  
  /**
   * Track liked answer loaded from DB (no API call!)
   */
  private trackLikedAnswer(): void {
    this.apiStats.likedAnswers++;
    this.apiStats.apiCallsSavedByCache++;
    this.apiStats.estimatedCostSaved += 0.01;
    this.saveApiStats();
    console.log(`❤️ Liked answer loaded! Total saved: ${this.apiStats.apiCallsSavedByCache} calls`);
  }
  
  /**
   * Get API usage statistics (public method for components)
   */
  getApiStats() {
    return {
      totalApiCalls: this.apiStats.totalApiCalls,
      todayApiCalls: this.apiStats.todayApiCalls,
      cachedResponses: this.apiStats.cachedResponses,
      likedAnswers: this.apiStats.likedAnswers,
      apiCallsSavedByCache: this.apiStats.apiCallsSavedByCache,
      estimatedCostSaved: this.apiStats.estimatedCostSaved,
      lastResetDate: this.apiStats.lastResetDate,
      // Additional helpful metrics
      efficiencyRate: this.apiStats.totalApiCalls > 0 
        ? ((this.apiStats.apiCallsSavedByCache / (this.apiStats.totalApiCalls + this.apiStats.apiCallsSavedByCache)) * 100).toFixed(1) + '%'
        : '0%',
      todayRemaining: Math.max(0, 1500 - this.apiStats.todayApiCalls) // Gemini free tier limit
    };
  }
  
  /**
   * Get API key health status with cooldown info (public method)
   * Shows which keys are available, exhausted, or in cooldown
   */
  getKeyHealthStatus() {
    const status = this.checkAllProvidersCooldown();
    const details = status.map(s => {
      const waitTime = s.nextAvailable > 0 
        ? `Next in ${Math.ceil((s.nextAvailable - Date.now()) / 60000)} min`
        : 'Ready';
      
      return {
        provider: s.provider,
        available: s.available,
        total: s.total,
        status: s.available > 0 ? '✅ Available' : '❌ Exhausted',
        nextAvailable: waitTime,
        healthPercent: Math.round((s.available / s.total) * 100)
      };
    });
    
    const totalAvailable = status.reduce((sum, s) => sum + s.available, 0);
    const totalKeys = status.reduce((sum, s) => sum + s.total, 0);
    
    return {
      summary: {
        totalAvailable,
        totalKeys,
        overallHealth: Math.round((totalAvailable / totalKeys) * 100),
        status: totalAvailable > 0 ? '✅ System Healthy' : '⚠️ All Keys Exhausted'
      },
      providers: details,
      currentProvider: this.currentProvider,
      recommendation: totalAvailable === 0 
        ? '🔑 Add more keys or wait for cooldown to expire (auto-recovery enabled)'
        : totalAvailable < 3
        ? '⚠️ Low key availability - consider adding more keys'
        : '✅ Good key availability - system running smoothly'
    };
  }
  
  // =========================================
  // 🚀 MULTI-WORKER LOAD BALANCING (FREE 300K-500K/day!)
  // =========================================
  
  /**
   * Get next available worker using round-robin with usage tracking
   * Automatically switches to next worker when one approaches daily limit
   */
  private getNextAvailableWorker(): string {
    const validWorkers = this.BACKEND_WORKERS.filter(w => w && !w.includes('YOUR-ACCOUNT'));
    
    if (validWorkers.length === 0) {
      return this.BACKEND_WORKERS[0]; // Fallback to first if none configured
    }
    
    if (validWorkers.length === 1) {
      return validWorkers[0]; // Only one worker, use it
    }
    
    // Check if current worker is approaching limit
    const currentUsage = this.workerRequestCounts[this.currentWorkerIndex] || 0;
    
    if (currentUsage >= this.MAX_REQUESTS_PER_WORKER_DAY) {
      console.log(`⚠️ Worker ${this.currentWorkerIndex + 1} approaching daily limit (${currentUsage}/${this.MAX_REQUESTS_PER_WORKER_DAY})`);
      
      // Find next available worker
      for (let i = 0; i < validWorkers.length; i++) {
        const nextIndex = (this.currentWorkerIndex + i + 1) % validWorkers.length;
        const nextUsage = this.workerRequestCounts[nextIndex] || 0;
        
        if (nextUsage < this.MAX_REQUESTS_PER_WORKER_DAY) {
          this.currentWorkerIndex = nextIndex;
          console.log(`🔄 Switched to Worker ${nextIndex + 1} (${nextUsage}/${this.MAX_REQUESTS_PER_WORKER_DAY} used)`);
          break;
        }
      }
      
      // If all workers exhausted, reset counters (new day)
      if (this.workerRequestCounts.every(count => count >= this.MAX_REQUESTS_PER_WORKER_DAY)) {
        console.warn('⚠️ All workers exhausted for today! Resetting counters...');
        this.workerRequestCounts = new Array(validWorkers.length).fill(0);
        this.currentWorkerIndex = 0;
      }
    }
    
    return validWorkers[this.currentWorkerIndex];
  }
  
  /**
   * Track request to current worker
   */
  private trackWorkerRequest(): void {
    this.workerRequestCounts[this.currentWorkerIndex]++;
    
    // Save to localStorage for persistence across sessions
    try {
      const today = new Date().toDateString();
      const data = {
        date: today,
        counts: this.workerRequestCounts,
        currentIndex: this.currentWorkerIndex
      };
      localStorage.setItem('worker_usage_tracker', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save worker usage:', e);
    }
    
    // Log when approaching limit (every 10K requests)
    const currentUsage = this.workerRequestCounts[this.currentWorkerIndex];
    if (currentUsage % 10000 === 0 && currentUsage > 0) {
      console.log(`📊 Worker ${this.currentWorkerIndex + 1} usage: ${currentUsage}/${this.MAX_REQUESTS_PER_WORKER_DAY}`);
    }
  }
  
  /**
   * Load worker usage from localStorage
   */
  private loadWorkerUsage(): void {
    try {
      const saved = localStorage.getItem('worker_usage_tracker');
      if (saved) {
        const data = JSON.parse(saved);
        const today = new Date().toDateString();
        
        // Reset if it's a new day
        if (data.date === today) {
          this.workerRequestCounts = data.counts || new Array(this.BACKEND_WORKERS.length).fill(0);
          this.currentWorkerIndex = data.currentIndex || 0;
          console.log('📊 Loaded worker usage:', this.workerRequestCounts);
        } else {
          console.log('🔄 New day detected - resetting worker usage counters');
          this.workerRequestCounts = new Array(this.BACKEND_WORKERS.length).fill(0);
          this.currentWorkerIndex = 0;
        }
      }
    } catch (e) {
      console.warn('Failed to load worker usage:', e);
    }
  }
  
  /**
   * Get worker usage statistics (public method)
   */
  getWorkerStats() {
    const validWorkers = this.BACKEND_WORKERS.filter(w => w && !w.includes('YOUR-ACCOUNT'));
    
    const stats = validWorkers.map((worker, index) => {
      const used = this.workerRequestCounts[index] || 0;
      const remaining = this.MAX_REQUESTS_PER_WORKER_DAY - used;
      
      return {
        workerNumber: index + 1,
        url: worker.substring(0, 50) + '...',
        requestsUsed: used,
        requestsRemaining: Math.max(0, remaining),
        percentUsed: Math.round((used / this.MAX_REQUESTS_PER_WORKER_DAY) * 100),
        status: remaining > 10000 ? '✅ Healthy' : remaining > 1000 ? '⚠️ Low' : '❌ Exhausted'
      };
    });
    
    const totalUsed = this.workerRequestCounts.reduce((sum, count) => sum + count, 0);
    const totalCapacity = validWorkers.length * this.MAX_REQUESTS_PER_WORKER_DAY;
    const totalRemaining = totalCapacity - totalUsed;
    
    return {
      workers: stats,
      summary: {
        totalWorkers: validWorkers.length,
        totalCapacity: totalCapacity,
        totalUsed: totalUsed,
        totalRemaining: totalRemaining,
        overallHealth: Math.round((totalRemaining / totalCapacity) * 100),
        currentWorker: this.currentWorkerIndex + 1,
        recommendation: validWorkers.length === 1 
          ? '💡 Deploy to 2-4 more Cloudflare accounts to get 300K-500K requests/day FREE!'
          : validWorkers.length < 3
          ? '📈 Good! Add 1-2 more workers for even more capacity'
          : '🎉 Excellent! You have massive capacity across multiple workers'
      }
    };
  }
  
  // ========================================="
  
  // =========================================
  // 🎯 SMART RATE LIMIT HANDLER (AUTO-RECOVERY)
  // =========================================
  
  /**
   * Check if a key is currently in cooldown
   */
  private isKeyInCooldown(key: string): boolean {
    const usage = this.keyUsageTracker.get(key);
    if (!usage) return false;
    
    const now = Date.now();
    if (now < usage.cooldownUntil) {
      const remainingSeconds = Math.ceil((usage.cooldownUntil - now) / 1000);
      console.log(`⏳ Key in cooldown for ${remainingSeconds}s (${this.currentProvider})`);
      return true;
    }
    
    // Cooldown expired! Auto-recover the key
    if (usage.isExhausted) {
      console.log(`✅ Key recovered from cooldown! (${this.currentProvider})`);
      usage.isExhausted = false;
      usage.requestCount = 0;
      usage.totalFailures = 0;
    }
    
    return false;
  }
  
  /**
   * Track usage for a key - mark exhausted if rate limit hit
   */
  private trackKeyUsage(key: string, isError: boolean = false): void {
    const now = Date.now();
    let usage = this.keyUsageTracker.get(key);
    
    if (!usage) {
      usage = {
        requestCount: 0,
        lastRequestTime: now,
        cooldownUntil: 0,
        totalFailures: 0,
        isExhausted: false
      };
      this.keyUsageTracker.set(key, usage);
    }
    
    usage.requestCount++;
    usage.lastRequestTime = now;
    
    // If error (likely rate limit), mark as exhausted and set cooldown
    if (isError) {
      usage.totalFailures++;
      usage.isExhausted = true;
      const cooldownPeriod = this.COOLDOWN_PERIODS[this.currentProvider as keyof typeof this.COOLDOWN_PERIODS] || 60000;
      usage.cooldownUntil = now + cooldownPeriod;
      
      const cooldownMinutes = Math.ceil(cooldownPeriod / 60000);
      console.log(`❌ Key exhausted! Cooling down for ${cooldownMinutes} min (${this.currentProvider})`);
    }
    
    // Prevent too many requests per minute (proactive rate limiting)
    const rateLimit = this.RATE_LIMITS[this.currentProvider as keyof typeof this.RATE_LIMITS] || 30;
    const timeSinceFirst = now - usage.lastRequestTime;
    
    if (usage.requestCount >= rateLimit && timeSinceFirst < 60000) {
      usage.isExhausted = true;
      usage.cooldownUntil = now + 60000; // 1 minute cooldown
      console.log(`⚠️ Rate limit approaching! Cooling down (${usage.requestCount}/${rateLimit} in 1 min)`);
    }
  }
  
  /**
   * Get next available key (skips cooldowns automatically)
   */
  private getNextAvailableKey(): string | null {
    const keys = this.getKeysForProvider(this.currentProvider);
    const validKeys = this.getValidKeys(keys);
    
    if (validKeys.length === 0) {
      console.warn(`⚠️ No valid API keys for ${this.currentProvider}!`);
      return null;
    }
    
    // Try each key in sequence, skip those in cooldown
    for (let i = 0; i < validKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % validKeys.length;
      const key = validKeys[keyIndex];
      
      if (!this.isKeyInCooldown(key)) {
        if (i > 0) {
          this.currentKeyIndex = keyIndex;
          console.log(`🔄 Rotated to available key ${keyIndex + 1}/${validKeys.length} (${this.currentProvider})`);
        }
        return key;
      }
    }
    
    // All keys in cooldown! Check when the next one will be available
    const nextAvailableTime = this.getNextAvailableKeyTime(validKeys);
    if (nextAvailableTime) {
      const waitSeconds = Math.ceil((nextAvailableTime - Date.now()) / 1000);
      console.log(`⏰ All keys cooling down. Next available in ${waitSeconds}s`);
    }
    
    return null; // All keys exhausted
  }
  
  /**
   * Get cooldown status for all providers
   */
  private checkAllProvidersCooldown(): { provider: string; available: number; total: number; nextAvailable: number }[] {
    const providers: Array<'backend' | 'groq' | 'gemini' | 'huggingface' | 'together' | 'openrouter' | 'ollama'> = [
      'backend', 'groq', 'gemini', 'huggingface', 'together', 'openrouter', 'ollama'
    ];
    const status = [];
    
    for (const provider of providers) {
      const keys = this.getValidKeys(this.getKeysForProvider(provider));
      if (keys.length === 0) continue;
      
      let available = 0;
      let nextAvailable = Infinity;
      
      for (const key of keys) {
        if (!this.isKeyInCooldown(key)) {
          available++;
        } else {
          const usage = this.keyUsageTracker.get(key);
          if (usage && usage.cooldownUntil < nextAvailable) {
            nextAvailable = usage.cooldownUntil;
          }
        }
      }
      
      status.push({
        provider,
        available,
        total: keys.length,
        nextAvailable: nextAvailable === Infinity ? 0 : nextAvailable
      });
    }
    
    return status;
  }
  
  /**
   * Get timestamp when next key will be available
   */
  private getNextAvailableKeyTime(keys: string[]): number | null {
    let earliestTime: number | null = null;
    
    for (const key of keys) {
      const usage = this.keyUsageTracker.get(key);
      if (usage && usage.cooldownUntil > Date.now()) {
        if (!earliestTime || usage.cooldownUntil < earliestTime) {
          earliestTime = usage.cooldownUntil;
        }
      }
    }
    
    return earliestTime;
  }
  
  /**
   * Show alert when all providers exhausted with recovery time
   */
  private showAllProvidersExhaustedAlert(): void {
    const status = this.checkAllProvidersCooldown();
    const availableProviders = status.filter(s => s.available > 0);
    
    if (availableProviders.length === 0) {
      // Find when next key will be available
      const nextAvailableTimes = status
        .filter(s => s.nextAvailable > 0)
        .map(s => ({ provider: s.provider, time: s.nextAvailable }))
        .sort((a, b) => a.time - b.time);
      
      if (nextAvailableTimes.length > 0) {
        const next = nextAvailableTimes[0];
        const waitMinutes = Math.ceil((next.time - Date.now()) / 60000);
        
        console.error(`
🚨 ALL API PROVIDERS EXHAUSTED! 🚨

Next available: ${next.provider.toUpperCase()} in ${waitMinutes} minute(s)

💡 SOLUTIONS:
1. ⏰ Wait ${waitMinutes} min for ${next.provider} to recover (auto-retry enabled)
2. 🔑 Add more API keys: https://console.groq.com/keys (30 req/min per key)
3. 🎯 Use OpenRouter: https://openrouter.ai/keys (100+ AI models, FREE tier)
4. 📦 Backend proxy already enabled (80K+ req/day capacity)

Current key status:
${status.map(s => `  ${s.provider.toUpperCase()}: ${s.available}/${s.total} available`).join('\n')}
        `);
      } else {
        console.error(`
🚨 ALL API PROVIDERS EXHAUSTED! 🚨

💡 QUICK FIXES:
1. 🔑 Add Groq keys: https://console.groq.com/keys (instant, free, 14,400 req/day each)
2. 🎯 OpenRouter key: https://openrouter.ai/keys (100+ models, FREE tier)
3. 🔄 Restart app to reset cooldowns
4. ⏰ Wait 1-24 hours for limits to reset

Backend proxy is enabled but all 9 keys are exhausted.
        `);
      }
    }
  }
  
  /**
   * Get current API key with automatic rotation and cooldown management
   * Skips placeholder keys (those with XXXX) and keys in cooldown
   */
  private getCurrentApiKey(): string {
    // Try to get an available key (skips cooldowns)
    const availableKey = this.getNextAvailableKey();
    
    if (availableKey) {
      return availableKey;
    }
    
    // All keys in cooldown or exhausted, try switching providers
    console.warn(`⚠️ All keys exhausted for ${this.currentProvider}, trying next provider...`);
    const switched = this.switchToNextProvider();
    
    if (switched) {
      const newKey = this.getNextAvailableKey();
      if (newKey) return newKey;
    }
    
    // All providers exhausted!
    this.showAllProvidersExhaustedAlert();
    
    // Return first key anyway (will fail, but shows user the error)
    const keys = this.getKeysForProvider(this.currentProvider);
    const validKeys = this.getValidKeys(keys);
    return validKeys.length > 0 ? validKeys[0] : keys[0];
  }
  
  /**
   * Filter out placeholder keys
   */
  private getValidKeys(keys: string[]): string[] {
    return keys.filter(key => !key.includes('XXXX') && key.length > 30);
  }
  
  /**
   * Get keys for current provider
   */
  private getKeysForProvider(provider: string): string[] {
    switch(provider) {
      case 'backend': return [this.BACKEND_API_URL]; // Backend doesn't need keys in frontend
      case 'groq': return this.GROQ_API_KEYS;
      case 'gemini': return this.GEMINI_API_KEYS;
      case 'huggingface': return this.HF_API_KEYS;
      case 'together': return this.TOGETHER_API_KEYS;
      case 'openrouter': return this.OPENROUTER_API_KEYS;
      case 'ollama': return this.OLLAMA_ENABLED ? ['ollama-local'] : []; // Local server - no keys needed
      default: return this.GROQ_API_KEYS;
    }
  }
  
  // =========================================
  // 🧠 SMART AI FEATURES
  // =========================================
  
  /**
   * Analyze question complexity and type for smart routing
   */
  private analyzeQuestion(question: string, category: string): {
    complexity: 'simple' | 'medium' | 'complex';
    type: 'code' | 'concept' | 'comparison' | 'troubleshooting' | 'general';
    keywords: string[];
    estimatedTokens: number;
  } {
    const qLower = question.toLowerCase();
    const words = question.split(' ');
    
    // Detect question type
    let type: 'code' | 'concept' | 'comparison' | 'troubleshooting' | 'general' = 'general';
    
    if (qLower.includes('code') || qLower.includes('implement') || qLower.includes('syntax') || qLower.includes('example')) {
      type = 'code';
    } else if (qLower.includes('vs') || qLower.includes('difference') || qLower.includes('compare')) {
      type = 'comparison';
    } else if (qLower.includes('error') || qLower.includes('fix') || qLower.includes('debug') || qLower.includes('not working')) {
      type = 'troubleshooting';
    } else if (qLower.includes('what is') || qLower.includes('explain') || qLower.includes('define')) {
      type = 'concept';
    }
    
    // Detect complexity
    let complexity: 'simple' | 'medium' | 'complex' = 'medium';
    
    if (words.length < 8) {
      complexity = 'simple';
    } else if (words.length > 20 || qLower.includes('advanced') || qLower.includes('deep dive') || qLower.includes('detailed')) {
      complexity = 'complex';
    }
    
    // Extract keywords
    const techKeywords = ['angular', 'react', 'typescript', 'javascript', 'rxjs', 'component', 'service', 'directive', 'pipe', 'module', 'routing', 'http', 'observable', 'promise', 'async'];
    const keywords = techKeywords.filter(kw => qLower.includes(kw));
    
    // Estimate tokens (rough: 1 word ≈ 1.3 tokens)
    const estimatedTokens = Math.ceil(words.length * 1.3);
    
    return { complexity, type, keywords, estimatedTokens };
  }
  
  /**
   * Select best provider based on question analysis
   */
  private selectSmartProvider(analysis: ReturnType<typeof this.analyzeQuestion>): void {
    // Backend is always best (has all providers server-side)
    if (this.USE_BACKEND_PROXY && this.getValidKeys(this.getKeysForProvider('backend')).length > 0) {
      this.currentProvider = 'backend';
      return;
    }
    
    // Smart routing based on question type
    if (analysis.type === 'code' && this.getValidKeys(this.GROQ_API_KEYS).length > 0) {
      this.currentProvider = 'groq'; // Groq is fastest for code
      console.log('🎯 Smart routing: Using Groq for code question');
    } else if (analysis.complexity === 'complex' && this.getValidKeys(this.GEMINI_API_KEYS).length > 0) {
      this.currentProvider = 'gemini'; // Gemini for detailed explanations
      console.log('🎯 Smart routing: Using Gemini for complex question');
    } else if (this.getValidKeys(this.GROQ_API_KEYS).length > 0) {
      this.currentProvider = 'groq'; // Default to Groq (fast and reliable)
    }
  }
  
  /**
   * Add question to history for context awareness
   */
  private addToHistory(question: string, category: string): void {
    this.questionHistory.push({
      question,
      category,
      timestamp: Date.now()
    });
    
    // Keep only last N questions
    if (this.questionHistory.length > this.MAX_HISTORY) {
      this.questionHistory.shift();
    }
  }
  
  /**
   * Get recent context for better follow-up answers
   */
  private getRecentContext(): string {
    if (this.questionHistory.length === 0) return '';
    
    const recentQuestions = this.questionHistory.slice(-3).map(h => h.question).join(', ');
    return `\n\nContext: User recently asked about: ${recentQuestions}`;
  }
  
  /**
   * Enhance prompt with smart instructions based on analysis
   */
  private buildSmartPrompt(question: string, category: string, existingAnswer: string | undefined, analysis: ReturnType<typeof this.analyzeQuestion>): string {
    // ── All text loaded dynamically from DB via AppConfigService ──
    let basePrompt = this.appCfg.cfg.systemRole;

    basePrompt += this.appCfg.promptForType(analysis.type);

    basePrompt += `\n\nQuestion: "${question}"\nCategory: ${category || 'Technical'}`;

    if (existingAnswer) {
      basePrompt += `\n\nExisting context: ${existingAnswer}`;
    }

    // Add context from recent questions if relevant
    const context = this.getRecentContext();
    if (context && this.questionHistory.length > 1) {
      basePrompt += context;
    }

    // Adjust detail level based on complexity
    basePrompt += this.appCfg.complexityInstruction(analysis.complexity);

    basePrompt += this.appCfg.cfg.formatInstruction;

    return basePrompt;
  }
  
  /**
   * Post-process response for better quality
   */
  private enhanceResponse(text: string, analysis: ReturnType<typeof this.analyzeQuestion>): string {
    let enhanced = text;
    
    // Remove common AI artifacts
    enhanced = enhanced.replace(/^(Sure|Certainly|Of course|Here's|Here is)/i, '');
    enhanced = enhanced.trim();
    
    // Ensure proper spacing
    enhanced = enhanced.replace(/\n{3,}/g, '\n\n');
    
    // Add quick summary if response is long
    if (enhanced.length > 2000 && !enhanced.includes('**TL;DR**') && !enhanced.includes('**Summary**')) {
      const firstParagraph = enhanced.split('\n\n')[0];
      if (firstParagraph.length < 200) {
        enhanced = `**Quick Summary:** ${firstParagraph}\n\n` + enhanced;
      }
    }
    
    return enhanced;
  }
  
  /**
   * Switch to next available provider on failure
   */
  private switchToNextProvider(): boolean {
    // Priority order: groq (fastest free) > backend (Cloudflare) > openrouter > gemini > huggingface > together > ollama (local fallback)
    const providers = [
      'groq' as const,
      ...(this.USE_BACKEND_PROXY ? ['backend' as const] : []),
      'openrouter' as const,
      'gemini' as const,
      'huggingface' as const,
      'together' as const,
      ...(this.OLLAMA_ENABLED ? ['ollama' as const] : []) // Add Ollama as final fallback
    ];
    
    const currentIndex = providers.indexOf(this.currentProvider as any);
    
    // Try next providers in sequence
    for (let i = 1; i < providers.length; i++) {
      const nextIndex = (currentIndex + i) % providers.length;
      const nextProvider = providers[nextIndex];
      const keys = this.getKeysForProvider(nextProvider);
      
      // Check if provider has keys configured and hasn't failed too much
      if (keys.length > 0 && keys[0] && this.providerFailCount[nextProvider] < 3) {
        this.currentProvider = nextProvider as any;
        this.currentKeyIndex = 0;
        console.log(`🔄 Switching to ${nextProvider.toUpperCase()} provider`);
        return true;
      }
    }
    
    console.warn('⚠️ All providers exhausted or not configured');
    return false;
  }
  
  /**
   * Get API URL with current key and provider
   */
  private getApiUrl(): string {
    const apiKey = this.getCurrentApiKey();
    console.log(`🔑 Using ${this.currentProvider.toUpperCase()}:`, apiKey.substring(0, 20) + '...');
    
    let url = '';
    switch(this.currentProvider) {
      case 'backend':
        // Backend proxy - most secure, handles all providers server-side
        url = `${this.BACKEND_API_URL}/explain`;
        break;
      
      case 'groq':
        // Groq - Super fast inference
        url = `https://api.groq.com/openai/v1/chat/completions`;
        break;
      
      case 'gemini':
        // Gemini 1.5 Flash - Fast and reliable
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        break;
      
      case 'huggingface':
        // HuggingFace - Using active models
        url = `https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct`;
        break;
      
      case 'together':
        // Together.ai - Multiple models
        url = `https://api.together.xyz/v1/chat/completions`;
        break;
      
      case 'openrouter':
        // OpenRouter - 100+ AI models with one API
        url = `https://openrouter.ai/api/v1/chat/completions`;
        break;
      
      case 'ollama':
        // Ollama - Proxied through ASP.NET API (secure & unlimited!)
        // Backend handles Ollama communication internally
        url = `${this.ASPNET_API_BASE_URL}/ai/ollama`;
        console.log(`🏠 Using Ollama via ASP.NET backend (secure proxy)`);
        break;
    }
    
    console.log('📡 API Endpoint:', url.split('?')[0]);
    return url;
  }
  
  /**
   * Build request body based on provider
   */
  private buildRequestBody(prompt: string, config: any): any {
    switch(this.currentProvider) {
      case 'backend':
        // Backend proxy handles the provider internally
        return {
          question: prompt,
          category: config.category || 'Technical',
          existingAnswer: config.existingAnswer || ''
        };
      
      case 'gemini':
        return {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: config
        };
      
      case 'groq':
      case 'together':
      case 'openrouter':
        // OpenAI-compatible format
        const model = this.currentProvider === 'groq' ? this.appCfg.cfg.modelGroq
                    : this.currentProvider === 'together' ? this.appCfg.cfg.modelTogether
                    : this.appCfg.cfg.modelOpenrouter;
        
        return {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: config.temperature || 0.8,
          max_tokens: config.maxOutputTokens || 2048
        };
      
      case 'huggingface':
        return {
          inputs: prompt,
          parameters: {
            temperature: config.temperature || 0.8,
            max_new_tokens: config.maxOutputTokens || 2048,
            return_full_text: false
          }
        };
      
      case 'ollama':
        // Ollama via ASP.NET backend - use standard format
        // Backend will translate to Ollama format internally
        return {
          question: prompt,
          provider: 'ollama',
          model: this.OLLAMA_MODELS[this.currentOllamaModelIndex],
          temperature: config.temperature || 0.7,
          maxTokens: config.maxOutputTokens || 2048
        };
      
      default:
        return { contents: [{ parts: [{ text: prompt }] }] };
    }
  }
  
  /**
   * Extract text from different provider responses
   */
  private extractTextFromResponse(response: any): string {
    try {
      switch(this.currentProvider) {
        case 'backend':
          // Backend returns standardized format
          return response?.explanation || '';
        
        case 'gemini':
          return response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        case 'groq':
        case 'together':
        case 'openrouter':
          return response?.choices?.[0]?.message?.content || '';
        
        case 'huggingface':
          return response?.[0]?.generated_text || response?.generated_text || '';
        
        case 'ollama':
          // Ollama via backend - returns standardized format
          return response?.explanation || response?.answer || response?.response || '';
        
        default:
          return '';
      }
    } catch (e) {
      console.error('❌ Failed to extract text:', e);
      return '';
    }
  }
  
  /**
   * Generate cache key for a question
   */
  private getCacheKey(question: string, category: string): string {
    const normalized = `${question}_${category}`.toLowerCase().replace(/\s+/g, '_');
    return this.CACHE_KEY_PREFIX + btoa(normalized).substring(0, 50);
  }
  
  /**
   * Get cached response if available and not expired
   */
  private getCachedResponse(question: string, category: string): any | null {
    try {
      const cacheKey = this.getCacheKey(question, category);
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        
        // Check cache version - invalidate old cache if version mismatch
        if (!data.version || data.version !== this.CACHE_VERSION) {
          console.log('🔄 Cache version mismatch, removing old cache entry');
          localStorage.removeItem(cacheKey);
          return null;
        }
        
        const cacheAge = Date.now() - data.timestamp;
        const maxAge = this.CACHE_DURATION_HOURS * 60 * 60 * 1000;
        
        if (cacheAge < maxAge) {
          console.log('✅ Using cached response (saves API call!)');
          return data.response;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    
    return null;
  }
  
  /**
   * Save response to cache
   */
  private cacheResponse(question: string, category: string, response: any): void {
    try {
      const cacheKey = this.getCacheKey(question, category);
      const data = {
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        response: response
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log('💾 Response cached for future use (v' + this.CACHE_VERSION + ')');
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }
  
  /**
   * Track request count and enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    this.requestCount++;
    this.saveRequestCount();
    
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY_MS) {
      const delay = this.REQUEST_DELAY_MS - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Save request count to track across page reloads
   */
  private saveRequestCount(): void {
    const data = {
      count: this.requestCount,
      keyIndex: this.currentKeyIndex,
      timestamp: Date.now()
    };
    localStorage.setItem('ai_request_tracker', JSON.stringify(data));
  }
  
  /**
   * Load saved request count
   */
  private loadRequestCount(): void {
    try {
      const saved = localStorage.getItem('ai_request_tracker');
      if (saved) {
        const data = JSON.parse(saved);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        
        // Reset if data is old
        if (data.timestamp > hourAgo) {
          this.requestCount = data.count || 0;
          this.currentKeyIndex = data.keyIndex || 0;
        }
      }
    } catch (error) {
      console.warn('Request tracker load error:', error);
    }
  }

  /**
   * Get detailed AI-powered explanation for a topic
   * @param question The question/topic to explain
   * @param category The category of the question
   * @param existingAnswer The existing answer to enhance
   * @param questionId Optional question ID for rating system
   * @returns Observable with detailed explanation
   */
  explainTopicInDetail(question: string, category: string, existingAnswer?: string, questionId?: string): Observable<any> {
    // PRIORITY 1: Check database for top-rated answers (instant return!)
    if (questionId) {
      const dbAnswer = this.getRatedAnswerFromDB(questionId);
      if (dbAnswer) {
        this.trackLikedAnswer(); // 📈 Track liked answer use
        console.log('✅ Using high-quality cached answer', dbAnswer.rating + '/5 stars');
        return of({
          success: true,
          explanation: dbAnswer.aiExplanation,
          fromDB: true,
          rating: dbAnswer.rating,
          ratingCount: dbAnswer.ratingCount
        });
      }
    }

    // PRIORITY 2: Check cache
    const cached = this.getCachedResponse(question, category);
    if (cached) {
      this.trackCachedResponse(); // 📈 Track cache use
      return of(cached); // Return cached response immediately
    }
    
    // 🧠 SMART AI: Analyze question for intelligent routing
    const analysis = this.analyzeQuestion(question, category);
    console.log('🧠 Question Analysis:', {
      complexity: analysis.complexity,
      type: analysis.type,
      keywords: analysis.keywords,
      estimatedTokens: analysis.estimatedTokens
    });
    
    // Select best provider for this question
    this.selectSmartProvider(analysis);
    
    // Add to history for context awareness
    this.addToHistory(question, category);
    
    // PRIORITY 3: Make API call (tracked below)
    console.log('🌐 No cache found - making fresh API call...');
    this.trackApiCall(); // 📈 Track actual API call
    return from(this.enforceRateLimit()).pipe(
      switchMap(() => {
        // 🧠 Build smart prompt based on question analysis
        const prompt = this.buildSmartPrompt(question, category, existingAnswer, analysis);

        // ── Loaded dynamically from DB via AppConfigService ──
        const generationConfig = {
          temperature:     this.appCfg.cfg.defaultTemperature,
          topK:            this.appCfg.cfg.topK,
          topP:            this.appCfg.cfg.topP,
          maxOutputTokens: this.appCfg.cfg.maxOutputTokens,
        };

        const requestBody = this.buildRequestBody(prompt, generationConfig);

        // Build headers based on provider
        const headers = new HttpHeaders(
          this.currentProvider === 'backend'
            ? { 'Content-Type': 'application/json' }
            : this.currentProvider === 'gemini' 
            ? { 'Content-Type': 'application/json' }
            : this.currentProvider === 'groq'
            ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getCurrentApiKey()}` }
            : this.currentProvider === 'huggingface'
            ? { 'Authorization': `Bearer ${this.getCurrentApiKey()}` }
            : this.currentProvider === 'openrouter'
            ? { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${this.getCurrentApiKey()}`,
                'HTTP-Referer': 'https://jayantbhardwaj.com',
                'X-Title': 'Interview Prep App'
              }
            : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getCurrentApiKey()}` }
        );

        console.log(`📤 Sending request to ${this.currentProvider.toUpperCase()}:`, this.getApiUrl().split('?')[0]);
        
        return this.http.post(this.getApiUrl(), requestBody, { headers }).pipe(
          map((response: any) => {
            console.log(`✅ ${this.currentProvider.toUpperCase()} Response received:`, response);
            
            // Track worker usage for load balancing
            if (this.currentProvider === 'backend') {
              this.trackWorkerRequest();
            }
            
            // Track successful key usage
            const currentKey = this.getCurrentApiKey();
            this.trackKeyUsage(currentKey, false); // Success!
            
            const text = this.extractTextFromResponse(response);
            
            if (text && text.trim().length > 0) {
              console.log('📝 Generated text length:', text.length);
              
              // 🧠 Enhance response with smart post-processing
              const enhancedText = this.enhanceResponse(text, analysis);
              console.log('✨ Response enhanced for better quality');
              
              this.providerFailCount[this.currentProvider] = 0; // Reset fail count on success
              
              const result = {
                success: true,
                explanation: this.formatExplanation(enhancedText),
                rawText: enhancedText,
                provider: this.currentProvider, // Track which provider worked
                analysis: { // Include analysis for debugging/monitoring
                  complexity: analysis.complexity,
                  type: analysis.type,
                  keywords: analysis.keywords
                }
              };
              
              // STRATEGY 2: Cache the successful response
              this.cacheResponse(question, category, result);
              
              return result;
            }
            
            console.warn(`⚠️ No valid response from ${this.currentProvider}:`, response);
            this.providerFailCount[this.currentProvider]++;
            
            return {
              success: false,
              explanation: this.getFallbackExplanation(question),
              error: `No valid response from ${this.currentProvider}`
            };
          }),
          catchError(error => {
            console.error(`❌ ${this.currentProvider.toUpperCase()} API ERROR:`, {
              status: error.status,
              message: error.message,
              provider: this.currentProvider
            });
            
            // Track key usage for rate limiting
            const currentKey = this.getCurrentApiKey();
            
            this.providerFailCount[this.currentProvider]++;
            
            let errorMessage = 'Unknown error';
            let shouldTryNextProvider = false;
            let isRateLimitError = false;
            
            if (error.status === 0) {
              errorMessage = `Network error with ${this.currentProvider}`;
              shouldTryNextProvider = true;
            } else if (error.status === 400) {
              errorMessage = error.error?.error?.message || 'Bad Request';
            } else if (error.status === 403) {
              errorMessage = `API Key Invalid for ${this.currentProvider}`;
              shouldTryNextProvider = true;
              this.trackKeyUsage(currentKey, true); // Mark key as bad
            } else if (error.status === 404) {
              errorMessage = `Model not found in ${this.currentProvider}`;
              shouldTryNextProvider = true;
            } else if (error.status === 429) {
              errorMessage = `Rate limit exceeded on ${this.currentProvider}`;
              shouldTryNextProvider = true;
              isRateLimitError = true;
              this.trackKeyUsage(currentKey, true); // Mark key as exhausted
              console.warn(`⏱️ ${this.currentProvider} Rate Limited - Key will auto-recover after cooldown`);
            } else if (error.status === 503) {
              errorMessage = `${this.currentProvider} Service Unavailable`;
              shouldTryNextProvider = true;
            } else {
              errorMessage = error.error?.error?.message || error.message || `HTTP ${error.status}`;
            }
            
            // 🔥 AUTO-FALLBACK: Try next provider if this one failed
            if (shouldTryNextProvider && this.switchToNextProvider()) {
              console.log(`🔄 Retrying with ${this.currentProvider.toUpperCase()}...`);
              // Recursively call with new provider
              return this.explainTopicInDetail(question, category, existingAnswer, questionId);
            }
            
            console.error('❌ All providers failed or exhausted');
            return of({
              success: false,
              explanation: this.getFallbackExplanation(question),
              error: `All AI providers failed. Last: ${errorMessage}`
            });
          })
        );
      })
    );
  }

  /**
   * Format the AI response into structured HTML
   */
  private formatExplanation(text: string): string {
    // Convert markdown-like formatting to HTML
    let formatted = text;
    
    // Remove any stray HTML-like artifacts (in case AI includes them by mistake)
    formatted = formatted.replace(/class="[^"]*">/g, '');
    formatted = formatted.replace(/<\/?span[^>]*>/g, '');
    
    // Headings (must come before bold to avoid conflicts)
    formatted = formatted.replace(/###\s*([^\n]+)/g, '<h3 class="ai-heading">$1</h3>');
    formatted = formatted.replace(/##\s*([^\n]+)/g, '<h3 class="ai-heading">$1</h3>');
    formatted = formatted.replace(/#\s*([^\n]+)/g, '<h3 class="ai-heading">$1</h3>');
    
    // Bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Code blocks (preserve formatting)
    formatted = formatted.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre class="ai-code"><code>$2</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
    
    // Bullet points with different icons
    formatted = formatted.replace(/✅\s*([^\n]+)/g, '<li class="ai-bullet success">✅ $1</li>');
    formatted = formatted.replace(/❌\s*([^\n]+)/g, '<li class="ai-bullet error">❌ $1</li>');
    formatted = formatted.replace(/•\s*([^\n]+)/g, '<li class="ai-bullet">• $1</li>');
    
    // Wrap consecutive list items in ul tags
    formatted = formatted.replace(/((?:<li class="ai-bullet[^"]*">.*?<\/li>\s*)+)/g, '<ul class="ai-list">$1</ul>');
    
    // Numbered lists
    formatted = formatted.replace(/^\d+\.\s*([^\n]+)/gm, '<li class="ai-bullet numbered">$1</li>');
    
    // Paragraph breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags
    formatted = '<p>' + formatted + '</p>';
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
    formatted = formatted.replace(/<p>\s*<br>\s*<\/p>/g, '');
    
    return formatted;
  }

  /**
   * Fallback explanation when AI service is unavailable
   */
  private getFallbackExplanation(question: string): string {
    return `
      <div class="fallback-explanation">
        <p>
          We're preparing a detailed explanation for you! This concept is important for understanding modern software development.
        </p>
        <br>
        <h3 class="ai-heading">✨ Learning Tips</h3>
        <ul class="ai-list">
          <li class="ai-bullet">Start with the basics and build your understanding gradually</li>
          <li class="ai-bullet">Practice with hands-on examples and real projects</li>
          <li class="ai-bullet">Don't hesitate to experiment and make mistakes - that's how you learn!</li>
          <li class="ai-bullet">Connect this concept with what you already know</li>
        </ul>
        <br>
        <p><em>💡 Tip: Try searching for this topic with specific examples, or break it down into smaller questions!</em></p>
      </div>
    `;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    const validGeminiKeys = this.getValidKeys(this.GEMINI_API_KEYS);
    return validGeminiKeys.length > 0;
  }
  
  /**
   * Get count of valid keys per provider (for debugging)
   */
  getKeyStats(): { gemini: number, groq: number, huggingface: number, together: number } {
    return {
      gemini: this.getValidKeys(this.GEMINI_API_KEYS).length,
      groq: this.getValidKeys(this.GROQ_API_KEYS).length,
      huggingface: this.getValidKeys(this.HF_API_KEYS).length,
      together: this.getValidKeys(this.TOGETHER_API_KEYS).length
    };
  }

  /**
   * Reset conversation ID for new chat
   * Call this when user starts a new conversation
   */
  resetConversation(): void {
    this.conversationId = null;
    localStorage.removeItem('conversationId');
    console.log('🔄 Conversation reset - next message will start new chat');
  }

  /**
   * Get simple quick answer (uses fewer tokens)
   */
  getQuickAnswer(question: string): Observable<any> {
    // Check cache first
    const cached = this.getCachedResponse(question, 'quick');
    if (cached) {
      return of(cached);
    }
    
    return from(this.enforceRateLimit()).pipe(
      switchMap(() => {
        const prompt = `Explain briefly in 2-3 sentences: ${question}`;

        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 200,
          }
        };

        const headers = new HttpHeaders({
          'Content-Type': 'application/json'
        });

        return this.http.post(this.getApiUrl(), requestBody, { headers }).pipe(
          map((response: any) => {
            if (response.candidates && response.candidates.length > 0) {
              const result = {
                success: true,
                answer: response.candidates[0].content.parts[0].text
              };
              
              this.cacheResponse(question, 'quick', result);
              return result;
            }
            return {
              success: false,
              answer: 'Unable to generate answer at this time.'
            };
          }),
          catchError(error => {
            console.error('AI API Error:', error);
            
            if (error.status === 429) {
              const keys = this.getKeysForProvider(this.currentProvider);
              this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;
              this.requestCount = 0;
            }
            
            return of({
              success: false,
              answer: 'Service temporarily unavailable.',
              error: error.message
            });
          })
        );
      })
    );
  }

  /**
   * Streams answer from backend SSE endpoint (/api/ai/stream).
   * Emits partial text every 30 tokens so UI can show real-time streaming,
   * then emits final complete text with done:true.
   */
  getOllamaExplanation(prompt: string, mode?: string, rawMode = true): Observable<{ explanation: string; success: boolean; done?: boolean }> {
    // Use relative /api path on localhost (proxied); full URL in production
    const apiBase = window.location.hostname === 'localhost' ? '' : 'https://learnwithai.tech';

    // Abort any in-flight request before starting a new one (handles rapid re-asks)
    if (this.activeXhr) {
      this.activeXhr.abort();
      this.activeXhr = null;
    }

    return new Observable(observer => {
      const xhr = new XMLHttpRequest();
      this.activeXhr = xhr;
      xhr.open('POST', `${apiBase}/api/ai/stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      // Forward JWT when logged in so the backend can route to custom providers
      const jwtToken = this.authSvc?.getToken?.();
      if (jwtToken) xhr.setRequestHeader('Authorization', `Bearer ${jwtToken}`);
      xhr.responseType = 'text';

      let cursor = 0;
      let accumulated = '';
      let lastEmitAt = 0;          // time-based throttle — emit at most every 60ms
      const THROTTLE_MS = 60;

      // Always read from the live service value — localStorage may be stale
      const selectedProvider = this.llmSvc?.selectedProvider ?? localStorage.getItem('selected_llm_provider') ?? 'ollama';
      console.log('[AI] Sending request with provider:', selectedProvider);

    const parseChunks = (isFinal = false) => {
  const newText = xhr.responseText.slice(cursor);
  cursor = xhr.responseText.length;

  for (const line of newText.split('\n')) {

    // ✅ HANDLE conversation event
    if (line.startsWith('event: conversation')) {
      continue; // next line will have data
    }

    if (line.startsWith('data: ')) {
      try {
        const raw = line.slice(6);

        // 🔥 detect if it's conversationId (string, not JSON object)
        if (raw.startsWith('"') && raw.endsWith('"')) {
          const convId = JSON.parse(raw);

          this.conversationId = convId;
          localStorage.setItem('conversationId', convId);

          console.log('✅ Conversation ID received:', convId);
          continue;
        }

        const chunk = JSON.parse(raw);

        if (chunk.done) {
          if (chunk.error) {
            observer.next({ success: false, explanation: `⚠️ ${chunk.error}`, done: true });
          } else {
            observer.next({ success: accumulated.length > 0, explanation: accumulated, done: true });
          }
          observer.complete();
          return;
        }

        accumulated += chunk.token || '';

        const now = Date.now();
        if (isFinal || now - lastEmitAt >= THROTTLE_MS) {
          lastEmitAt = now;
          observer.next({ success: true, explanation: accumulated, done: false });
        }

      } catch {}
    }
  }
};

      xhr.onprogress = () => parseChunks();
      xhr.onload = () => {
        this.activeXhr = null;
        if (xhr.status === 429) {
          observer.next({ success: false, explanation: '⏳ The AI server is handling many requests right now. Please wait a moment and try again.', done: true });
          observer.complete();
          return;
        }
        if (xhr.status >= 500) {
          observer.next({ success: false, explanation: '⚠️ AI server error. Please try again in a moment.', done: true });
          observer.complete();
          return;
        }
        parseChunks(true);
        if (!observer.closed) {
          observer.next({ success: accumulated.length > 0, explanation: accumulated || '⚠️ No response received. Please try again.', done: true });
          observer.complete();
        }
      };
      xhr.onerror = () => {
        this.activeXhr = null;
        observer.next({ success: false, explanation: '🔌 Connection error. Check your network and try again.', done: true });
        observer.complete();
      };

      // rawMode=true keeps existing prompt-heavy lesson/note flows working.
      // Chat callers can pass rawMode=false so the backend applies its ChatGPT-style chat prompt.
      xhr.send(JSON.stringify({
        question: prompt,
        conversationId: this.conversationId || null,
        maxTokens: this.appCfg.cfg.maxTokensStream,
        provider: selectedProvider,
        rawMode,
        mode: mode ?? null
      }));
      return () => { xhr.abort(); this.activeXhr = null; };
    });
  }

  /**
   * Get simplified, beginner-friendly explanation (for "Explain Differently" button)
   */
  getSimplifiedExplanation(customPrompt: string): Observable<any> {
    console.log('🎓 Getting simplified explanation (Visual Diagram)...');
    console.log('📝 Prompt preview:', customPrompt.substring(0, 200));
    
    // Track this API call
    this.trackApiCall();
    
    return from(this.enforceRateLimit()).pipe(
      switchMap(() => {
        // 🔥 PRIORITY: Try backend proxy first if enabled
        if (this.USE_BACKEND_PROXY && this.currentProvider === 'backend') {
          console.log('🔑 Using BACKEND for visual diagram...');
          
          const backendPayload = {
            prompt: customPrompt
          };
          
          const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
          
          return this.http.post(`${this.ASPNET_API_BASE_URL}/ai/simplified`, backendPayload, { headers }).pipe(
            switchMap((response: any) => {
              console.log('✅ BACKEND Visual Diagram response received:', response);
              
              // Track worker usage
              if (this.currentProvider === 'backend') {
                this.trackWorkerRequest();
              }
              
              if (response.success && response.explanation && response.explanation.trim().length > 0) {
                this.providerFailCount.backend = 0;
                
                // Clean diamond symbols
                let cleanedText = response.explanation;
                for (let i = 0; i < 5; i++) {
                  cleanedText = cleanedText
                    .replace(/[\u2666\u2665\u2663\u2660\u25C6\u25C7\u25CA\u25CB\uFFFD]/g, '')
                    .replace(/[♦♥♣♠◆◇⬥⬦◊○�]/g, '')
                    .replace(/&#9830;|&diams;|&#x25C6;|&#10070;/g, '');
                }
                
                console.log('✅ Backend diagram content cleaned, length:', cleanedText.length);
                
                return of({
                  success: true,
                  explanation: cleanedText,
                  rawText: cleanedText,
                  provider: response.provider || 'backend'
                });
              }
              
              console.warn('⚠️ Empty or invalid response from backend:', response);
              this.providerFailCount.backend++;
              
              // Fallback to frontend providers
              console.log('🔄 Switching to frontend providers for diagram...');
              this.switchToNextProvider();
              return this.getSimplifiedExplanation(customPrompt);
            }),
            catchError(error => {
              console.error('❌ BACKEND Visual Diagram error:', {
                status: error.status,
                message: error.message,
                error: error.error
              });
              this.providerFailCount.backend++;
              
              // Fallback to frontend providers
              console.log('🔄 Switching to frontend providers for diagram...');
              this.switchToNextProvider();
              return this.getSimplifiedExplanation(customPrompt);
            })
          );
        }
        
        // Frontend providers (fallback)
        const generationConfig = {
          temperature: 1.2,
          topK: 50,
          topP: 0.98,
          maxOutputTokens: 1500
        };

        const requestBody = this.buildRequestBody(customPrompt, generationConfig);

        // Build headers based on provider
        const headers = new HttpHeaders(
          this.currentProvider === 'gemini' 
            ? { 'Content-Type': 'application/json' }
            : this.currentProvider === 'groq'
            ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getCurrentApiKey()}` }
            : this.currentProvider === 'huggingface'
            ? { 'Authorization': `Bearer ${this.getCurrentApiKey()}` }
            : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getCurrentApiKey()}` }
        );

        console.log(`📤 Sending simplified request to ${this.currentProvider.toUpperCase()}...`);
        console.log('🔍 Request body preview:', JSON.stringify(requestBody).substring(0, 300));

        return this.http.post(this.getApiUrl(), requestBody, { 
          headers,
          // Prevent browser caching
          params: { 
            '_t': Date.now().toString() 
          }
        }).pipe(
          map((response: any) => {
            console.log(`✅ ${this.currentProvider.toUpperCase()} Simplified response received`);
            console.log('Full response object:', response);
            
            const text = this.extractTextFromResponse(response);
            
            if (text && text.trim().length > 0) {
              console.log('📝 Text length:', text.length);
              console.log('📝 FULL RAW TEXT:');
              console.log(text);
              console.log('📝 END OF RAW TEXT');
              this.providerFailCount[this.currentProvider] = 0;
              
              // 🔥 AGGRESSIVE DIAMOND REMOVAL at source - before any processing
              let cleanedText = text;
              // Remove all diamond symbols and related characters from AI response
              for (let i = 0; i < 5; i++) {
                cleanedText = cleanedText
                  .replace(/[\u2666\u2665\u2663\u2660\u25C6\u25C7\u25CA\u25CB\uFFFD]/g, '')
                  .replace(/[♦♥♣♠◆◇⬥⬦◊○�]/g, '')
                  .replace(/&#9830;|&diams;|&#x25C6;|&#10070;/g, '')
                  .replace(/\.[\s]*[♦◆�]/g, '.')
                  .replace(/[♦◆�][\s]*\./g, '.')
                  .replace(/>\s*[♦◆�]\s*/g, '> ')
                  .replace(/\s*[♦◆�]\s*</g, ' <')
                  .replace(/\s*[♦◆�]\s+/g, ' ');
              }
              
              console.log('🧹 Cleaned text (diamond removal):', cleanedText.substring(0, 200));
              
              // Don't format - return raw HTML from AI
              const result = {
                success: true,
                explanation: cleanedText,  // Return cleaned text
                rawText: cleanedText,
                provider: this.currentProvider
              };
              
              return result;
            }
            
            console.warn(`⚠️ No valid simplified response from ${this.currentProvider}`);
            this.providerFailCount[this.currentProvider]++;
            return {
              success: false,
              explanation: this.getFallbackExplanation(''),
              error: `No response from ${this.currentProvider}`
            };
          }),
          catchError(error => {
            console.error(`❌ ${this.currentProvider.toUpperCase()} simplified error:`, {
              status: error.status,
              message: error.message
            });
            
            this.providerFailCount[this.currentProvider]++;
            
            // 🔥 AUTO-FALLBACK on error
            if ((error.status === 429 || error.status === 503 || error.status === 0) && this.switchToNextProvider()) {
              console.log(`🔄 Retrying simplified with ${this.currentProvider.toUpperCase()}...`);
              return this.getSimplifiedExplanation(customPrompt);
            }
            
            return of({
              success: false,
              explanation: this.getFallbackExplanation(''),
              error: error.error?.error?.message || error.message || 'Failed to generate simplified explanation'
            });
          })
        );
      })
    );
  }
  
  /**
   * Clear all cached responses (useful for freeing space)
   */
  clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }
  
  /**
   * Get usage statistics
   */
  getUsageStats(): { requestCount: number; currentKey: number; totalKeys: number; cacheSize: number; ratedAnswersInDB: number } {
    let cacheSize = 0;
    try {
      const keys = Object.keys(localStorage);
      cacheSize = keys.filter(k => k.startsWith(this.CACHE_KEY_PREFIX)).length;
    } catch (error) {
      console.warn('Stats error:', error);
    }
    
    return {
      requestCount: this.requestCount,
      currentKey: this.currentKeyIndex + 1,
      totalKeys: this.getKeysForProvider(this.currentProvider).length,
      cacheSize: cacheSize,
      ratedAnswersInDB: this.getRatedAnswersCount()
    };
  }

  /**
   * DATABASE METHODS FOR TOP-RATED ANSWERS
   */

  /**
   * Get top-rated answer from database
   */
  private getRatedAnswerFromDB(questionId: string): RatedAnswer | null {
    try {
      const dbData = localStorage.getItem(this.RATED_ANSWERS_KEY);
      if (!dbData) return null;

      const ratedAnswers: { [key: string]: RatedAnswer } = JSON.parse(dbData);
      const answer = ratedAnswers[questionId];

      // Only return if rating is high enough
      if (answer && answer.rating >= this.MIN_RATING_FOR_DB) {
        return answer;
      }
    } catch (error) {
      console.warn('Error reading rated answers DB:', error);
    }
    return null;
  }

  /**
   * Save or update answer rating in database
   * NEW BEHAVIOR: When user likes a new answer, it REPLACES the old one completely
   */
  saveAnswerRating(questionId: string, question: string, category: string, aiExplanation: string, stars: number): void {
    try {
      const dbData = localStorage.getItem(this.RATED_ANSWERS_KEY);
      const ratedAnswers: { [key: string]: RatedAnswer } = dbData ? JSON.parse(dbData) : {};

      const wasReplaced = ratedAnswers[questionId] ? true : false;
      
      // Always create/replace with new answer
      ratedAnswers[questionId] = {
        questionId,
        question,
        category,
        aiExplanation, // NEW answer replaces old one
        rating: stars,
        ratingCount: 1,
        totalRating: stars,
        createdAt: ratedAnswers[questionId]?.createdAt || Date.now(),
        lastUpdated: Date.now()
      };

      localStorage.setItem(this.RATED_ANSWERS_KEY, JSON.stringify(ratedAnswers));
      
      if (wasReplaced) {
        console.log(`🔄 REPLACED old answer with new ${stars}-star version for question ${questionId}`);
      } else {
        console.log(`💾 Saved NEW answer: ${stars} stars for question ${questionId}`);
      }
    } catch (error) {
      console.error('Error saving answer rating:', error);
    }
  }

  /**
   * Get answer rating for a specific question
   */
  getAnswerRating(questionId: string): RatedAnswer | null {
    try {
      const dbData = localStorage.getItem(this.RATED_ANSWERS_KEY);
      if (!dbData) return null;

      const ratedAnswers: { [key: string]: RatedAnswer } = JSON.parse(dbData);
      return ratedAnswers[questionId] || null;
    } catch (error) {
      console.warn('Error getting answer rating:', error);
      return null;
    }
  }

  /**
   * Get all top-rated answers (4+ stars)
   */
  getAllTopRatedAnswers(): RatedAnswer[] {
    try {
      const dbData = localStorage.getItem(this.RATED_ANSWERS_KEY);
      if (!dbData) return [];

      const ratedAnswers: { [key: string]: RatedAnswer } = JSON.parse(dbData);
      return Object.values(ratedAnswers)
        .filter(answer => answer.rating >= this.MIN_RATING_FOR_DB)
        .sort((a, b) => b.rating - a.rating);
    } catch (error) {
      console.warn('Error getting top-rated answers:', error);
      return [];
    }
  }

  /**
   * Get count of rated answers in database
   */
  private getRatedAnswersCount(): number {
    try {
      const dbData = localStorage.getItem(this.RATED_ANSWERS_KEY);
      if (!dbData) return 0;

      const ratedAnswers: { [key: string]: RatedAnswer } = JSON.parse(dbData);
      return Object.keys(ratedAnswers).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear all rated answers from database
   */
  clearRatedAnswersDB(): void {
    localStorage.removeItem(this.RATED_ANSWERS_KEY);
    console.log('🗑️ Cleared rated answers database');
  }
}
