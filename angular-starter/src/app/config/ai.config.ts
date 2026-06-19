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
//     In production the environment file sets apiUrl to the absolute VPS URL.
//     In development the Angular proxy forwards /api to localhost:5000.
// ─────────────────────────────────────────────────────────────────────────────
import { environment } from '../../environments/environment';

export const AI_BACKEND = {
  /** true = use relative /api (dev proxy), false = use absolute production URL */
  USE_LOCAL_BACKEND: !environment.production,

  // Relative path → Angular dev-server proxy forwards to localhost:5000.
  LOCAL_URL:      '/api',
  PRODUCTION_URL: 'https://learnwithai.tech/api',

  /** Derived: the URL that will actually be used at runtime */
  get BASE_URL(): string {
    return this.USE_LOCAL_BACKEND ? this.LOCAL_URL : this.PRODUCTION_URL;
  },

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
  temperature:     0.65,   // 0.65 = focused & accurate for code/teaching (was 0.9 — too random)
  topK:            50,
  topP:            0.95,
  maxOutputTokens: 1800,   // Main explanation length
  maxTokensStream: 2400,   // Streaming endpoint — more room for code examples

  /** "Explain Differently" (simplified / visual) response length */
  maxTokensSimplified: 2400,
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.  SYSTEM PROMPT  ← Edit this to change the AI's personality / role
// ─────────────────────────────────────────────────────────────────────────────
export const AI_PROMPT = {
  /**
   * System identity — defines the AI's persona and tone.
   * Injected at the start of every backend request.
   */
  SYSTEM_ROLE:
    `You are an expert senior software engineer and programming mentor with 15+ years of industry experience. ` +
    `You explain concepts the way a great teacher would — clear, practical, and structured. ` +
    `You never start replies with "Sure!", "Certainly!", "Great question!" or similar filler phrases. ` +
    `You go straight into the explanation. ` +
    `All responses MUST be in valid Markdown with proper headings, fenced code blocks with language identifiers, ` +
    `bold key terms, and bullet points where appropriate. `,

  /**
   * Extra instruction appended right after SYSTEM_ROLE,
   * chosen based on the detected question type.
   */
  TYPE_INSTRUCTIONS: {
    code:            `Focus on practical, working code. Every code block must specify the language (e.g. \`\`\`javascript). Add inline comments explaining key lines.`,
    concept:         `Build understanding from first principles. Use a real-world analogy before diving into technical detail. Visual ASCII diagrams are encouraged.`,
    comparison:      `Compare options in a structured way — differences table, then prose pros/cons. Be opinionated about when to choose each.`,
    troubleshooting: `Diagnose step-by-step. Show the broken pattern first, then the fix, with explanation of WHY it was wrong.`,
    default:         `Give a complete, interview-ready explanation. Balance theory with code. Include best practices and common pitfalls.`,
  },

  /**
   * Mandatory output format appended at the end of every prompt.
   */
  FORMAT_INSTRUCTION:
    `\n\n---\n` +
    `**Response format rules (strictly follow):**\n` +
    `- Use ## for main section headings, ### for sub-sections\n` +
    `- Wrap ALL code in triple-backtick fenced blocks with the language name (e.g. \`\`\`javascript, \`\`\`python, \`\`\`typescript)\n` +
    `- Bold (**) every key term on first use\n` +
    `- Use bullet points or numbered lists — never long unbroken paragraphs\n` +
    `- End the answer with a ## Follow-up Questions section containing exactly 3 questions the student might ask next`,

  /**
   * Length/depth instructions based on detected complexity.
   */
  COMPLEXITY_INSTRUCTIONS: {
    simple:
      `\n\nDepth: Concise. One practical code example. 3-4 bullet points per section. Total ~300 words.`,

    medium:
      `\n\nDepth: Thorough. Cover: (1) clear definition, (2) how it works step-by-step, ` +
      `(3) a real working code example with comments, (4) 3 common mistakes and fixes, (5) interview tip.`,

    complex:
      `\n\nDepth: Comprehensive. Cover: (1) core concept with analogy, (2) detailed code example, ` +
      `(3) advanced patterns and edge cases, (4) performance / security considerations, ` +
      `(5) comparison with alternatives, (6) interview tips and trick questions to watch for.`,
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
