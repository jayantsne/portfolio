import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiUnderstandService, UnderstandResponse } from '../services/ai-understand.service';
import { AILearnService } from '../services/ai-learn.service';
import { NotesService } from '../shared/notes.service';
import { CustomAuthService } from '../shared/custom-auth.service';
import { Subscription } from 'rxjs';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;    // 0-based index
  explanation: string;
}

export interface LearningModule {
  id: number;
  title: string;
  icon: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  topics: Topic[];
  completed: boolean;
  progress: number;
  quizQuestions?: QuizQuestion[];
}

export interface Topic {
  id: number;
  name: string;
  description: string;
  analogy: string;
  keyPoints: string[];
  example: string;
  codeExample?: string;
  stepByStep?: string[];
  completed: boolean;
}

@Component({
  selector: 'app-azure-ai-learn',
  templateUrl: './azure-ai-learn.component.html',
  styleUrls: [
    './azure-ai-learn.component.css',
    './azure-ai-learn-modern.css'
  ],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-50px) scale(0.95)' }),
        animate('0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'translateX(0) scale(1)' }))
      ])
    ]),
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', opacity: '0', overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: '1' })),
      transition('collapsed <=> expanded', 
        animate('0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'))
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class AzureAiLearnComponent implements OnInit, OnDestroy {
  currentView: 'roadmap' | 'module' | 'topic' = 'roadmap';
  selectedModule: LearningModule | null = null;
  selectedTopic: Topic | null = null;
  
  // AI Understanding feature
  showAiModal: boolean = false;
  aiLoading: boolean = false;
  aiError: string | null = null;
  aiResponse: UnderstandResponse | null = null;
  currentAiTopic: string = '';
  aiTypingText: string = '';
  
  // UI Enhancement features
  darkMode: boolean = false;
  expandedSections: Set<string> = new Set();
  copiedSections: Set<string> = new Set();
  showSkeleton: boolean = false;
  aiProgress: number = 0;
  aiStatusText: string = '';

  // ── Quiz feature ─────────────────────────────────────────────────────────
  quizActive        = false;             // quiz panel open?
  quizAnswers:      (number | null)[] = [];
  quizSubmitted     = false;
  quizScore         = 0;

  // ── Notes ────────────────────────────────────────────────────────────────
  noteSaving        = false;
  noteSaved         = false;
  noteError         = '';
  isLoggedIn        = false;

  // ── Architecture Diagram ─────────────────────────────────────────────────
  archDiagramOpen   = false;
  archDiagramLoading= false;
  archDiagramHtml:  SafeHtml | null = null;
  private _archTopic = '';
  private archSub:  Subscription | null = null;

  // ── AI Playground ─────────────────────────────────────────────────────────
  showPlayground      = false;
  playgroundPrompt    = '';
  playgroundOutput    = '';
  playgroundError     = '';
  playgroundLoading   = false;
  playgroundTemperature = 0.7;
  playgroundModel     = 'auto';
  playgroundMs        = 0;
  private playgroundSub: Subscription | null = null;
  private _pgStart    = 0;

  playgroundExamples = [
    { label: '🤖 What is Azure Cognitive Services?',  prompt: 'Explain Azure Cognitive Services in 3 bullet points for the AI-102 exam.' },
    { label: '👁️ Computer Vision vs Custom Vision',  prompt: 'What is the difference between Azure Computer Vision and Custom Vision? When should I use each?' },
    { label: '🗣️ Speech Service key features',       prompt: 'List the key features of Azure Speech Service that appear in the AI-102 exam.' },
    { label: '🛡️ Responsible AI principles',         prompt: 'Summarise Microsoft\'s 6 Responsible AI principles with one-sentence examples each.' },
    { label: '🔍 LUIS vs CLU difference',             prompt: 'What is the difference between LUIS and Conversational Language Understanding (CLU) in Azure AI?' },
  ];

  // Navigate to topic and pre-open the AI Mentor panel
  openTopicWithAiMentor(topic: Topic): void {
    this.selectTopic(topic);
    this.activePanelTab = 'mentor';
  }

  togglePlayground(): void {
    this.showPlayground = !this.showPlayground;
  }

  useExample(prompt: string): void {
    this.playgroundPrompt = prompt;
  }

  runPlayground(): void {
    const q = this.playgroundPrompt.trim();
    if (!q || this.playgroundLoading) return;
    this.playgroundLoading = true;
    this.playgroundOutput  = '';
    this.playgroundError   = '';
    this.playgroundMs      = 0;
    this._pgStart          = Date.now();

    const systemContext = 'System: You are an expert Azure AI-102 study assistant. Be concise and exam-focused. User: ';
    this.playgroundSub?.unsubscribe();
    this.playgroundSub = this.aiLearnService
      .getSimplifiedExplanation(systemContext + q)
      .subscribe({
        next: (res: any) => {
          this.playgroundLoading = false;
          this.playgroundMs      = Date.now() - this._pgStart;
          this.playgroundOutput  = res?.answer ?? res?.explanation ?? res?.text ?? JSON.stringify(res);
        },
        error: (err: any) => {
          this.playgroundLoading = false;
          this.playgroundMs      = Date.now() - this._pgStart;
          this.playgroundError   = err?.message ?? 'An error occurred. Please try again.';
        }
      });
  }

  resetPlayground(): void {
    this.playgroundSub?.unsubscribe();
    this.playgroundPrompt  = '';
    this.playgroundOutput  = '';
    this.playgroundError   = '';
    this.playgroundLoading = false;
    this.playgroundMs      = 0;
  }

  // ── Workspace Panel (AI Mentor + Notes right panel) ───────────────────────
  activePanelTab: string = 'mentor';
  panelNoteText: string  = '';
  panelNotes: { topic: string; text: string }[] = [];

  switchPanelTab(tab: string): void {
    this.activePanelTab = tab;
  }

  quickMentorAsk(prompt: string): void {
    this.mentorInput = prompt;
    this.sendMentorMessage();
  }

  savePanelNote(): void {
    const text = this.panelNoteText.trim();
    if (!text) return;
    this.panelNotes.unshift({ topic: this.selectedTopic?.name ?? 'Note', text });
    this.panelNoteText = '';
  }

  deletePanelNote(index: number): void {
    this.panelNotes.splice(index, 1);
  }

  saveAllPanelNotesToService(): void {
    if (this.panelNotes.length === 0) return;
    const combined = this.panelNotes.map(n => `[${n.topic}] ${n.text}`).join('\n\n');
    this.noteSaving = true;
    this.noteSaved  = false;
    this.notesService.saveNote(
      `Azure AI-102 – ${this.selectedTopic?.name ?? 'Study Session'}`,
      'azure-ai-102',
      combined,
      ['azure-ai-102']
    ).then(() => {
      this.noteSaving = false;
      this.noteSaved  = true;
      setTimeout(() => { this.noteSaved = false; }, 3000);
    }).catch(() => {
      this.noteSaving = false;
      this.noteError  = 'Could not save. Try again.';
    });
  }

  // ── Inline Mentor Chat ───────────────────────────────────────────────────
  mentorMessages:   { role: 'user' | 'ai'; text: string }[] = [];
  mentorInput       = '';
  mentorLoading     = false;
  private mentorSub: Subscription | null = null;
  
  // Loading messages
  private loadingMessages = [
    '🎯 Analyzing topic structure...',
    '🧠 Processing AI-102 exam patterns...',
    '📚 Gathering relevant insights...',
    '✨ Generating explanation...',
    '🎓 Preparing exam-focused content...'
  ];
  private currentMessageIndex = 0;
  private progressInterval: any;
  private messageInterval: any;

  constructor(
    private aiUnderstandService: AiUnderstandService,
    private aiLearnService: AILearnService,
    private notesService: NotesService,
    private authService: CustomAuthService,
    private sanitizer: DomSanitizer
  ) {}
  
  ngOnDestroy(): void {
    this.clearIntervals();
    this.archSub?.unsubscribe();
    this.mentorSub?.unsubscribe();
    this.playgroundSub?.unsubscribe();
  }
  
  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('darkMode', this.darkMode.toString());
    document.body.classList.toggle('dark-mode', this.darkMode);
  }
  
  toggleSection(section: string): void {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
    }
  }
  
  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }
  
  async copyToClipboard(text: string, section: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedSections.add(section);
      setTimeout(() => {
        this.copiedSections.delete(section);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  
  isCopied(section: string): boolean {
    return this.copiedSections.has(section);
  }
  
  private startAiAnimation(): void {
    this.aiProgress = 0;
    this.currentMessageIndex = 0;
    this.aiStatusText = this.loadingMessages[0];
    
    // Progress animation
    this.progressInterval = setInterval(() => {
      if (this.aiProgress < 95) {
        this.aiProgress += Math.random() * 10;
        if (this.aiProgress > 95) this.aiProgress = 95;
      }
    }, 300);
    
    // Message rotation
    this.messageInterval = setInterval(() => {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length;
      this.aiStatusText = this.loadingMessages[this.currentMessageIndex];
    }, 2000);
  }
  
  private clearIntervals(): void {
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.messageInterval) clearInterval(this.messageInterval);
  }
  
  modules: LearningModule[] = [
    {
      id: 1,
      title: 'AI Fundamentals - Start Here!',
      icon: '🌟',
      duration: '3 hours',
      difficulty: 'Beginner',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'What is Artificial Intelligence?',
          description: 'AI is about making computers smart enough to perform tasks that typically require human intelligence - like seeing, hearing, understanding language, and making decisions.',
          analogy: '🤖 Think of AI as teaching a robot to be like a human: Just like kids learn by seeing examples (dog photos = this is a dog), AI learns from data. The more examples it sees, the smarter it gets!',
          keyPoints: [
            'AI = Making computers think and learn like humans',
            'Machine Learning = Teaching computers by showing examples',
            'Deep Learning = Using brain-like neural networks',
            'AI needs LOTS of data to learn (like studying for exams!)',
            'AI is NOT magic - it\'s math and statistics!'
          ],
          example: '💡 Real Life: When Netflix recommends movies you might like, that\'s AI learning from what you watched before! When your phone recognizes your face to unlock, that\'s AI too!',
          completed: false
        },
        {
          id: 2,
          name: 'Cloud Computing Basics',
          description: 'Cloud = Using someone else\'s powerful computers over the internet instead of buying your own. Azure is Microsoft\'s cloud - like renting a supercomputer!',
          analogy: '☁️ Like Netflix vs. DVD: Instead of buying a DVD player and discs (expensive!), you stream movies online. Cloud is the same - instead of buying servers, you rent computing power!',
          keyPoints: [
            'Cloud = Computers you access over the internet',
            'Pay only for what you use (like electricity bill)',
            'No need to buy expensive hardware',
            'Access from anywhere in the world',
            'Automatic updates and security'
          ],
          example: '🎯 Think About It: Your Gmail is in the cloud! You don\'t have a server at home storing emails - Google does it for you. Azure does the same for AI!',
          completed: false
        },
        {
          id: 3,
          name: 'What is an API? (Super Important!)',
          description: 'API = A waiter at a restaurant! You tell the waiter what you want, they bring it from the kitchen. API takes your request, gets data from a service, and brings it back.',
          analogy: '🍕 Restaurant Analogy: You (your app) → Waiter (API) → Kitchen (AI Service) → Waiter brings food → You eat! You don\'t need to know how to cook (train AI), just order from the menu!',
          keyPoints: [
            'API = Application Programming Interface (fancy name for "messenger")',
            'REST API = Most common type, uses HTTP (like websites)',
            'You send REQUEST, get RESPONSE (like asking a question, getting answer)',
            'JSON = Language APIs speak (looks like: {"name": "John"})',
            'Endpoint = URL where you send your request'
          ],
          example: '🔥 Remember: When you use Computer Vision API, YOU don\'t analyze the image - you send it to Microsoft\'s AI (via API), and they send back the result! Easy!',
          codeExample: `/* Example: Calling Azure Computer Vision API */

// 1. Your API credentials
const endpoint = "https://YOUR-RESOURCE-NAME.cognitiveservices.azure.com/";
const apiKey = "YOUR_SUBSCRIPTION_KEY";

// 2. Build the complete URL
const url = endpoint + "vision/v3.2/analyze?visualFeatures=Description,Tags";

// 3. Set up headers (authentication)
const headers = {
  "Ocp-Apim-Subscription-Key": apiKey,
  "Content-Type": "application/json"
};

// 4. Request body (the image to analyze)
const body = {
  "url": "https://example.com/photo.jpg"
};

// 5. Make the API call
fetch(url, {
  method: "POST",
  headers: headers,
  body: JSON.stringify(body)
})
.then(response => response.json())
.then(data => {
  // 6. Use the results!
  console.log("Description:", data.description.captions[0].text);
  console.log("Tags:", data.tags.map(t => t.name).join(", "));
})
.catch(error => {
  console.error("Error:", error);
});

/* Example Response:
{
  "description": {
    "captions": [{"text": "a dog sitting on grass", "confidence": 0.94}]
  },
  "tags": [
    {"name": "dog", "confidence": 0.98},
    {"name": "grass", "confidence": 0.95},
    {"name": "outdoor", "confidence": 0.92}
  ]
}
*/`,
          stepByStep: [
            '1️⃣ Go to Azure Portal → Find your resource → Copy endpoint URL',
            '2️⃣ Copy subscription key from "Keys and Endpoint" section',
            '3️⃣ Add key to headers: "Ocp-Apim-Subscription-Key: YOUR_KEY"',
            '4️⃣ Create JSON body with your data (image URL, text, etc.)',
            '5️⃣ Send POST request to: endpoint + API path',
            '6️⃣ Receive JSON response with AI results',
            '7️⃣ Parse the JSON and display results in your app',
            '⚠️ TIP: Test in Postman first before writing code!',
            '⚠️ ERROR 401 = Wrong key or endpoint',
            '⚠️ ERROR 429 = Too many requests, slow down!'
          ],
          completed: false
        },
        {
          id: 4,
          name: 'Understanding Models & Training',
          description: 'A "Model" is like a trained brain. Training = teaching it by showing examples. Once trained, it can make predictions on new data it\'s never seen!',
          analogy: '🎓 Like Learning Math: Training = Doing practice problems. Model = Your brain after learning. Testing = Exam with new questions. If you studied well, you\'ll answer correctly!',
          keyPoints: [
            'Model = AI "brain" that learned from data',
            'Training Data = Examples you show it to learn',
            'Testing Data = New examples to check if it learned well',
            'Accuracy = How many it gets right (like test score %)',
            'Pre-trained models = Someone already trained it for you!'
          ],
          example: '💪 Azure Tip: Most Azure AI services use PRE-TRAINED models! You don\'t train them - Microsoft already did! Just use them via API. Custom Vision lets YOU train if needed.',
          completed: false
        },
        {
          id: 5,
          name: 'Key AI Terminology You MUST Know',
          description: 'Learn the essential vocab that appears everywhere in AI-102 exam. Think of this as your AI dictionary!',
          analogy: '📖 Like learning a new language: You need to know basic words before having conversations. These are your AI "words"!',
          keyPoints: [
            '🎯 Inference = Using a trained model to make predictions (the actual AI work!)',
            '📊 Dataset = Collection of data used for training',
            '🏷️ Label/Tag = The "answer" for training data (this photo is a "cat")',
            '📈 Confidence Score = How sure AI is (90% confident this is a dog)',
            '⚙️ Endpoint = URL where your AI service lives',
            '🔑 Key = Password to access your AI service',
            '📦 Resource = Your AI service in Azure (like a "box" containing the service)',
            '💰 SKU/Tier = Pricing level (Free, Standard, Premium)'
          ],
          example: '🎓 Exam Tip: Know these terms by heart! "What is inference?" = Using a model to predict. "What is a confidence score?" = How sure the AI is. These appear in EVERY exam question!',
          completed: false
        }
      ]
    },
    {
      id: 2,
      title: 'Azure Portal & Setup Basics',
      icon: '🎛️',
      duration: '2 hours',
      difficulty: 'Beginner',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Navigating Azure Portal',
          description: 'Azure Portal is your control center - a website where you create and manage all your AI services. Think of it as the "admin panel" for Azure.',
          analogy: '🎮 Like a video game dashboard: Portal is your main menu. You see your resources (services), create new ones, check bills, and configure settings. Everything in one place!',
          keyPoints: [
            'Portal = Web interface at portal.azure.com',
            'Dashboard = Your customizable home page',
            'Resource Group = Folder to organize related services',
            'Subscription = Your billing account (like a credit card)',
            'Search bar = Quickest way to find anything (Ctrl+/)'
          ],
          example: '⚡ Pro Tip: Use Search (top bar) for everything! Type "Cognitive Services" and press Enter. WAY faster than clicking through menus!',
          completed: false
        },
        {
          id: 2,
          name: 'Creating Your First AI Resource',
          description: 'Step-by-step: How to create a Cognitive Services resource. This is THE most important practical skill - you\'ll do this in the exam!',
          analogy: '🏗️ Like renting an apartment: Pick location (region), choose size (pricing tier), sign contract (create resource), get keys (access credentials). Then you can move in (use the service)!',
          keyPoints: [
            '1️⃣ Search for service (e.g., "Computer Vision")',
            '2️⃣ Click Create → Fill form (name, region, tier)',
            '3️⃣ Resource Group = Create new or use existing',
            '4️⃣ Region = Where servers run (choose closest for speed)',
            '5️⃣ Pricing Tier = Free (F0) for learning, Standard (S0) for production',
            '6️⃣ Review + Create → Wait 1 min → Done!'
          ],
          example: '🎯 Exam Scenario: "You need to create a Computer Vision resource in East US with Standard pricing. What steps?" → Know this process cold! Practice 5 times.',
          stepByStep: [
            '1️⃣ Open Azure Portal (portal.azure.com) and sign in',
            '2️⃣ Click "+ Create a resource" button at top left',
            '3️⃣ Search for "Computer Vision" in the search box',
            '4️⃣ Click "Computer Vision" from results → Click "Create"',
            '5️⃣ Fill out the form:\n   - Subscription: Select your subscription\n   - Resource Group: Create new or select existing\n   - Region: Choose Azure region (e.g., East US)\n   - Name: Give it a unique name (e.g., my-vision-service)\n   - Pricing Tier: Select F0 (free) or S0 (standard)',
            '6️⃣ Click "Review + Create" button at bottom',
            '7️⃣ Review your settings and click "Create"',
            '8️⃣ Wait 1-2 minutes for deployment to complete',
            '9️⃣ Click "Go to resource" to see your new service',
            '🔟 Click "Keys and Endpoint" in left menu to get access credentials',
            '⚠️ IMPORTANT: Copy Key1 and Endpoint URL - you\'ll need these to make API calls!',
            '💡 TIP: Create a test resource first to practice before the exam'
          ],
          codeExample: `/* After creating your resource, here's how to use it */

// 1. Get your credentials from Azure Portal
const endpoint = "https://my-vision-service.cognitiveservices.azure.com/";
const key = "abc123def456..."; // Your Key1 from portal

// 2. Make your first API call  
const imageUrl = "https://example.com/photo.jpg";

fetch(endpoint + "vision/v3.2/analyze?visualFeatures=Description", {
  method: "POST",
  headers: {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ url: imageUrl })
})
.then(response => response.json())
.then(data => {
  console.log("Success!", data.description.captions[0].text);
})
.catch(error => {
  console.error("Error:", error);
});

/* That's it! You just used AI to analyze an image! 🎉 */`,
          completed: false
        },
        {
          id: 3,
          name: 'Understanding Keys & Endpoints',
          description: 'Every AI service gives you 2 keys and 1 endpoint. These are like username+password to access the service. NEVER share your keys publicly!',
          analogy: '🔐 Like your house address and key: Endpoint = Address (where the house is). Key = Physical key (to unlock door). You need BOTH to get in!',
          keyPoints: [
            'Endpoint = URL like "https://myservice.cognitiveservices.azure.com"',
            'Key1 & Key2 = Two identical passwords (use either one)',
            'Why 2 keys? So you can rotate security (regenerate Key1 while still using Key2)',
            'Put in Headers: Ocp-Apim-Subscription-Key: YOUR_KEY',
            'Keep keys SECRET! Use Azure Key Vault in production'
          ],
          example: '⚠️ Common Mistake: Hardcoding keys in code and pushing to GitHub. NEVER DO THIS! Use environment variables or Key Vault. Keys on GitHub = instant hack!',
          completed: false
        },
        {
          id: 4,
          name: 'Resource Groups & Organization',
          description: 'Resource Groups are folders for your Azure stuff. Like organizing files on your computer - keep related things together!',
          analogy: '📁 Like organizing your closet: Instead of throwing all clothes on the floor, you have drawers - one for shirts, one for pants. Resource Groups are drawers for your AI services!',
          keyPoints: [
            'Resource Group = Container for related resources',
            'Best Practice: One RG per project/environment',
            'Example: "MyApp-Dev-RG" for dev, "MyApp-Prod-RG" for production',
            'Deleting RG = Deletes EVERYTHING inside (careful!)',
            'Tags help find resources (like labels: "Department=IT")'
          ],
          example: '💡 Smart Setup: Create RG "AI-Learning-RG" for all practice resources. When done learning, delete ONE resource group = delete everything = no surprise bills!',
          completed: false
        },
        {
          id: 5,
          name: 'Free Tier vs Paid Tiers',
          description: 'Understanding pricing tiers is CRUCIAL for exam and real work. Free tier is perfect for learning but has limits!',
          analogy: '🎮 Like game trial versions: Free = Limited features but good to try. Standard = Full game. Premium = Extra power for big companies. Choose based on your needs!',
          keyPoints: [
            'F0 (Free) = 5,000-20,000 calls/month (varies by service) = Perfect for learning!',
            'S0 (Standard) = Pay per transaction, no monthly limit',
            'S1, S2, S3 = More expensive but faster/more features',
            'Free tier = 1 per subscription (can\'t create 2 free vision services)',
            'Quotas = Rate limits (e.g., 20 calls per minute on free tier)'
          ],
          example: '🎓 Exam Scenario: "Need to support 1 million API calls/month" → Free tier insufficient (only 20K/month). Must use Standard tier! Know these numbers!',
          completed: false
        }
      ]
    },
    {
      id: 3,
      title: 'Azure Cognitive Services Overview',
      icon: '🧠',
      duration: '2 hours',
      difficulty: 'Beginner',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'What are Cognitive Services?',
          description: 'Azure Cognitive Services are pre-built AI tools you can use via simple API calls. No PhD required - Microsoft trained the AI, you just use it!',
          analogy: '🏪 Think of Cognitive Services as a shopping mall: Instead of building your own stores (AI models) from scratch, you visit different specialized shops (APIs) - a vision store, a language store, a speech store. Each shop is maintained by experts (Microsoft), and you just pick what you need!',
          keyPoints: [
            'Pre-built AI capabilities accessible via REST APIs',
            'No need for machine learning expertise',
            'Scalable and secure cloud-based services',
            'Pay-as-you-go pricing model',
            'Supports multiple programming languages'
          ],
          example: '🚀 Quick Win: Instead of training your own image recognition model (takes months + PhD), use Computer Vision API to identify objects in photos within 5 minutes! Just send image URL, get JSON response.',
          completed: false
        },
        {
          id: 2,
          name: 'Service Categories - The Big Picture',
          description: 'Cognitive Services are organized into 5 main families. Think of them as different departments in a company - each specializes in different AI skills!',
          analogy: '🎯 Imagine a Swiss Army knife with 5 main tools: 1) Vision blade (sees images), 2) Speech screwdriver (hears/speaks), 3) Language scissors (understands text), 4) Decision magnifying glass (makes smart choices), 5) OpenAI rocket (advanced AI). Each tool has a specific job!',
          keyPoints: [
            '👁️ Vision = Analyzing images & videos (Computer Vision, Face, Custom Vision)',
            '🎤 Speech = Audio processing (Speech-to-Text, Text-to-Speech, Translation)',
            '💬 Language = Understanding text (Text Analytics, Translator, LUIS, QnA)',
            '🎲 Decision = Making smart choices (Anomaly Detector, Personalizer, Content Moderator)',
            '🤖 Azure OpenAI = Advanced AI (GPT, DALL-E, Embeddings)'
          ],
          example: '🎯 Real Project: Building a customer service bot? You need: Language (understand customer text) + Speech (voice calls) + Decision (personalize responses). Mix and match!',
          completed: false
        },
        {
          id: 3,
          name: 'Multi-Service vs Single-Service Resources',
          description: 'You can create ONE resource for ALL services (multi-service) or separate resources for each service (single-service). Exam loves this topic!',
          analogy: '🎫 Theme park analogy: Multi-service = All-park pass (one ticket for all rides). Single-service = Individual ride tickets (one ticket per ride). Multi is convenient, single gives more control!',
          keyPoints: [
            'Multi-Service Resource = Access to ALL Cognitive Services with ONE key',
            'Single-Service = One resource per service (separate keys)',
            'Multi-Service Pros: Simpler management, one bill',
            'Single-Service Pros: Better cost tracking, isolated keys',
            'Exam Tip: Multi-service called "Cognitive Services" in portal'
          ],
          example: '💡 When to use which? Learning/Small apps → Multi-service (easier). Production/Enterprise → Single-service (better security & tracking).',
          completed: false
        },
        {
          id: 4,
          name: 'Authentication & Keys Deep Dive',
          description: 'Security is HUGE in Azure! Understanding authentication methods is critical for AI-102 exam. Keys are simplest, but Azure AD is more secure.',
          analogy: '🔑 Like entering a building: Key-based = Physical key (simple but if lost, anyone can enter). Azure AD = ID badge + face scan (harder to steal, can be revoked instantly).',
          keyPoints: [
            'Key-Based = Simple: Add "Ocp-Apim-Subscription-Key" header',
            'Azure AD Token = More secure: Get token, use in "Authorization" header',
            'Managed Identity = Best for Azure resources (no keys in code!)',
            'Keys in code = BAD! Use Key Vault or environment variables',
            'Rate Limiting = API rejects request if you call too fast'
          ],
          example: '⚠️ Exam Trap: "Most secure way to authenticate?" → Managed Identity (not keys!). "Quickest to implement for testing?" → Keys. Know the tradeoffs!',
          completed: false
        },
        {
          id: 5,
          name: 'Request & Response Format',
          description: 'All Cognitive Services use REST API with JSON. Understanding the structure is essential - you\'ll see this in EVERY code example!',
          analogy: '📮 Like sending a letter: Request = Your letter (question). You write: To (endpoint), Stamp (key), Message (JSON body). Response = Reply letter back with answer!',
          keyPoints: [
            'Request = HTTP POST/GET with headers + JSON body',
            'Headers ALWAYS need: "Ocp-Apim-Subscription-Key" and "Content-Type: application/json"',
            'Response = JSON with results + confidence scores',
            'Status Codes: 200 = Success, 401 = Bad key, 429 = Too many requests',
            'Error messages in response body help debug'
          ],
          example: '🔥 Pro Tip: Test APIs with Postman first! Set up request once, save it, reuse forever. Learn headers/body format before writing code.',
          completed: false
        }
      ]
    },
    {
      id: 4,
      title: 'Computer Vision - See Like AI',
      icon: '👁️',
      duration: '4 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Image Analysis Fundamentals',
          description: 'Computer Vision can look at an image and tell you what\'s in it - objects, colors, people, brands, even generate captions! All with one API call.',
          analogy: '📸 Like having a super-observant friend describe a photo: "I see 3 people wearing red shirts, 2 dogs, lots of green trees, blue sky, and it looks like a sunny park picnic!" Computer Vision does this automatically in 1 second!',
          keyPoints: [
            'analyzeImage API = Main endpoint for image analysis',
            'Visual Features: objects, tags, description, faces, colors, brands',
            'Confidence scores = How sure AI is (0.0 to 1.0)',
            'Can analyze from URL or upload byte array',
            'Works with JPEG, PNG, GIF, BMP formats'
          ],
          example: '💼 E-commerce Use Case: Upload product photo → API returns "Blue Nike running shoes, outdoor setting, athletic wear" → Auto-tag products without manual work!',
          completed: false
        },
        {
          id: 2,
          name: 'OCR (Optical Character Recognition) - Read Text',
          description: 'Extract text from images and PDFs. Works with printed AND handwritten text in 100+ languages. Game-changer for document processing!',
          analogy: '📖 Like a scanner with brain: Normal scanner = Just take picture of paper. OCR = Takes picture AND types out all text for you! Even reads messy handwriting and tilted images!',
          keyPoints: [
            'Read API = Modern, async approach for large documents',
            'OCR API = Quick, sync approach for small images',
            'Supports 100+ languages including Chinese, Arabic, Japanese',
            'Preserves text layout and bounding boxes',
            'Handles rotated/skewed images automatically'
          ],
          example: '📄 Real-World Magic: Snap photo of restaurant menu → OCR extracts all dishes → Translate to your language → Read in your preferred tongue! All in 3 API calls!',
          completed: false
        },
        {
          id: 3,
          name: 'Authentication & Keys',
          description: 'Secure your Cognitive Services using subscription keys or Azure Active Directory authentication.',
          analogy: '🔑 Like hotel room keys: You get a key (API key) at check-in that grants access to your room (resources). Keep it safe! You can also use your ID card (Azure AD token) for added security.',
          keyPoints: [
            'Each service has endpoint URL and subscription key',
            'Keys can be regenerated for security',
            'Use Azure Key Vault to store keys securely',
            'Managed Identity for authentication without keys',
            'Rate limits based on pricing tier'
          ],
          example: 'Example: Store your API keys in Azure Key Vault and reference them in your app using Managed Identity - no hardcoded secrets!',
          completed: false
        }
      ]
    },
    {
      id: 2,
      title: 'Computer Vision',
      icon: '👁️',
      duration: '4 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Image Analysis',
          description: 'Extract rich information from images including objects, faces, colors, and even generate captions.',
          analogy: '📸 Like having a super-observant friend look at a photo: They tell you "I see 3 people, 2 dogs, lots of green trees, and it looks like a sunny park picnic!" That\'s what Image Analysis does automatically.',
          keyPoints: [
            'Detect objects and their locations',
            'Identify brands and landmarks',
            'Generate human-readable captions',
            'Extract color schemes and image types',
            'Content moderation for adult/racy content'
          ],
          example: 'Example: Analyze product photos to automatically tag e-commerce items: "Blue Nike running shoes, size 10, outdoor setting".',
          completed: false
        },
        {
          id: 2,
          name: 'Optical Character Recognition (OCR)',
          description: 'Extract printed and handwritten text from images and documents.',
          analogy: '📖 Like a scanner that not only copies but UNDERSTANDS text: It can read a restaurant menu photo and tell you what dishes are available, even if the handwriting is messy!',
          keyPoints: [
            'Read API for printed and handwritten text',
            'Support for 100+ languages',
            'Preserve text layout and structure',
            'Handle skewed or rotated images',
            'Extract text from receipts, forms, documents'
          ],
          example: 'Example: Scan business cards with your phone and automatically extract name, email, phone to contacts.',
          completed: false
        },
        {
          id: 3,
          name: 'Face Detection & Analysis',
          description: 'Detect human faces in images and analyze attributes like age, emotion, accessories. Note: Face Recognition (identifying specific people) has restrictions - study responsible AI!',
          analogy: '👤 Like a bouncer at a club who\'s REALLY observant: "You\'re about 25 years old, wearing glasses, smiling (happy emotion), have a beard. You look similar to this person from yesterday."',
          keyPoints: [
            'Face Detection = Find faces + bounding boxes (where face is)',
            'Face Attributes = Age, emotion, glasses, hair, makeup, facial hair',
            'Emotions = Happiness, sadness, anger, surprise, fear, contempt, disgust, neutral',
            'Face Recognition = Match faces (RESTRICTED - need approval from Microsoft)',
            'Limited Access: You can\'t just use Face Recognition - need to apply!'
          ],
          example: '⚠️ EXAM IMPORTANT: Know the difference! Face DETECTION (finding faces) = Anyone can use. Face RECOGNITION (identifying people) = Restricted, requires Microsoft approval. This is a frequent exam question!',
          completed: false
        },
        {
          id: 4,
          name: 'Custom Vision - Train Your Own Models',
          description: 'When pre-built models aren\'t enough, Custom Vision lets you train AI on YOUR images for YOUR specific needs. No coding ML required!',
          analogy: '🎓 Like teaching a kid with flashcards: Show 50 photos of "Good Parts" and 50 of "Defective Parts", kid learns the difference. Custom Vision learns from YOUR images, so it knows YOUR stuff!',
          keyPoints: [
            'Classification = "What is this?" (entire image is one thing)',
            'Object Detection = "Where are things?" (multiple objects with locations)',
            'Upload images → Tag them → Click Train → Done!',
            'Minimum: 15 images per tag (more = better accuracy)',
            'Export to mobile: TensorFlow, CoreML, ONNX'
          ],
          example: '🏭 Factory Example: Train model on YOUR assembly line parts. General AI doesn\'t know your specific products, but Custom Vision learns: "This is normal", "This is defect type A", "This is defect type B".',
          completed: false
        },
        {
          id: 5,
          name: 'Video Analysis Basics',
          description: 'Video Indexer analyzes videos - extracts faces, speech, text, brands, sentiment. Like having an AI watch videos and take detailed notes!',
          analogy: '🎬 Like hiring someone to watch ALL your company videos and create a searchable database: "Show me all videos where John appears and the word \'budget\' is mentioned." AI watches, you search!',
          keyPoints: [
            'Video Indexer = Separate service from Computer Vision',
            'Extracts: Audio transcription, OCR, face detection, topics, sentiment',
            'Timeline-based: Know when things appear in video',
            'Search videos by searching text transcript',
            'Great for media companies, education, security'
          ],
          example: '📺 Media Company: Upload 1000 hours of footage → Video Indexer indexes everything → Search "show me scenes with red cars in Paris" → Get instant results! No manual watching!',
          completed: false
        },
        {
          id: 6,
          name: 'Common Pitfalls & Best Practices',
          description: 'Learn from others\' mistakes! These are the TOP issues developers face with Computer Vision.',
          analogy: '🚨 Like learning to drive: Better to learn from others\' crashes than crash yourself! Here are the "potholes" to avoid.',
          keyPoints: [
            '❌ Forgetting image size limits (4MB for CV, 20MB for Custom Vision)',
            '❌ Not handling confidence scores (threshold at 0.7 for production)',
            '❌ Sending same image repeatedly (cache results!)',
            '❌ Not optimizing image size (resize before sending = faster + cheaper)',
            '✅ Always check error responses and status codes',
            '✅ Use batch processing for many images (not one-by-one)'
          ],
          example: '💸 Cost Saving Tip: Resize images to 800px width before analysis. A 4000px image costs same as 800px but takes longer! Resize = Save time AND money!',
          completed: false
        }
      ]
    },
    {
      id: 5,
      title: 'Natural Language Processing (NLP)',
      icon: '💬',
      duration: '5 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Text Analytics Basics',
          description: 'Extract insights from text: Is this review positive or negative? What are the key topics? What entities are mentioned? All automatically!',
          analogy: '🔍 Like a super-smart intern reading customer reviews: They highlight important phrases, circle names/places, and summarize "90% of reviews are positive, main complaint is shipping speed."',
          keyPoints: [
            'Sentiment Analysis = Positive/Negative/Neutral + confidence',
            'Key Phrase Extraction = Important words/phrases',
            'Named Entity Recognition (NER) = People, places, organizations, dates',
            'Language Detection = Auto-detect 120+ languages',
            'Opinion Mining = Aspect-based sentiment (likes price, hates shipping)'
          ],
          example: '⭐ Product Review Example: "The shoes are amazing quality but arrived late" → Sentiment: Mixed. Entities: "shoes". Key Phrases: "amazing quality", "arrived late". Opinion: Product=Positive, Shipping=Negative.',
          completed: false
        },
        {
          id: 2,
          name: 'LUIS (Language Understanding) Explained Simply',
          description: 'LUIS = Teaching AI to understand what users MEAN (intent) and extract important INFO (entities). Foundation of every chatbot!',
          analogy: '🎯 Like training a restaurant waiter: Customer says "Get me a large pepperoni pizza" → Waiter understands: INTENT=OrderPizza, SIZE=Large, TOPPING=Pepperoni. LUIS does this for your app!',
          keyPoints: [
            'Intent = What user WANTS to do (OrderPizza, CheckWeather, BookFlight)',
            'Entity = Important data pieces (Date, Location, Size, Name)',
            'Utterance = Example phrases users might say',
            'Training = Show LUIS 15+ example utterances per intent',
            'Active Learning = LUIS gets smarter as people use it'
          ],
          example: '🤖 Chatbot Workflow: User: "Book me a flight to Paris next Friday" → LUIS extracts: Intent=BookFlight, Destination=Paris, Date=NextFriday → Your code books the flight!',
          completed: false
        },
        {
          id: 4,
          name: 'Custom Vision',
          description: 'Train your own image classification and object detection models without coding.',
          analogy: '🎓 Like teaching a child: Show them 50 photos of apples and 50 photos of oranges, and they learn to tell them apart. Custom Vision learns from YOUR images for YOUR specific needs!',
          keyPoints: [
            'Upload and tag your own training images',
            'No machine learning expertise required',
            'Export models to mobile (TensorFlow, CoreML)',
            'Supports classification and object detection',
            'Active learning: improve over time'
          ],
          example: 'Example: Train a model to detect defects in manufactured parts specific to your factory assembly line.',
          completed: false
        }
      ]
    },
    {
      id: 3,
      title: 'Natural Language Processing',
      icon: '💬',
      duration: '5 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Text Analytics',
          description: 'Extract insights from text including sentiment, key phrases, entities, and language detection.',
          analogy: '🔍 Like a literary critic reading reviews: They can tell if the review is positive or negative (sentiment), highlight important points (key phrases), and identify names of people/places (entities).',
          keyPoints: [
            'Sentiment analysis: positive/negative/neutral',
            'Key phrase extraction',
            'Named entity recognition (people, places, organizations)',
            'Language detection (120+ languages)',
            'Opinion mining for aspect-based sentiment'
          ],
          example: 'Example: Analyze customer reviews to find most-mentioned product features and whether feedback is positive or negative.',
          completed: false
        },
        {
          id: 2,
          name: 'Language Understanding (LUIS)',
          description: 'Build natural language understanding into apps to interpret user intentions and extract information.',
          analogy: '🎯 Like a smart assistant that understands intent: When you say "Book me a flight to Paris next Friday," it knows you want to travel (intent), destination is Paris (entity), and date is Friday (entity).',
          keyPoints: [
            'Define intents (user goals)',
            'Extract entities (important data)',
            'Train with example utterances',
            'Continuous improvement with active learning',
            'Multi-language support'
          ],
          example: 'Example: Build a pizza ordering bot that understands "Get me a large pepperoni pizza" → Intent: OrderPizza, Size: Large, Topping: Pepperoni.',
          completed: false
        },
        {
          id: 3,
          name: 'Translator Service - Break Language Barriers',
          description: 'Translate text between 100+ languages instantly! Supports neural translation (more natural), custom dictionaries, and even transliteration.',
          analogy: '🌍 Like having a multilingual friend who\'s also a poet: They don\'t just translate word-for-word (Google Translate old style), they understand CONTEXT and TONE, making it sound natural!',
          keyPoints: [
            'Supports 100+ languages with neural translation',
            'Auto-detect source language (no need to specify)',
            'Custom Translator = Train on YOUR terminology/style',
            'Transliteration = Convert scripts (Arabic → Latin letters)',
            'Dictionary Lookup = Get alternative translations'
          ],
          example: '🌐 Customer Support: Customer writes in Spanish → API translates to English → Agent replies in English → API translates back to Spanish → Customer sees Spanish! All automatic!',
          completed: false
        },
        {
          id: 4,
          name: 'Question Answering (QnA Maker)',
          description: 'Turn your documents/FAQs into a smart Q&A bot! Upload docs, AI extracts question-answer pairs, users ask questions in natural language.',
          analogy: '📚 Like a librarian who memorized your entire company handbook: User asks "What\'s the vacation policy?", librarian instantly quotes the exact section. QnA does this for ANY document!',
          keyPoints: [
            'Import FAQs, manuals, SharePoint, URLs automatically',
            'AI auto-extracts Q&A pairs (you can edit them)',
            'Supports multi-turn conversations (follow-up questions)',
            'Add "chitchat" personality (friendly/professional/witty)',
            'Active Learning = Improves from user interactions'
          ],
          example: '💼 HR Bot Example: Upload employee handbook → QnA extracts 50 Q&A pairs → Employee asks "How many sick days?" → Bot replies instantly with exact policy! No HR staff needed for common questions.',
          completed: false
        },
        {
          id: 5,
          name: 'Understanding Confidence Scores',
          description: 'ALL NLP services return confidence scores (0-100%). This tells you how "sure" the AI is. Always check before trusting results!',
          analogy: '🎯 Like a student\'s certainty: "I\'m 95% sure Paris is in France" vs "I think...maybe...60% sure...Paris is in Spain?". Higher confidence = More reliable!',
          keyPoints: [
            'Confidence Score = 0.0 to 1.0 (or 0% to 100%)',
            'Above 0.7 (70%) = Generally reliable for production',
            '0.5-0.7 = Maybe correct, need human review',
            'Below 0.5 = Probably wrong, don\'t trust it!',
            'ALWAYS implement threshold checks in production'
          ],
          example: '⚠️ Production Rule: if (confidence < 0.7) { sendToHumanAgent(); } else { useAIResponse(); } Never blindly trust AI! Always have fallback.',
          completed: false
        },
        {
          id: 6,
          name: 'Common NLP Challenges & Solutions',
          description: 'NLP is HARD! Language is messy, ambiguous, context-dependent. Learn the common pitfalls and how to handle them.',
          analogy: '🧩 Like understanding sarcasm: "Oh great, another meeting" - Is this excited or annoyed? Humans use context, tone, history. AI struggles with these! You need to help it.',
          keyPoints: [
            '❌ Sarcasm detection is still poor (AI takes things literally)',
            '❌ Out-of-domain queries confuse models (LUIS trained on food = bad at tech)',
            '❌ Rare words/slang often misunderstood',
            '✅ Solution: Train on diverse examples including edge cases',
            '✅ Always have "None" intent in LUIS (catch-all)',
            '✅ Implement confidence thresholds and human escalation'
          ],
          example: '🎓 Exam Scenario: "Why does LUIS misclassify?" → Not enough training examples, ambiguous utterances, overlapping intents. Know these causes!',
          completed: false
        }
      ]
    },
    {
      id: 6,
      title: 'Speech Services - Hear & Speak',
      icon: '🎤',
      duration: '3 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Speech-to-Text (STT) Basics',
          description: 'Convert spoken audio to written text. Works in real-time (live transcription) or batch (recorded files). Supports 100+ languages!',
          analogy: '✍️ Like a super-fast typist who listens to conversations: As people talk, they type everything word-for-word in real-time. Even works with accents, background noise, multiple speakers!',
          keyPoints: [
            'Real-time = Transcribe as people speak (streaming)',
            'Batch = Transcribe pre-recorded audio files',
            'Speaker Diarization = "Who said what?" (identify different speakers)',
            'Custom Speech = Train on YOUR vocabulary/accent',
            'Profanity filtering, punctuation, timestamps included'
          ],
          example: '🎙️ Meeting Transcription: Record 1-hour meeting → Send to STT API → Get full transcript with speaker labels → Searchable meeting notes! No manual typing!',
          completed: false
        },
        {
          id: 2,
          name: 'Text-to-Speech (TTS) - Make AI Talk',
          description: 'Convert written text to natural-sounding speech. Choose from 100+ voices across languages, genders, ages. Can control emotion and speaking style!',
          analogy: '🗣️ Like hiring professional voice actors on-demand: Instead of recording audio yourself, just type text, pick a voice (male/female, age, accent), AI speaks it naturally!',
          keyPoints: [
            'Neural Voices = Sound incredibly human (vs old robotic voices)',
            'SSML (Speech Synthesis Markup Language) = Control pitch, speed, pauses',
            'Multiple voices per language (news reader, friendly, formal)',
            'Custom Neural Voice = Clone YOUR voice (requires samples)',
            'Visemes = Lip-sync data for animation'
          ],
          example: '📖 Audiobook Creator: Type book text → Choose "Jenny Neural" voice → Generate entire audiobook! Adjust speed, add pauses, emphasize words with SSML.',
          completed: false
        },
        {
          id: 3,
          name: 'Speech Translation - Real-Time Language Bridge',
          description: 'Translate spoken language in real-time! Someone speaks Chinese, you hear English. Like having a UN interpreter in your pocket!',
          analogy: '🎧 Like magic earbuds at UN conference: Speaker talks Japanese → You hear English in real-time → You reply in English → They hear Japanese! All instant!',
          keyPoints: [
            'Supports 30+ languages for speech translation',
            'Can output as text OR synthesized speech',
            'Low latency (< 3 seconds)',
            'Preserves speaker\'s tone and intent',
            'Useful for: Meetings, customer service, education'
          ],
          example: '🌍 International Call Center: Customer calls in Spanish → System translates to English for agent → Agent speaks English → Customer hears Spanish! Same conversation, two languages!',
          completed: false
        },
        {
          id: 4,
          name: 'Custom Speech & Pronunciation',
          description: 'When standard models struggle with YOUR domain (medical terms, brand names, acronyms), train Custom Speech on your audio data.',
          analogy: '🏥 Like teaching a transcriber medical terms: Standard: "Patient has CABBAGE" (wrong!). Custom trained: "Patient has CABG" (correct!). Custom models know YOUR vocabulary.',
          keyPoints: [
            'Use Custom Speech when standard models fail on domain terms',
            'Requires: Audio files + transcripts for training',
            'Improves accuracy 15-30% on domain-specific content',
            'Common use: Medical, legal, technical fields',
            'Pronunciation customization for brand names'
          ],
          example: '🎯 Medical Example: Train STT on 100 hours of doctor recordings → Model learns "dyspnea", "auscultation", drug names → Accuracy jumps from 60% to 90%!',
          completed: false
        },
        {
          id: 5,
          name: 'Audio Formats & Best Practices',
          description: 'Not all audio files work! Learn supported formats, optimal settings, and how to avoid common audio issues.',
          analogy: '🎵 Like recording quality: Old phone recording in noisy room = Bad transcription. Studio mic in quiet room = Perfect transcription. Audio quality matters!',
          keyPoints: [
            'Best format: WAV, 16kHz, 16-bit, mono channel',
            'Supported: WAV, MP3, OGG, FLAC',
            'Clear audio = Better results (avoid background noise)',
            'Louder isn\'t better (normal speaking volume optimal)',
            'Batch processing for files, streaming for real-time'
          ],
          example: '⚡ Quick Fix: Bad transcription? → Check audio: Is it 16kHz? Mono? Low noise? Fix audio format, retry → Accuracy improves!',
          completed: false
        }
      ]
    },
    {
      id: 7,
      title: 'Azure OpenAI Service - The Future',
      icon: '🤖',
      duration: '4 hours',
      difficulty: 'Advanced',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'What is Azure OpenAI? (Game Changer!)',
          description: 'Azure OpenAI = Microsoft hosts OpenAI\'s powerful models (GPT, DALL-E) in Azure! Get enterprise security + Azure integration with bleeding-edge AI.',
          analogy: '🎮 Like getting the latest PlayStation game, but running on a super-secure enterprise server: Same amazing AI (GPT-4), but with Azure security, compliance, scaling. Best of both worlds!',
          keyPoints: [
            'Same models as ChatGPT, but enterprise-ready',
            'GPT-3.5 & GPT-4 for text generation',
            'DALL-E for image generation',
            'Embeddings for semantic search',
            'Need APPROVAL from Microsoft (not instant access)'
          ],
          example: '🔐 Why Azure OpenAI vs OpenAI direct? Azure = Your data stays private, enterprise SLAs, GDPR compliant, integrates with Azure. OpenAI direct = public, shared infrastructure.',
          completed: false
        },
        {
          id: 2,
          name: 'GPT Models - Understanding the Magic',
          description: 'GPT (Generative Pre-trained Transformer) = AI that generates human-like text. Can chat, write code, summarize, translate, and more!',
          analogy: '🧙 Like a genius intern who read the entire internet: Ask them anything, they give detailed answers. Write them instructions, they follow. They learn fast (few-shot learning)!',
          keyPoints: [
            'GPT-3.5 = Fast, cheap, good for most tasks',
            'GPT-4 = Smarter, more accurate, more expensive',
            'Temperature = Creativity (0=boring, 1=creative)',
            'Max Tokens = How long response can be',
            'System Message = Behavior instructions ("Act as...")'
          ],
          example: '💻 Code Helper: Prompt: "Write Python function to sort list" → GPT generates working code + explanation! Not perfect, but 80% there. Review, adjust, done!',
          completed: false
        },
        {
          id: 3,
          name: 'Prompt Engineering - The New Skill',
          description: 'Prompt = How you ask GPT to do something. Good prompt = Great results. Bad prompt = Garbage. This is an ART and SCIENCE!',
          analogy: '💡 Like asking a genie for wishes: "Give me money" (bad) → Genie gives Monopoly money. "Give me $1 million USD in my bank account" (specific) → Better! Be SPECIFIC with AI!',
          keyPoints: [
            '✅ Be specific: "Write 5 bullet points" vs "Write some points"',
            '✅ Provide context: "You are a Python expert. Write..."',
            '✅ Give examples (few-shot): Show 2 examples, AI follows pattern',
            '✅ Use delimiters: """User input here""" (prevents prompt injection)',
            '❌ Avoid: Vague instructions, ambiguous terms, no structure'
          ],
          example: '🎯 Bad: "Explain AI" → Gets generic answer. Good: "Explain Azure AI-102 Cognitive Services to a beginner in 3 bullet points with analogies" → Perfect, focused answer!',
          completed: false
        },
        {
          id: 4,
          name: 'Embeddings - Understanding Meaning',
          description: 'Embeddings = Convert text to numbers (vectors) that represent MEANING. Similar meanings = Similar numbers. Foundation of semantic search!',
          analogy: '🗺️ Like plotting words on a map: Words with similar meanings are close together. "King" near "Queen", "Paris" near "France". This lets you find "similar" content!',
          keyPoints: [
            'Embedding = Array of numbers representing text meaning',
            'Typical size: 1536 dimensions (1536 numbers per text)',
            'Use for: Similarity search, recommendations, clustering',
            'OpenAI Embeddings = Very good at capturing meaning',
            'Much cheaper than GPT for simple similarity checks'
          ],
          example: '🔍 Smart Search Example: User searches "car problems" → Convert to embedding → Find similar docs (may say "automobile issues", "vehicle troubles") → Semantic search, not just keyword!',
          completed: false
        },
        {
          id: 5,
          name: 'DALL-E - Text to Images',
          description: 'Type a description, get AI-generated image! From simple "red apple" to complex "astronaut riding horse on Mars, oil painting style".',
          analogy: '🎨 Like commissioning an artist instantly: Instead of weeks + thousands of dollars, type what you want → Get custom image in 30 seconds! Not perfect, but pretty good!',
          keyPoints: [
            'DALL-E 2 & 3 available in Azure',
            'Generate from text descriptions',
            'Edit existing images with AI',
            'Create variations of images',
            'Content filtering (blocks inappropriate requests)'
          ],
          example: '🖼️ Marketing Use: Need product mockup? "Modern smartphone on wooden desk with coffee, morning light, professional photography style" → AI generates multiple options!',
          completed: false
        },
        {
          id: 6,
          name: 'Tokens & Pricing - Know Your Costs!',
          description: 'Azure OpenAI charges by TOKENS, not API calls! Token = chunk of text (~4 characters). Understanding tokens is KEY to managing costs!',
          analogy: '💰 Like paying for pizza by the slice: 1 call with 100 slices (tokens) costs same as 100 calls with 1 slice each. It\'s total slices that matter, not number of orders!',
          keyPoints: [
            'Token ≈ 4 characters or ¾ word',
            '"Hello World!" ≈ 3 tokens',
            'Both INPUT and OUTPUT tokens cost money!',
            'GPT-4 = ~30x more expensive than GPT-3.5',
            'Use tiktoken library to count tokens before calling'
          ],
          example: '⚠️ Cost Control: Sending entire PDF (10K tokens) + getting summary (500 tokens) = 10,500 tokens charged. Optimize: Summarize chunks = Save 80% cost!',
          completed: false
        }
      ]
    },
    {
      id: 8,
      title: 'Conversational AI & Bots',
      icon: '💬',
      duration: '4 hours',
      difficulty: 'Advanced',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Bot Framework Overview',
          description: 'Azure Bot Service = Complete platform to build, test, deploy chatbots. Works across channels (Teams, Slack, Web) with ONE codebase!',
          analogy: '🤝 Like building a receptionist for ALL your offices: One receptionist (bot), but they work at reception desk (web), phone system (Teams), text messaging (SMS). Same brain, multiple interfaces!',
          keyPoints: [
            'Bot Framework SDK = Libraries to build bots (Node.js, C#, Python)',
            'Bot Framework Composer = Visual designer (no code!)',
            'Channels = Where bot lives (Teams, Slack, Facebook, web)',
            'Direct Line = Connect custom app to bot',
            'All managed in Azure Bot Service'
          ],
          example: '🏢 Enterprise Bot: Build ONCE → Deploy to: Company website, Microsoft Teams for employees, Telegram for customer support. Same bot, 3 platforms!',
          completed: false
        },
        {
          id: 2,
          name: 'Dialog Management - Conversation Flow',
          description: 'Dialogs = Conversation scripts. Guide users through multi-step processes while handling interruptions and context.',
          analogy: '🎭 Like a theater script with improvisation: Main script (dialog flow), but actors (users) sometimes go off-script. Good dialog handles both!',
          keyPoints: [
            'Waterfall Dialog = Step-by-step conversation (linear)',
            'Component Dialog = Reusable conversation pieces',
            'Adaptive Dialog = Smart branching (if-then logic)',
            'State Management = Remember conversation context',
            'Interruptions = Handle "nevermind", "go back"'
          ],
          example: '🍕 Pizza Ordering Dialog: Step 1: Ask size → Step 2: Ask toppings → Step 3: Confirm → User interrupts "actually, change size" → Bot handles gracefully!',
          completed: false
        },
        {
          id: 3,
          name: 'State Management in Bots',
          description: 'Bots need memory! Conversation State (remembers chat), User State (remembers user info). Without state, bot has amnesia!',
          analogy: '🧠 Like short-term vs long-term memory: Conversation State = "What did we JUST talk about?" (cleared when chat ends). User State = "What\'s your name again?" (persists across sessions).',
          keyPoints: [
            'User State = Persists across conversations (name, preferences)',
            'Conversation State = Current conversation only',
            'Dialog State = Where in conversation flow',
            'Storage: Memory (testing), Azure Blob, Cosmos DB (production)',
            'Always save state after processing message!'
          ],
          example: '⚠️ Common Bug: Forgot to call saveChanges() on state → Bot forgets conversation → Asks same question repeatedly! Always save state!',
          completed: false
        },
        {
          id: 4,
          name: 'Testing & Debugging Bots',
          description: 'Bot Emulator = Desktop tool to test bots locally. See conversation, inspect state, debug issues. Essential for development!',
          analogy: '🔬 Like a flight simulator for pilots: Test bot in safe environment before deploying to real users. See what\'s happening "under the hood"!',
          keyPoints: [
            'Bot Framework Emulator = Test locally, see JSON, debug',
            'ngrok = Test bot on local machine from cloud',
            'Transcript logs = Record conversations for analysis',
            'Application Insights = Monitor production bot',
            'Test across channels before launch!'
          ],
          example: '🐛 Debug Workflow: Bot behaves weird → Run in Emulator → Inspect state after each message → Find: User state not saving → Add saveChanges() → Fixed!',
          completed: false
        },
        {
          id: 5,
          name: 'Adaptive Cards - Rich Messages',
          description: 'Adaptive Cards = Interactive cards with buttons, images, input fields. Makes bots WAY better than plain text!',
          analogy: '🎴 Like going from text messages to Instagram posts: Plain text = boring. Adaptive Cards = Images + buttons + forms. Much better UX!',
          keyPoints: [
            'JSON-based format for rich cards',
            'Work across channels (Teams, web, messaging)',
            'Support: Images, buttons, text input, dropdowns',
            'Designer tool at adaptivecards.io',
            'Make bots professional and user-friendly'
          ],
          example: '✨ Pizza Order Card: Shows image of pizza + dropdown for size + checkboxes for toppings + "Order" button. Better than text: "Reply with size and toppings"!',
          completed: false
        }
      ]
    },
    {
      id: 9,
      title: 'Responsible AI & Ethics',
      icon: '⚖️',
      duration: '2 hours',
      difficulty: 'Beginner',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Microsoft\'s 6 Principles of Responsible AI',
          description: 'Microsoft has 6 rules for ethical AI. EXAM LOVES THIS! Know all 6 and what they mean!',
          analogy: '🏛️ Like building codes for houses: Just as buildings must be safe, AI must follow these principles. Microsoft won\'t let you deploy AI that breaks them!',
          keyPoints: [
            '1️⃣ Fairness = Treat all people fairly (no discrimination)',
            '2️⃣ Reliability & Safety = AI must work correctly and safely',
            '3️⃣ Privacy & Security = Protect user data always',
            '4️⃣ Inclusiveness = Work for everyone, including disabled',
            '5️⃣ Transparency = Users know they\'re talking to AI',
            '6️⃣ Accountability = Humans responsible for AI decisions'
          ],
          example: '🎓 EXAM QUESTION (Common!): "Which principle requires telling users they\'re interacting with AI?" → Transparency! Memorize all 6!',
          completed: false
        },
        {
          id: 2,
          name: 'Understanding AI Bias',
          description: 'Bias = AI making unfair decisions based on race, gender, age, etc. Usually comes from biased training data. This is a HUGE problem!',
          analogy: '⚖️ Like a biased judge: If a judge only saw cases from rich neighborhoods, they\'d have skewed views of crime. AI trained only on one demographic = biased against others!',
          keyPoints: [
            'Training data bias → Model bias → Unfair decisions',
            'Example: Hiring AI trained on male resumes → Discriminates against women',
            'Solution: Diverse training data + testing + monitoring',
            'Use Fairlearn toolkit to detect/mitigate bias',
            'Bias can be: Gender, race, age, location-based'
          ],
          example: '🚨 Real Scandal: Amazon hiring AI rejected women because trained on 10 years of male-dominated hiring! This is why AI-102 focuses on fairness!',
          completed: false
        },
        {
          id: 3,
          name: 'Content Safety & Filtering',
          description: 'Azure Content Safety detects harmful content (violence, hate, sexual, self-harm). REQUIRED for user-generated content apps!',
          analogy: '🛡️ Like a security guard at a club: Checks everyone at the door. Inappropriate behavior? Not allowed inside! Content Safety blocks harmful content automatically.',
          keyPoints: [
            'Categories: Hate, violence, sexual, self-harm',
            'Severity levels: 0 (safe) to 6 (severe)',
            'Works for text AND images',
            'Blocklist feature for custom terms',
            'Required if your app has user input!'
          ],
          example: '🔒 Chat App: Before displaying user message, check with Content Safety → If severity > 4 → Block message, warn user. Prevents harassment!',
          completed: false
        },
        {
          id: 4,
          name: 'Transparency Notes & Model Cards',
          description: 'Documentation explaining what the AI does, limitations, appropriate use cases. USERS MUST KNOW they\'re talking to AI!',
          analogy: '📋 Like nutrition labels on food: Just as labels tell you what\'s in your food, Transparency Notes tell users what AI can/can\'t do and how it works.',
          keyPoints: [
            'Transparency = Users know it\'s AI, not human',
            'Document: What AI does, how it was trained, limitations',
            'Model Card = Summary of model capabilities',
            'Include: Intended use, out-of-scope uses, metrics',
            'Legal requirement in many jurisdictions!'
          ],
          example: '⚖️ Chatbot Example: Display "You\'re chatting with AI assistant" + warning: "AI may make mistakes. Verify important info." This is Transparency principle!',
          completed: false
        },
        {
          id: 5,
          name: 'Human-in-the-Loop & Accountability',
          description: 'AI assists, but HUMANS make final decisions for important stuff. Never let AI make life-changing decisions alone!',
          analogy: '🎯 Like a co-pilot, not an autopilot: AI helps pilot fly, but pilot (human) makes final decisions, especially in emergencies. Human is ALWAYS accountable!',
          keyPoints: [
            'High-stakes decisions = Require human approval',
            'AI provides recommendations, human decides',
            'Examples: Loan approvals, medical diagnosis, hiring',
            'Humans are accountable, not AI',
            'Design override mechanisms for users'
          ],
          example: '🏥 Medical AI: AI suggests diagnosis → Doctor reviews → Doctor makes final call → Doctor is accountable. AI is ASSISTANT, not replacement!',
          completed: false
        }
      ]
    },
    {
      id: 10,
      title: 'Monitoring & Optimization',
      icon: '📊',
      duration: '3 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Azure Monitor for Cognitive Services',
          description: 'Track API usage, errors, latency. If you don\'t monitor, you don\'t know when things break! Essential for production!',
          analogy: '🔍 Like a dashboard in your car: Speed, fuel, engine temp. Azure Monitor = Dashboard for your AI services. Know what\'s happening!',
          keyPoints: [
            'Metrics: Request count, latency, errors, throttling',
            'Logs: Detailed request/response for debugging',
            'Alerts: Get notified when errors spike',
            'Application Insights integration',
            'Set up monitoring BEFORE launch!'
          ],
          example: '🚨 Production Scenario: API suddenly slow → Check Monitor → See latency spike at 3pm → Investigate → Found: Too many requests → Add caching → Fixed!',
          completed: false
        },
        {
          id: 2,
          name: 'Cost Management & Optimization',
          description: 'AI services can get EXPENSIVE fast! Monitor costs, optimize usage, set budgets to avoid surprise $10K bills!',
          analogy: '💸 Like tracking your phone data plan: Go over limit = Big charges! Set alerts before hitting limit. Same with API calls!',
          keyPoints: [
            'Free tier = Limited calls per month (good for testing)',
            'S0 tier = Unlimited, pay-per-call (production)',
            'Set spending alerts in Azure',
            'Optimize: Cache results, batch requests, use appropriate models',
            'GPT-4 = 20-30x more expensive than GPT-3.5!'
          ],
          example: '💰 Real Cost Save: App calling API for same data repeatedly → Add Redis cache → 80% fewer API calls → Save $2000/month! Always cache!',
          completed: false
        },
        {
          id: 3,
          name: 'Performance Best Practices',
          description: 'Make AI services faster and more reliable. Users hate slow apps! Follow these patterns to optimize performance.',
          analogy: '🏎️ Like optimizing a race car: Reduce weight (smaller requests), better fuel (appropriate model), streamline shape (async calls). Every millisecond counts!',
          keyPoints: [
            'Use async/await for API calls (don\'t block)',
            'Batch requests when possible',
            'Implement retry logic with exponential backoff',
            'Cache frequent queries',
            'Use appropriate service tier for load'
          ],
          example: '⚡ Speed Optimization: Sequential API calls = 5 seconds. Parallel API calls = 1 second. Always parallelize independent calls!',
          completed: false
        },
        {
          id: 4,
          name: 'Logging & Debugging',
          description: 'Log everything! When bugs happen (and they will), logs save you. Know what to log and how to debug production issues.',
          analogy: '🕵️ Like leaving a trail of breadcrumbs: When lost, follow breadcrumbs back. Logs = Breadcrumbs for debugging. No logs = You\'re lost forever!',
          keyPoints: [
            'Log: Request ID, timestamp, input summary, response status',
            'Use Application Insights for structured logs',
            'Correlation ID to track request through systems',
            'DON\'T log sensitive data (PII, keys)',
            'Monitor error rates and trends'
          ],
          example: '🐞 Debug Example: User reports "AI gave wrong answer" → Check logs with timestamp → See exact input sent → Find: Input was truncated → Fix truncation bug!',
          completed: false
        },
        {
          id: 5,
          name: 'Security Best Practices',
          description: 'Protect your keys, endpoints, and data! Security breaches = Bad news. Follow these patterns to stay secure.',
          analogy: '🔐 Like securing your house: Don\'t leave keys under mat (hardcoded), use safe (Key Vault), lock doors (HTTPS), alarm system (monitoring)!',
          keyPoints: [
            '❌ NEVER hardcode keys in code (use Key Vault)',
            '✅ Use Managed Identity when possible (no keys needed!)',
            '✅ Always use HTTPS for API calls',
            '✅ Regenerate keys regularly',
            '✅ Restrict access with Azure RBAC'
          ],
          example: '⚠️ Horror Story: Developer committed key to GitHub → Key found by bot in 5 minutes → $5000 fraudulent usage overnight! Use Key Vault!',
          completed: false
        },
        {
          id: 6,
          name: 'Scaling & High Availability',
          description: 'Handle traffic spikes and ensure uptime. Black Friday traffic? No problem! Design for scale from day one.',
          analogy: '🏗️ Like building a bridge: Don\'t build for today\'s traffic, build for 10x traffic. Scale horizontally, use load balancers, have failover!',
          keyPoints: [
            'Use Standard tier (S0) for auto-scaling',
            'Deploy to multiple regions for redundancy',
            'Implement circuit breaker pattern',
            'Use Azure Front Door for global load balancing',
            'Test at scale BEFORE Black Friday!'
          ],
          example: '🚀 Scaling Success: Normal: 100 req/min. Black Friday: 10,000 req/min → Multi-region deployment + caching handled it → No downtime!',
          completed: false
        }
      ]
    },
    {
      id: 11,
      title: 'Exam Tips & Practice Scenarios',
      icon: '🎓',
      duration: '2 hours',
      difficulty: 'Beginner',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Common Exam Question Patterns',
          description: 'The AI-102 exam LOVES these question types. Recognize them instantly and save time!',
          analogy: '🎯 Like recognizing chess patterns: Grandmasters recognize patterns instantly. You\'ll recognize exam patterns and know the answer format immediately!',
          keyPoints: [
            '✅ "Which service should you use?" → Pick right Cognitive Service',
            '✅ "You need to..." → Identify requirements, match service',
            '✅ "What should you do FIRST?" → Usually: Create resource, get keys',
            '✅ "Most cost-effective solution?" → Compare pricing tiers',
            '✅ "Which principle?" → Know all 6 Responsible AI principles!'
          ],
          example: '📝 Example: "You need to translate text in real-time during video calls" → ANSWER: Speech Translation service (not Translator Text, because SPEECH!).',
          completed: false
        },
        {
          id: 2,
          name: 'Must-Memorize Facts',
          description: 'These facts appear repeatedly. Just memorize them! Instant points on exam.',
          analogy: '🧠 Like multiplication tables: 7×8=56. Just memorize these 20 facts = Free points on exam!',
          keyPoints: [
            '🔑 Authentication = Subscription key OR Azure AD token',
            '🌍 Custom Vision = Minimum 15 images per tag',
            '🗣️ Speech-to-Text = Real-time OR Batch transcription',
            '📊 LUIS = Max 500 intents per app',
            '💰 Free tier = Limited transactions, S0 = Pay-per-call',
            '🤖 Bot Framework = Node.js, C#, Python, Java supported'
          ],
          example: '💡 Instant Answer Question: "Minimum images needed per tag in Custom Vision?" → 15! (But 50+ recommended for accuracy).',
          completed: false
        },
        {
          id: 3,
          name: 'Practice Scenario: E-Commerce Chatbot',
          description: 'Build knowledge from real scenario: E-commerce wants AI chatbot for customer service. What services do you need?',
          analogy: '🧩 Like building with LEGO: Multiple pieces (services) combine to create complete solution. Know which pieces fit together!',
          keyPoints: [
            'LUIS = Understand customer intent ("I want to return")',
            'QnA Maker = Answer FAQs from company docs',
            'Text Analytics = Detect customer sentiment (angry?)',
            'Bot Service = Deploy to web/Teams/Facebook',
            'Azure Monitor = Track usage and errors'
          ],
          example: '🛒 Full Flow: Customer says "Where is my order?" → LUIS detects "order status" intent → Bot queries order system → Returns tracking info → Win!',
          completed: false
        },
        {
          id: 4,
          name: 'Practice Scenario: Document Processing',
          description: 'Company has 10,000 scanned invoices, needs to extract data automatically. Which services?',
          analogy: '📄 Like hiring data entry staff, but AI: Read documents, extract key info, organize in database. But instant and cheaper!',
          keyPoints: [
            'Form Recognizer = Extract structured data from invoices',
            'OCR (Computer Vision) = Extract text from images',
            'Custom model = Train on YOUR invoice format',
            'Batch processing = Process thousands at once',
            'Confidence scores = Flag low-confidence for human review'
          ],
          example: '📊 Solution: Upload invoice → Form Recognizer extracts: Invoice#, date, total → If confidence < 90% → Human reviews → Else auto-process!',
          completed: false
        },
        {
          id: 5,
          name: 'Last-Minute Review Checklist',
          description: '🚨 Review this 24 hours before exam! Quick reminders of critical concepts.',
          analogy: '✈️ Like pre-flight checklist: Pilots check everything before takeoff. Check these concepts before exam!',
          keyPoints: [
            '✅ Know all 6 Responsible AI principles by heart',
            '✅ Understand difference: Speech vs Text services',
            '✅ Authentication: Keys, endpoints, regions',
            '✅ Cost: Free tier limits, S0 pricing model',
            '✅ Custom Vision: Min 15 images, need 2 tags minimum',
            '✅ Bot Framework: Dialogs, state management, channels',
            '✅ Monitoring: Azure Monitor, Application Insights',
            '✅ Security: Key Vault, Managed Identity, never hardcode'
          ],
          example: '🎓 Exam Day: Read this list → Instantly recall key facts → Recognize question patterns → Answer confidently → Pass! 🎉',
          completed: false
        }
      ]
    },
    {
      id: 11,
      title: 'Introduction to AI and GenAI',
      icon: '🎓',
      duration: '4 hours',
      difficulty: 'Beginner',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Artificial Intelligence (AI)',
          description: 'AI is software that mimics human behavior and intelligence, enabling computers to perform tasks like image recognition, language understanding, and decision-making.',
          analogy: 'Like teaching a computer to think and learn like a human brain, starting from basic pattern recognition to complex decision-making.',
          keyPoints: [
            'Broad category of software mimicking human intelligence',
            'Includes machine learning, computer vision, NLP, and more',
            'Enables automation of complex cognitive tasks',
            'Foundation for modern intelligent applications'
          ],
          example: '💡 AI is everywhere: Netflix recommendations (ML), Face Unlock (Computer Vision), Siri (NLP), Self-driving cars (Multiple AI!)',
          completed: false
        },
        {
          id: 2,
          name: 'Machine Learning',
          description: 'Machine Learning (ML) is a subset of AI where computers learn patterns from data without being explicitly programmed, improving their performance over time.',
          analogy: 'Like teaching a child to recognize animals by showing them many pictures, they learn to identify new animals they haven\'t seen before.',
          keyPoints: [
            'Learns from data without explicit programming',
            'Three main types: supervised, unsupervised, reinforcement',
            'Requires training data to build models',
            'Model performance improves with more quality data'
          ],
          example: '📊 Real example: Show ML 1000 cat photos → It learns "cats have ears, whiskers, 4 legs" → Now it can identify cats in NEW photos!',
          codeExample: `// Machine Learning Process:
// 1. Collect training data (labeled examples)
// 2. Train the model (learns patterns)
// 3. Evaluate performance (test accuracy)
// 4. Deploy for predictions (use on new data)

// Example: Email spam classifier
// Training data: 10,000 emails labeled spam/not spam
// → Model learns patterns → Now classifies NEW emails!`,
          completed: false
        },
        {
          id: 3,
          name: 'Deep Learning',
          description: 'Deep Learning uses multi-layered artificial neural networks to learn complex patterns from vast amounts of data, powering advances in image recognition, language models, and more.',
          analogy: 'Like stacking multiple layers of filters to understand progressively complex features - first layer sees edges, second sees shapes, third recognizes objects.',
          keyPoints: [
            'Uses multi-layer neural networks',
            'Requires large datasets and computational power',
            'Excels at tasks like image/speech recognition',
            'Powers modern AI breakthroughs like GPT and image generation'
          ],
          example: '🧠 Neural network: Input → Layer 1 (edges) → Layer 2 (shapes) → Layer 3 (objects) → Output "cat"!',
          codeExample: `// Deep Learning Architecture:
// Input Layer → Hidden Layer 1 → Hidden Layer 2 → ... → Output Layer
// Each layer learns more abstract features

// Image recognition example:
// Layer 1: Detects edges and lines
// Layer 2: Combines into shapes (circles, squares)
// Layer 3: Recognizes parts (eyes, ears, wheels)
// Layer 4: Identifies objects (cat, dog, car)`,
          completed: false
        },
        {
          id: 4,
          name: 'Generative AI',
          description: 'Generative AI creates new, original content (text, images, code, audio) based on patterns it learned from training data, like ChatGPT writing essays or DALL-E creating images.',
          analogy: 'Like an artist who has studied thousands of paintings and can now create entirely new artwork in similar styles, or a writer who has read millions of books and can write new stories.',
          keyPoints: [
            'Creates new content from learned patterns',
            'Includes text generation (GPT), image generation (DALL-E), code generation (Copilot)',
            'Transformer architecture is key to recent advances',
            'Applications: content creation, code assistance, design'
          ],
          example: '🎨 ChatGPT (text), DALL-E (images), GitHub Copilot (code), Whisper (speech) - all creating NEW content, not just analyzing existing!',
          completed: false
        }
      ]
    },
    {
      id: 12,
      title: 'Azure OpenAI Service',
      icon: '🤖',
      duration: '5 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Azure OpenAI Overview',
          description: 'Azure OpenAI Service provides REST API access to powerful OpenAI language models like GPT-4, GPT-3.5, DALL-E, and Whisper through Microsoft Azure with enterprise security and compliance.',
          analogy: 'Like having OpenAI\'s most powerful AI models available through a secure, enterprise-grade cloud service with all the benefits of Azure integration.',
          keyPoints: [
            'Access to GPT-4, GPT-3.5-Turbo, Embeddings, DALL-E models',
            'Enterprise-grade security and compliance',
            'Integrated with Azure ecosystem (RBAC, Private Links, Monitoring)',
            'Regional availability and data residency options',
            'Responsible AI features built-in (content filtering)'
          ],
          example: '🔒 Get ChatGPT power + Azure security + Your company data privacy = Azure OpenAI!',
          codeExample: `// Quick start:
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));

// Use GPT-4:
const result = await client.getChatCompletions("gpt-4", [
  { role: "system", content: "You are a helpful assistant" },
  { role: "user", content: "Explain Azure AI briefly" }
]);

console.log(result.choices[0].message.content);`,
          completed: false
        },
        {
          id: 2,
          name: 'Prompt Engineering',
          description: 'Prompt Engineering is the practice of crafting effective instructions and context to get the best responses from AI models, including techniques like few-shot learning and chain-of-thought prompting.',
          analogy: 'Like learning to ask better questions - instead of "Tell me about dogs," ask "Write a 200-word explanation of how dogs evolved from wolves, suitable for a 10-year-old."',
          keyPoints: [
            'Be specific and clear about desired output',
            'Provide examples (few-shot learning)',
            'Use system messages to set behavior and constraints',
            'Break complex tasks into steps (chain-of-thought)',
            'Iterate and refine based on results'
          ],
          example: '❌ Bad: "Write about AI"\n✅ Good: "Write a 3-paragraph introduction to Azure AI for beginners, covering services, use cases, and getting started"',
          stepByStep: [
            '1️⃣ Be Specific: State exactly what you want, format, length, style',
            '2️⃣ Give Context: Explain the purpose and target audience',
            '3️⃣ Provide Examples: Show 2-3 examples of desired output',
            '4️⃣ Set Constraints: Mention what NOT to include',
            '5️⃣ Test & Iterate: Try, refine, improve based on results'
          ],
          codeExample: `// Good prompt structure:
const messages = [
  {
    role: "system",
    content: "You are an Azure expert. Be concise and practical. Include code examples."
  },
  {
    role: "user",
    content: "How do I authenticate with Azure OpenAI? Show me Node.js code."
  }
];`,
          completed: false
        },
        {
          id: 3,
          name: 'Tokens and Pricing',
          description: 'Tokens are pieces of words that AI models process - roughly 4 characters or 3/4 of a word. Both input and output tokens count toward model limits and pricing.',
          analogy: '🔤 Like breaking sentences into syllable-like chunks - "Tokenization" becomes ["Token", "ization"], "AI" stays "AI", and "running" becomes ["run", "ning"].',
          keyPoints: [
            '📏 1 token ≈ 4 characters or ≈ 3/4 word in English',
            '📝 100 tokens ≈ 75 words (rough estimate)',
            '⚖️ Both input and output count toward limits',
            '📊 Model limits: GPT-3.5 (4K/16K), GPT-4 (8K/32K/128K)',
            '💰 Pricing based on tokens consumed (input + output)',
            '🎯 Monitor usage to control costs!'
          ],
          example: '💰 Examples:\n• "Hello, how are you?" = 6 tokens\n• Average email (500 words) ≈ 650-700 tokens\n• Novel chapter (5000 words) ≈ 6500-7000 tokens\n• GPT-4 8K = ~6000 words max',
          stepByStep: [
            '1️⃣ Convert Text to Tokens: AI breaks your text into chunks',
            '2️⃣ Count Input: Your prompt/question gets tokenized',
            '3️⃣ Count Output: AI response gets tokenized',
            '4️⃣ Total Cost: (Input tokens × $price) + (Output tokens × $price)',
            '5️⃣ Monitor: Use Azure portal to track token usage',
            '⚠️ TIP: Use shorter prompts = Lower costs!'
          ],
          codeExample: `// Check token usage in Azure OpenAI:
const result = await client.getChatCompletions(deployment, messages);

// Token breakdown:
console.log('Input (prompt) tokens:', result.usage.promptTokens);
console.log('Output (response) tokens:', result.usage.completionTokens);
console.log('Total tokens used:', result.usage.totalTokens);

// Example output:
// Input: 50 tokens (your question)
// Output: 200 tokens (AI response)
// Total: 250 tokens used this request

// Pricing estimate (example rates):
// GPT-4: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
// This request cost: (50/1000 × $0.03) + (200/1000 × $0.06) = $0.0135

// 💡 TIP: Use GPT-3.5 for cheaper simple tasks!`,
          completed: false
        },
        {
          id: 4,
          name: 'Embeddings for Search',
          description: 'Embeddings convert text into 1536-dimensional vectors that capture semantic meaning. Similar texts have similar vectors, enabling powerful semantic search.',
          analogy: '🎯 Like GPS coordinates for words! Just as GPS puts every location on Earth into numbers (lat/long), embeddings put every piece of text into numbers that show how similar they are.',
          keyPoints: [
            '🔢 Convert text → 1536 numbers (vector)',
            '🎯 Similar meaning = Similar vectors',
            '🔍 Use cosine similarity to compare (0-1 score)',
            '💡 Better than keyword search (understands meaning!)',
            '💰 Cheaper than running full GPT-4',
            '📦 Store in Azure AI Search or Cosmos DB'
          ],
          example: '🔍 Search Example:\n• Query: "dog breeds"\n• Matches: "puppy types" (high similarity)\n• No match: "cat food" (low similarity)\n\nSemantic search understands MEANING, not just words!',
          stepByStep: [
            '1️⃣ Create Embeddings: Convert your documents to vectors',
            '2️⃣ Store Vectors: Save in vector database (Azure AI Search)',
            '3️⃣ User Question: Convert user query to vector',
            '4️⃣ Find Similar: Search for closest vectors (cosine similarity)',
            '5️⃣ Return Results: Show most relevant documents',
            '🎯 Result: Smart search that understands meaning!'
          ],
          codeExample: `// Create embeddings for search:
const { OpenAIClient } = require('@azure/openai');

// Step 1: Create embeddings for your content
const docs = [
  "Azure AI offers computer vision services",
  "Microsoft provides cloud computing solutions",
  "Best Italian pizza recipe with tomatoes"
];

const embeddings = await client.getEmbeddings(
  "text-embedding-ada-002",
  docs
);

// Step 2: User search query
const query = "AI image analysis";
const queryEmbedding = await client.getEmbeddings(
  "text-embedding-ada-002",
  [query]
);

// Step 3: Find most similar (cosine similarity)
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val*val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val*val, 0));
  return dot / (magA * magB);
}

// Compare query with each doc
const similarities = embeddings.data.map((emb, i) => ({
  doc: docs[i],
  similarity: cosineSimilarity(queryEmbedding.data[0].embedding, emb.embedding)
}));

// Sort by similarity
similarities.sort((a, b) => b.similarity - a.similarity);
console.log('Most relevant:', similarities[0].doc);
// Output: "Azure AI offers computer vision services" (highest match!)`,
          completed: false
        }
      ]
    },
    {
      id: 13,
      title: 'Azure Computer Vision',
      icon: '🖼️',
      duration: '4 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Image Analysis',
          description: 'Azure Computer Vision analyzes images to extract information like objects, text, faces, and generate descriptions without requiring ML expertise.',
          analogy: 'Like hiring an expert photographer and analyst who can instantly tell you everything about an image - what objects are present, what text it contains, and what\'s happening in the scene.',
          keyPoints: [
            'Pre-trained models ready to use (no ML expertise needed)',
            'Analyzes images for: objects, faces, text, colors, brands, landmarks',
            'Supports 73+ languages for OCR',
            'REST API and SDK access',
            'Pay-per-use pricing model'
          ],
          example: '📸 Upload photo → Get tags, description, objects, colors, faces - all in seconds!',
          codeExample: `// Analyze image:
const { ComputerVisionClient } = require("@azure/cognitiveservices-computervision");

const result = await client.analyzeImage(imageUrl, {
  visualFeatures: ["Tags", "Description", "Objects", "Faces"]
});

console.log("Description:", result.description.captions[0].text);
console.log("Tags:", result.tags.map(t => t.name).join(", "));`,
          completed: false
        },
        {
          id: 2,
          name: 'OCR and Text Extraction',
          description: 'OCR extracts printed and handwritten text from images and documents, supporting 73+ languages and returning text with spatial information.',
          analogy: 'Like a really fast, multilingual typist who can read any document (even handwritten notes) and type out all the text in seconds.',
          keyPoints: [
            'Read API for text-heavy documents (receipts, invoices, articles)',
            'OCR API for quick text extraction from images',
            'Supports 73+ languages',
            'Extracts handwritten and printed text',
            'Returns text, bounding boxes, confidence scores'
          ],
          example: '🧾 Scan receipt → Extract all text → Process invoice data → Save to database. Automate document processing!',
          completed: false
        },
        {
          id: 3,
          name: 'Custom Vision',
          description: 'Custom Vision allows you to train your own image classification and object detection models using your specific images and labels, without ML expertise.',
          analogy: 'Like teaching a child to recognize your family photos - you show them labeled pictures ("this is Grandma," "this is Uncle Bob"), and they learn to identify them.',
          keyPoints: [
            'Train custom image classification models',
            'Train custom object detection models',
            'Upload and tag your own training images',
            'No ML expertise required (transfer learning)',
            'Export models for offline use'
          ],
          example: '🏷️ Upload 50 product images → Tag them (shoes, shirts, etc.) → Train model → Deploy → Automatically classify new product photos!',
          completed: false
        }
      ]
    },
    {
      id: 14,
      title: 'Azure AI Language Service',
      icon: '💬',
      duration: '5 hours',
      difficulty: 'Intermediate',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Sentiment Analysis',
          description: 'Sentiment Analysis determines the emotional tone of text (positive, negative, neutral, or mixed) at both document and sentence level with confidence scores.',
          analogy: 'Like reading customer reviews and instantly knowing if they\'re happy (positive), unhappy (negative), or just stating facts (neutral).',
          keyPoints: [
            'Four sentiments: positive, negative, neutral, mixed',
            'Document-level and sentence-level analysis',
            'Confidence scores for each sentiment',
            'Opinion mining: aspect-based sentiment',
            'Useful for: customer feedback, social media monitoring'
          ],
          example: '😊 "I love this product!" → Positive (95%)\n😠 "Worst experience ever" → Negative (98%)\n😐 "Package arrived" → Neutral (87%)',
          codeExample: `// Sentiment analysis:
const { TextAnalyticsClient } = require("@azure/ai-text-analytics");

const results = await client.analyzeSentiment([
  "I love this product! Amazing quality!",
  "Terrible service, very disappointed."
]);

results.forEach(result => {
  console.log(\`Sentiment: \${result.sentiment}\`);
  console.log(\`Scores: +\${result.confidenceScores.positive} -\${result.confidenceScores.negative}\`);
});`,
          completed: false
        },
        {
          id: 2,
          name: 'Named Entity Recognition',
          description: 'NER identifies and categorizes important entities in text like person names, locations, organizations, dates, quantities, and more.',
          analogy: 'Like highlighting a contract with different colored markers - yellow for names, blue for locations, green for dates, pink for money amounts.',
          keyPoints: [
            'Pre-built categories: Person, Location, Organization, DateTime, Quantity',
            '18+ entity categories total',
            'Returns entity text, category, subcategory, confidence',
            'Custom NER available for domain-specific entities',
            'Useful for: information extraction, compliance'
          ],
          example: '📝 "Microsoft CEO Satya Nadella spoke in Seattle on Jan 15" → Extract: Microsoft (Org), Satya Nadella (Person), Seattle (Location), Jan 15 (Date)',
          completed: false
        },
        {
          id: 3,
          name: 'Question Answering',
          description: 'Question Answering lets you build chatbots that can answer questions based on FAQs, documents, or knowledge bases using natural language understanding.',
          analogy: '🤖 Like hiring a customer service rep who has memorized your entire FAQ document and can instantly answer any question customers have.',
          keyPoints: [
            '📚 Create Q&A bots from documents, URLs, FAQs',
            '💬 Natural language question understanding',
            '🎯 Returns answers with confidence scores (0-100%)',
            '🔄 Supports follow-up questions (context tracking)',
            '💡 Multi-turn conversations with memory',
            '⚡ Fast responses (milliseconds)'
          ],
          example: '❓ Customer asks: "What\'s your return policy?"\n🤖 Bot searches FAQ → Finds answer → Returns: "30-day money-back guarantee" (confidence: 92%)\n\n💡 Follow-up: "How do I start a return?" → Bot remembers context!',
          completed: false
        }
      ]
    },
    {
      id: 15,
      title: 'Azure AI Foundry & RAG',
      icon: '🏭',
      duration: '5 hours',
      difficulty: 'Advanced',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 1,
          name: 'Azure AI Studio',
          description: 'Azure AI Studio is a web-based interface for exploring AI capabilities, building applications, testing models, and managing AI projects without writing code initially.',
          analogy: 'Like Visual Studio Code but for AI - a user-friendly interface where you can experiment, build, test, and deploy AI solutions.',
          keyPoints: [
            'Web-based visual interface (https://ai.azure.com)',
            'No-code/low-code AI development',
            'Test models with sample data',
            'Build prompt flows visually',
            'Manage projects, deployments, and resources'
          ],
          example: '🎨 Playground: Test GPT-4 → Adjust settings → See results instantly → Deploy when ready. All in your browser!',
          completed: false
        },
        {
          id: 2,
          name: 'Model Catalog',
          description: 'Model Catalog is a centralized marketplace of pre-trained AI models from Microsoft, OpenAI, Meta, Hugging Face that you can browse, compare, and deploy.',
          analogy: 'Like an app store for AI models - browse categories, read descriptions, see ratings, and one-click deploy models to your Azure environment.',
          keyPoints: [
            'Hundreds of pre-trained models available',
            'Models from Microsoft, OpenAI, Meta, Hugging Face',
            'Categories: language, vision, speech, multimodal',
            'Compare models by capabilities and performance',
            'One-click deployment to Azure'
          ],
          example: '🛍️ Need image generation? Browse catalog → Find Stable Diffusion or DALL-E → Click deploy → Use in your app. That easy!',
          completed: false
        },
        {
          id: 3,
          name: 'RAG (Retrieval Augmented Generation)',
          description: 'RAG enhances AI responses by retrieving relevant information from your documents using vector search before generating answers, grounding responses in your data.',
          analogy: 'Like giving the AI a library card - instead of relying only on what it was trained on, it can look up current information from your documents before answering.',
          keyPoints: [
            'Combines retrieval (search) with generation (LLM)',
            'Use embeddings for semantic search',
            'Store vectors in Azure AI Search',
            'Ground responses in your specific data',
            'Reduces hallucinations',
            'Keeps responses up-to-date without retraining'
          ],
          example: '📚 User asks about your product → RAG searches your docs → Finds relevant info → GPT generates answer based on YOUR data. No hallucinations!',
          codeExample: `// RAG pattern:
// 1. Convert your docs to embeddings
// 2. Store in Azure AI Search
// 3. User asks question
// 4. Search similar docs (vector search)
// 5. Send docs + question to GPT
// 6. GPT answers based on YOUR docs!`,
          completed: false
        },
        {
          id: 4,
          name: 'Content Safety',
          description: 'Content Safety provides AI-powered detection and filtering of harmful content across categories like hate, sexual, violence, and self-harm with configurable severity levels.',
          analogy: 'Like having a team of moderators who review everything coming in and going out, blocking harmful content before it reaches users.',
          keyPoints: [
            'Four categories: Hate, Sexual, Violence, Self-harm',
            'Severity levels: Safe (0), Low (2), Medium (4), High (6)',
            'Filters both prompts (input) and completions (output)',
            'Configurable thresholds per category',
            'Custom blocklists'
          ],
          example: '🛡️ User posts offensive text → Content Safety scores it → If severity > threshold → Block it → Protect your community!',
          completed: false
        }
      ]
    }
  ];

  ngOnInit(): void {
    this.loadProgress();
    
    // Track login state for Save to Notes
    this.authService.currentUser$.subscribe(u => this.isLoggedIn = !!u);

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      this.darkMode = true;
      document.body.classList.add('dark-mode');
    }
  }

  selectModule(module: LearningModule): void {
    this.selectedModule = module;
    this.currentView = 'module';
  }

  selectTopic(topic: Topic): void {
    this.selectedTopic = topic;
    this.currentView = 'topic';
  }

  markTopicComplete(topic: Topic): void {
    topic.completed = true;
    if (this.selectedModule) {
      this.updateModuleProgress(this.selectedModule);
    }
    this.saveProgress();
  }

  updateModuleProgress(module: LearningModule): void {
    const completedTopics = module.topics.filter(t => t.completed).length;
    module.progress = Math.round((completedTopics / module.topics.length) * 100);
    module.completed = module.progress === 100;
  }

  backToRoadmap(): void {
    this.currentView = 'roadmap';
    this.selectedModule = null;
    this.selectedTopic = null;
  }

  backToModule(): void {
    this.currentView = 'module';
    this.selectedTopic = null;
  }

  nextTopic(): void {
    if (this.selectedModule && this.selectedTopic) {
      const currentIndex = this.selectedModule.topics.indexOf(this.selectedTopic);
      if (currentIndex < this.selectedModule.topics.length - 1) {
        this.selectTopic(this.selectedModule.topics[currentIndex + 1]);
      } else {
        // Last topic - go back to module
        this.backToModule();
      }
    }
  }

  previousTopic(): void {
    if (this.selectedModule && this.selectedTopic) {
      const currentIndex = this.selectedModule.topics.indexOf(this.selectedTopic);
      if (currentIndex > 0) {
        this.selectTopic(this.selectedModule.topics[currentIndex - 1]);
      }
    }
  }

  getOverallProgress(): number {
    const totalTopics = this.modules.reduce((sum, m) => sum + m.topics.length, 0);
    const completedTopics = this.modules.reduce((sum, m) => 
      sum + m.topics.filter(t => t.completed).length, 0);
    return Math.round((completedTopics / totalTopics) * 100);
  }

  getCompletedModules(): number {
    return this.modules.filter(m => m.completed).length;
  }

  getTotalTopics(): number {
    return this.modules.reduce((sum, m) => sum + m.topics.length, 0);
  }

  getCompletedTopics(): number {
    return this.modules.reduce((sum, m) => 
      sum + m.topics.filter(t => t.completed).length, 0);
  }

  getCompletedTopicsForModule(module: LearningModule): number {
    return module.topics.filter(t => t.completed).length;
  }

  saveProgress(): void {
    const progressData = {
      modules: this.modules.map(m => ({
        id: m.id,
        completed: m.completed,
        progress: m.progress,
        topics: m.topics.map(t => ({
          id: t.id,
          completed: t.completed
        }))
      }))
    };
    localStorage.setItem('azureAI102Progress', JSON.stringify(progressData));
  }

  loadProgress(): void {
    const savedProgress = localStorage.getItem('azureAI102Progress');
    if (savedProgress) {
      try {
        const progressData = JSON.parse(savedProgress);
        progressData.modules.forEach((savedModule: any) => {
          const module = this.modules.find(m => m.id === savedModule.id);
          if (module) {
            module.completed = savedModule.completed;
            module.progress = savedModule.progress;
            savedModule.topics.forEach((savedTopic: any) => {
              const topic = module.topics.find(t => t.id === savedTopic.id);
              if (topic) {
                topic.completed = savedTopic.completed;
              }
            });
          }
        });
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  }

  resetProgress(): void {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      this.modules.forEach(module => {
        module.completed = false;
        module.progress = 0;
        module.topics.forEach(topic => {
          topic.completed = false;
        });
      });
      localStorage.removeItem('azureAI102Progress');
      this.backToRoadmap();
    }
  }

  /**
   * AI Understanding Feature Methods
   */
  understandWithAi(topicName: string): void {
    this.currentAiTopic = topicName;
    this.showAiModal = true;
    this.aiLoading = true;
    this.aiError = null;
    this.aiResponse = null;
    this.expandedSections.clear();
    
    // Start AI animation
    this.startAiAnimation();

    console.log('Requesting AI understanding for:', topicName);

    this.aiUnderstandService.understandTopic(topicName, 'AI-102').subscribe({
      next: (response) => {
        console.log('AI response received:', response);
        
        // Complete progress animation
        this.aiProgress = 100;
        this.clearIntervals();
        
        // Show response with delay for smooth transition
        setTimeout(() => {
          this.aiResponse = response;
          this.aiLoading = false;
          this.aiUnderstandService.cacheResponse(response);
          
          // Auto-expand first section
          setTimeout(() => {
            this.expandedSections.add('explanation');
          }, 300);
        }, 500);
      },
      error: (error) => {
        console.error('AI understanding error:', error);
        this.aiError = error.error || 'Failed to load AI explanation';
        this.aiLoading = false;
        this.clearIntervals();
      }
    });
  }

  closeAiModal(): void {
    this.showAiModal = false;
    this.aiResponse = null;
    this.aiError = null;
    this.currentAiTopic = '';
    this.expandedSections.clear();
    this.clearIntervals();
  }

  retryAiRequest(): void {
    if (this.currentAiTopic) {
      this.understandWithAi(this.currentAiTopic);
    }
  }
  
  getExplanationSections(): string[] {
    if (!this.aiResponse?.explanation) return [];
    return this.aiResponse.explanation.split('\n\n').filter(s => s.trim().length > 0);
  }
  
  scrollToTop(): void {
    const modalBody = document.querySelector('.ai-modal-body');
    if (modalBody) {
      modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SAVE TO NOTES ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  async saveAiExplanationToNotes(): Promise<void> {
    if (!this.aiResponse || this.noteSaving) return;
    if (!this.isLoggedIn) {
      this.noteError = 'Please sign in to save notes.';
      return;
    }
    this.noteSaving = true;
    this.noteSaved  = false;
    this.noteError  = '';
    try {
      await this.notesService.saveNote(
        this.aiResponse.topicName,
        'Azure AI-102',
        this.aiResponse.explanation,
        ['AI-102', 'Azure', this.aiResponse.topicName]
      );
      this.noteSaved = true;
      setTimeout(() => { this.noteSaved = false; }, 3000);
    } catch (err: any) {
      this.noteError = 'Could not save note. Try again.';
    } finally {
      this.noteSaving = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARCHITECTURE DIAGRAM ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  showArchitectureDiagram(): void {
    const topic = this.selectedTopic?.name;
    if (!topic) return;

    // Toggle off if already open for same topic
    if (this.archDiagramOpen && this._archTopic === topic) {
      this.archDiagramOpen = false;
      return;
    }

    this._archTopic       = topic;
    this.archDiagramOpen  = true;
    this.archDiagramLoading = true;
    this.archDiagramHtml  = null;
    this.archSub?.unsubscribe();

    const prompt =
      `Generate an animated HTML architecture/flow diagram for: "${topic}" (Azure AI-102 topic).\n\n` +
      `STRICT RULES — output ONLY plain HTML, no markdown fences, no explanations:\n` +
      `- Each step/component must be a <div class="diagram-box"> with style="background: linear-gradient(135deg, #COLOR1, #COLOR2);"\n` +
      `- Use 6 distinct gradient color pairs (indigo, teal, purple, green, orange, pink)\n` +
      `- Each box must have: an emoji icon, a bold title, a 1-2 sentence description\n` +
      `- Connect boxes with <div class="arch-arrow">↓</div> between them\n` +
      `- End with a <div class="arch-insight"> containing a Key Insight about "${topic}"\n` +
      `- Wrap everything in <div class="arch-wrapper">\n` +
      `Output ONLY the HTML. No text before or after it.`;

    this.archSub = this.aiLearnService.getSimplifiedExplanation(prompt).subscribe({
      next: (res: any) => {
        this.archDiagramLoading = false;
        if (res?.success && res?.explanation) {
          const raw = res.explanation
            .replace(/^```html?\s*/i, '')
            .replace(/```\s*$/,       '')
            .trim();
          if (raw.length > 50) {
            this.archDiagramHtml = this.sanitizer.bypassSecurityTrustHtml(raw);
          } else {
            this.archDiagramHtml = this.sanitizer.bypassSecurityTrustHtml(
              `<p style="color:#94a3b8;padding:1rem">Could not generate diagram. Please try again.</p>`
            );
          }
        }
      },
      error: () => {
        this.archDiagramLoading = false;
        this.archDiagramHtml = this.sanitizer.bypassSecurityTrustHtml(
          `<p style="color:#ef4444;padding:1rem">⚠️ Diagram generation failed. Please try again.</p>`
        );
      }
    });
  }

  closeArchDiagram(): void {
    this.archDiagramOpen = false;
    this.archSub?.unsubscribe();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── INLINE MENTOR CHAT ────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  sendMentorMessage(): void {
    const q = this.mentorInput.trim();
    if (!q || this.mentorLoading) return;

    this.mentorMessages.push({ role: 'user', text: q });
    this.mentorInput   = '';
    this.mentorLoading = true;

    const topic   = this.selectedTopic?.name ?? 'Azure AI';
    const history = this.mentorMessages
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'Student' : 'Mentor'}: ${m.text}`)
      .join('\n');

    const prompt =
      `You are an Azure AI-102 exam mentor. Answer conversationally in 100-200 words.\n` +
      `Topic context: "${topic}"\n\n` +
      `Conversation:\n${history}\n\n` +
      `Student: ${q}\n\n` +
      `Rules: Be direct, no filler. Use **bold** for key terms. End with one follow-up tip.`;

    this.mentorSub?.unsubscribe();
    this.mentorSub = this.aiLearnService.getSimplifiedExplanation(prompt).subscribe({
      next: (res: any) => {
        this.mentorLoading = false;
        const text = res?.explanation?.trim() || '⚠️ No response. Please try again.';
        this.mentorMessages.push({ role: 'ai', text });
        setTimeout(() => {
          const el = document.querySelector('.al-chat-body');
          if (el) el.scrollTop = el.scrollHeight;
        }, 60);
      },
      error: () => {
        this.mentorLoading = false;
        this.mentorMessages.push({ role: 'ai', text: '⚠️ AI unavailable right now. Please try again.' });
      }
    });
  }

  clearMentorChat(): void {
    this.mentorMessages = [];
    this.mentorInput = '';
    this.mentorSub?.unsubscribe();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── QUIZ ──────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  /** Returns the built-in quiz questions for the currently selected module */
  getModuleQuiz(): QuizQuestion[] {
    if (!this.selectedModule) return [];
    return this.quizBank[this.selectedModule.id] ?? [];
  }

  startQuiz(): void {
    const qs = this.getModuleQuiz();
    this.quizActive    = true;
    this.quizAnswers   = new Array(qs.length).fill(null);
    this.quizSubmitted = false;
    this.quizScore     = 0;
  }

  selectAnswer(qi: number, answerIdx: number): void {
    if (this.quizSubmitted) return;
    this.quizAnswers[qi] = answerIdx;
  }

  submitQuiz(): void {
    if (this.quizAnswers.some(a => a === null)) return;  // require all answered
    const qs = this.getModuleQuiz();
    this.quizScore = qs.filter((q, i) => this.quizAnswers[i] === q.correct).length;
    this.quizSubmitted = true;
  }

  retakeQuiz(): void {
    const qs = this.getModuleQuiz();
    this.quizAnswers   = new Array(qs.length).fill(null);
    this.quizSubmitted = false;
    this.quizScore     = 0;
  }

  closeQuiz(): void {
    this.quizActive    = false;
    this.quizSubmitted = false;
    this.quizAnswers   = [];
    this.quizScore     = 0;
  }

  quizLetterClass(qi: number, ai: number): string {
    if (!this.quizSubmitted) return this.quizAnswers[qi] === ai ? 'al-quiz-opt--selected' : '';
    const q = this.getModuleQuiz()[qi];
    if (ai === q.correct)             return 'al-quiz-opt--correct';
    if (this.quizAnswers[qi] === ai)  return 'al-quiz-opt--wrong';
    return '';
  }

  // Quiz question bank — keyed by module id
  readonly quizBank: Record<number, QuizQuestion[]> = {
    1: [
      {
        question: 'What does AI stand for?',
        options: ['Automated Intelligence', 'Artificial Intelligence', 'Azure Intelligence', 'Advanced Interface'],
        correct: 1,
        explanation: 'AI stands for Artificial Intelligence — making computers perform tasks that typically require human intelligence.'
      },
      {
        question: 'Which Azure service lets you call pre-built AI via REST APIs without ML expertise?',
        options: ['Azure Machine Learning', 'Azure Synapse', 'Azure Cognitive Services', 'Azure Logic Apps'],
        correct: 2,
        explanation: 'Azure Cognitive Services provides pre-built AI via simple REST API calls — no ML training required.'
      },
      {
        question: 'What is a "confidence score" in Azure AI responses?',
        options: ['The API speed in ms', 'How sure the AI is about its result (0–1)', 'The number of API calls made', 'The pricing tier selected'],
        correct: 1,
        explanation: 'A confidence score (0–1) indicates how certain the AI is about its prediction. Values above 0.7 are generally reliable.'
      },
      {
        question: 'What is "inference" in AI?',
        options: ['Training a new model', 'Uploading data to Azure', 'Using a trained model to make predictions', 'Monitoring API usage'],
        correct: 2,
        explanation: 'Inference = using a trained AI model to make predictions on new data. Training creates the model; inference uses it.'
      },
      {
        question: 'Why does Azure provide two keys for each Cognitive Service?',
        options: ['One key is for read, one for write', 'For key rotation without service downtime', 'They work in different regions', 'One is free, one is paid'],
        correct: 1,
        explanation: 'Two keys allow you to regenerate one key for security rotation while still using the other, ensuring zero downtime.'
      }
    ],
    2: [
      {
        question: 'Where do you find your API key after creating a Cognitive Services resource?',
        options: ['Azure Monitor', 'Keys and Endpoint section', 'Resource Group settings', 'Azure Active Directory'],
        correct: 1,
        explanation: 'Navigate to your resource in Azure Portal → "Keys and Endpoint" in the left menu to find your keys and endpoint URL.'
      },
      {
        question: 'What is the purpose of a Resource Group in Azure?',
        options: ['It stores API keys', 'It is a container for organizing related Azure resources', 'It sets the pricing tier', 'It monitors API usage'],
        correct: 1,
        explanation: 'A Resource Group is a logical container for related Azure resources, making it easy to manage, monitor, and delete them together.'
      },
      {
        question: 'Which HTTP header do you add for Cognitive Services key authentication?',
        options: ['Authorization: Bearer', 'X-API-Key', 'Ocp-Apim-Subscription-Key', 'Content-Type'],
        correct: 2,
        explanation: 'Azure Cognitive Services requires the subscription key in the "Ocp-Apim-Subscription-Key" header for authentication.'
      },
      {
        question: 'Free tier (F0) pricing is best for:',
        options: ['High-volume production apps', 'Enterprise deployments', 'Learning and development testing', 'Multi-region deployments'],
        correct: 2,
        explanation: 'F0 (Free) tier is ideal for learning and testing with limited transactions. Use S0 (Standard) for production workloads.'
      }
    ],
    3: [
      {
        question: 'Azure Cognitive Services are organized into how many main families?',
        options: ['3', '4', '5', '7'],
        correct: 2,
        explanation: 'Five families: Vision, Speech, Language, Decision, and Azure OpenAI.'
      },
      {
        question: 'What is the benefit of a multi-service Cognitive Services resource?',
        options: ['Better performance per service', 'Access all Cognitive Services with one key', 'Lower pricing per API call', 'Dedicated compute resources'],
        correct: 1,
        explanation: 'Multi-service resource provides a single key and endpoint to access ALL Cognitive Services — simpler management.'
      },
      {
        question: 'Which error code means your API key is invalid?',
        options: ['200', '404', '401', '429'],
        correct: 2,
        explanation: '401 = Unauthorized. This means your subscription key is missing, invalid, or expired.'
      },
      {
        question: 'Error 429 from a Cognitive Services API means:',
        options: ['Resource not found', 'Invalid API key', 'Too many requests — rate limit exceeded', 'Service unavailable'],
        correct: 2,
        explanation: '429 = Too Many Requests. You have exceeded the rate limit for your pricing tier. Implement retry logic with backoff.'
      }
    ],
    5: [
      {
        question: 'Which Azure service performs Sentiment Analysis on text?',
        options: ['Azure Computer Vision', 'Azure Language Service (Text Analytics)', 'Azure Bot Service', 'Azure Form Recognizer'],
        correct: 1,
        explanation: 'Azure Language Service (Text Analytics) provides sentiment analysis — classifying text as positive, negative, neutral, or mixed.'
      },
      {
        question: 'What does NER stand for in Azure Language Service?',
        options: ['Neural Extraction Rules', 'Named Entity Recognition', 'Natural Event Ranking', 'Network Error Response'],
        correct: 1,
        explanation: 'NER = Named Entity Recognition — automatically identifies people, locations, organizations, dates, and more in text.'
      },
      {
        question: 'In LUIS, "intents" represent:',
        options: ['Important data pieces like names or dates', 'What the user wants to do', 'The confidence threshold', 'The language of the utterance'],
        correct: 1,
        explanation: 'Intents represent what the user wants to achieve (e.g., BookFlight, OrderFood). Entities are the important data extracted from the utterance.'
      },
      {
        question: 'A confidence score of 0.45 in a Language service response means:',
        options: ['Very reliable, use this result', 'Probably incorrect — consider human review', 'The service is unavailable', 'Maximum confidence achieved'],
        correct: 1,
        explanation: 'Scores below 0.5 are generally unreliable. Always implement threshold checks — if score < 0.7, flag for human review in production apps.'
      },
      {
        question: 'Opinion mining in Azure Language Service provides:',
        options: ['Who wrote the text', 'Translation of opinions', 'Aspect-based sentiment (likes product, hates shipping)', 'The author emotion score'],
        correct: 2,
        explanation: 'Opinion mining (aspect-based sentiment) identifies specific aspects and their sentiment — "amazing quality" (product positive), "late arrival" (shipping negative).'
      }
    ],
    12: [
      {
        question: 'What is Azure OpenAI Service?',
        options: ['A free tier of ChatGPT', 'Enterprise-grade access to OpenAI models via Azure infrastructure', 'An open-source AI tool by Microsoft', 'Azure equivalent of Python'],
        correct: 1,
        explanation: 'Azure OpenAI gives enterprise access to GPT-4, DALL-E, Embeddings etc. with Azure security, compliance, and regional data residency.'
      },
      {
        question: 'Roughly how many characters equals one token in GPT models?',
        options: ['1 character', '4 characters', '10 characters', '100 characters'],
        correct: 1,
        explanation: '~4 characters = 1 token, or roughly ¾ of a word. 100 tokens ≈ 75 words. Both input and output tokens count toward costs.'
      },
      {
        question: 'What technique uses your own documents to ground AI responses and reduce hallucinations?',
        options: ['Fine-tuning', 'Prompt caching', 'RAG (Retrieval Augmented Generation)', 'RLHF'],
        correct: 2,
        explanation: 'RAG retrieves relevant context from your documents via vector search, then passes it to the LLM — grounding answers in YOUR data.'
      },
      {
        question: 'Embeddings in Azure OpenAI convert text to:',
        options: ['Compressed ZIP files', 'High-dimensional numeric vectors capturing semantic meaning', 'Audio waveforms', 'SQL database rows'],
        correct: 1,
        explanation: 'Embeddings = 1536-dimensional vectors. Similar meanings = similar vectors. Used for semantic search, clustering, and RAG.'
      },
      {
        question: 'Which system is used to control harmful output in Azure OpenAI responses?',
        options: ['Azure Monitor', 'Content Safety filters', 'Azure Key Vault', 'RBAC policies'],
        correct: 1,
        explanation: 'Azure OpenAI has built-in Content Safety filters for 4 categories (Hate, Sexual, Violence, Self-harm) with configurable severity thresholds.'
      }
    ]
  };
}
