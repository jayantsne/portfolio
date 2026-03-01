/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                    AI CONFIGURATION FILE                        ║
 * ║  Edit this file to control everything about AI behaviour.       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Changes here affect:
 *   • Which AI provider/model is used
 *   • The system prompt & per-question-type instructions
 *   • Temperature, token limits, caching and rate limits
 *   • Backend / local dev endpoint
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1.  BACKEND ENDPOINT
//     Switch between local dev and production by changing USE_LOCAL_BACKEND.
// ─────────────────────────────────────────────────────────────────────────────
export const AI_BACKEND = {
  /** Set to true while running the ASP.NET backend on your machine */
  USE_LOCAL_BACKEND: true,

  // Relative path → Angular dev-server proxy forwards to localhost:5000 and adds X-API-Key
  LOCAL_URL:      '/api',
  PRODUCTION_URL: 'https://learnwithai.tech/api',

  /** Derived: the URL that will actually be used at runtime */
  get BASE_URL(): string {
    return this.USE_LOCAL_BACKEND ? this.LOCAL_URL : this.PRODUCTION_URL;
  },

  API_KEY: 'b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41',
};

// ─────────────────────────────────────────────────────────────────────────────
// 2.  PROVIDER SELECTION
//     'backend'     → your ASP.NET server (handles Ollama / Groq server-side)
//     'groq'        → direct Groq API (needs key in environment.ts)
//     'gemini'      → Google Gemini direct
//     'ollama'      → Ollama stream via backend
//     'openrouter'  → OpenRouter (100+ models)
//     'huggingface' → HuggingFace Inference API
//     'together'    → Together.ai
// ─────────────────────────────────────────────────────────────────────────────
export const AI_PROVIDER = {
  /** Primary provider to try first */
  DEFAULT: 'backend' as 'backend' | 'groq' | 'gemini' | 'ollama' | 'openrouter' | 'huggingface' | 'together',

  /** Whether to route all AI calls through your ASP.NET backend proxy */
  USE_BACKEND_PROXY: true,

  /** Whether to allow Ollama as a fallback */
  OLLAMA_ENABLED: true,

  /**
   * Fallback order when the default provider fails.
   * Remove a provider from this list to skip it entirely.
   */
  FALLBACK_ORDER: [
    'groq',
    'backend',
    'openrouter',
    'gemini',
    'huggingface',
    'together',
    'ollama',
  ] as Array<'backend' | 'groq' | 'gemini' | 'ollama' | 'openrouter' | 'huggingface' | 'together'>,
};

// ─────────────────────────────────────────────────────────────────────────────
// 3.  MODEL NAMES
//     Change a model name here and it updates everywhere automatically.
// ─────────────────────────────────────────────────────────────────────────────
export const AI_MODELS = {
  groq:        'llama-3.3-70b-versatile',
  together:    'mistralai/Mixtral-8x7B-Instruct-v0.1',
  openrouter:  'meta-llama/llama-3.1-8b-instruct:free',
  /** Streaming endpoint model (used by ai-streaming.service) */
  ollamaStream: 'qwen2.5:3b-instruct-q4_0' as 'qwen2.5:3b-instruct-q4_0' | 'llama3.2:3b',
  /** Fallback Ollama models tried in order */
  ollamaFallbacks: ['llama2', 'llama3', 'mistral', 'codellama', 'gemma'],
};

// ─────────────────────────────────────────────────────────────────────────────
// 4.  GENERATION SETTINGS
//     Controls creativity, length and quality of responses.
// ─────────────────────────────────────────────────────────────────────────────
export const AI_GENERATION = {
  temperature:     0.9,    // 0 = deterministic, 1 = creative
  topK:            50,
  topP:            0.98,
  maxOutputTokens: 1536,   // Main explanation length
  maxTokensStream: 2048,   // Streaming endpoint (Ollama / SSE)

  /** "Explain Differently" (simplified / visual) response length */
  maxTokensSimplified: 2048,
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.  SYSTEM PROMPT  ← Edit this to change the AI's personality / role
// ─────────────────────────────────────────────────────────────────────────────
export const AI_PROMPT = {
  /**
   * The opening line of every prompt.
   * This defines the AI's role.
   */
  SYSTEM_ROLE: `You are an expert technical interviewer and educator. `,

  /**
   * Extra instruction appended right after SYSTEM_ROLE,
   * chosen based on the detected question type.
   */
  TYPE_INSTRUCTIONS: {
    code:            `Provide clear code examples with comments. Focus on practical implementation.`,
    concept:         `Explain concepts clearly with real-world analogies. Build from basics to advanced.`,
    comparison:      `Compare options objectively. Show clear differences with pros/cons.`,
    troubleshooting: `Diagnose the issue step-by-step. Provide actionable solutions with explanations.`,
    default:         `Provide comprehensive, interview-ready explanations.`,
  },

  /**
   * Output format instruction added at the very end of every prompt.
   * Change this to get different answer formats (bullet points, tables, etc.).
   */
  FORMAT_INSTRUCTION: `\n\nFormat: Use clear sections with headers. Include code examples when relevant. Make it interview-ready and easy to remember.`,

  /**
   * Length/depth instructions based on detected complexity.
   */
  COMPLEXITY_INSTRUCTIONS: {
    simple: `\n\nProvide a concise, clear explanation (2-3 paragraphs).`,

    medium: `\n\nProvide a thorough explanation with:\n1. Clear concept overview\n2. Practical examples\n3. Best practices\n4. Common mistakes\n5. Interview preparation tips`,

    complex: `\n\nProvide an in-depth, comprehensive explanation with:\n1. Core concepts and fundamentals\n2. Detailed examples with code (if applicable)\n3. Advanced patterns and best practices\n4. Common pitfalls and how to avoid them\n5. Real-world applications and interview tips`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6.  CACHE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
export const AI_CACHE = {
  /** Set to false to always make fresh API calls (useful during development) */
  ENABLED: true,

  /** How long to keep a cached answer (hours) */
  DURATION_HOURS: 24,

  /** Increment this number to invalidate all existing cached answers */
  VERSION: 2,

  KEY_PREFIX: 'ai_learn_cache_',
};

// ─────────────────────────────────────────────────────────────────────────────
// 7.  RATE LIMIT SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
export const AI_RATE_LIMITS = {
  /** Maximum requests per minute before the app starts queuing */
  MAX_REQUESTS_PER_MINUTE: 50,

  /** Minimum delay between consecutive requests (ms) */
  REQUEST_DELAY_MS: 1200,

  /** Context history — how many previous questions to include for context */
  MAX_HISTORY: 10,

  /** Per-provider requests-per-minute limits */
  PER_PROVIDER: {
    backend:      30,
    groq:         30,
    gemini:       60,
    huggingface:  10,
    together:     60,
    openrouter:   10,
    ollama:       9999,
  },

  /** Cooldown after a key/provider hits its limit (ms) */
  COOLDOWN_MS: {
    backend:      60 * 1000,
    groq:         60 * 1000,
    gemini:       24 * 60 * 60 * 1000,
    huggingface:  60 * 1000,
    together:     60 * 1000,
    openrouter:   60 * 1000,
    ollama:       0,
  },
};
