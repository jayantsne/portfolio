import {
  Component,
  HostListener,
  OnInit,
  AfterViewChecked,
  ElementRef,
  ViewChild
} from '@angular/core';
import { AiChatService } from '../services/ai-chat.service';
import { CustomAuthService } from '../shared/custom-auth.service';

/* ---------- TYPES ---------- */
type ChatRole = 'user' | 'ai';

interface ChatMessage {
  role: ChatRole;
  text: string;
}

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.css']
})
export class AiChatComponent
  implements OnInit, AfterViewChecked {

  /* ---------- UI STATE ---------- */
  isOpen = false;
  isMobile = false;
  input = '';
  typing = false;
  showSuggestions = true;

  messages: ChatMessage[] = [];

  /* ---------- SAVE NOTES MODAL ---------- */
  showSaveModal   = false;
  saveNoteTopic   = '';
  saveNoteContent = '';
  savedToast      = false;

  /* ---------- MESSAGE SELECTION ---------- */
  selectionMode    = false;
  selectedIndices  = new Set<number>();

  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;

  constructor(
    private aiChat:  AiChatService,
    public  authSvc: CustomAuthService
  ) {}

  /* ---------- INIT ---------- */
  ngOnInit(): void {
    this.checkMobile();
    this.restoreSession();
    this.addWelcomeMessage();
  }

  /* ---------- AUTO SCROLL ---------- */
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.chatBody) {
      this.chatBody.nativeElement.scrollTop =
        this.chatBody.nativeElement.scrollHeight;
    }
  }

  /* ---------- RESPONSIVE ---------- */
  @HostListener('window:resize')
  checkMobile(): void {
    this.isMobile = window.innerWidth < 600;
  }

  /* ---------- UI ---------- */
  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  quickAsk(text: string): void {
    this.input = text;
    this.send();
  }

  /* ---------- CHAT ---------- */
  send(): void {
    if (!this.input.trim() || this.typing) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: this.input
    };

    this.messages.push(userMessage);
    this.persistSession();

    this.showSuggestions = false;
    this.typing = true;

    const userInput = this.input;
    this.input = '';

    this.aiChat.sendMessage(userInput).subscribe({
      next: (res) => {
        this.typing = false;
        this.typeMessage(res.reply);
      },
      error: () => {
        this.typing = false;
        this.typeMessage(
          'Sorry — something went wrong. Please try again.'
        );
      }
    });
  }

  /* ---------- TYPING EFFECT ---------- */
  private typeMessage(text: string): void {
    let index = 0;

    const aiMessage: ChatMessage = {
      role: 'ai',
      text: ''
    };

    this.messages.push(aiMessage);

    const interval = setInterval(() => {
      aiMessage.text += text[index];
      index++;

      if (index >= text.length) {
        clearInterval(interval);
        this.persistSession();
      }
    }, 15);
  }

  /* ---------- SESSION STORAGE ---------- */
  private persistSession(): void {
    sessionStorage.setItem(
      'ai-chat-messages',
      JSON.stringify(this.messages)
    );
  }

  private restoreSession(): void {
    const stored = sessionStorage.getItem('ai-chat-messages');
    if (stored) {
      this.messages = JSON.parse(stored);
      this.showSuggestions = false;
    }
  }

  /* ---------- WELCOME MESSAGE ---------- */
  private addWelcomeMessage(): void {
    if (this.messages.length === 0) {
      const welcome: ChatMessage = {
        role: 'ai',
        text:
          `Hi — I'm Jayant's AI assistant. Ask me about skills, projects, or experience.`
      };
      this.messages.push(welcome);
      this.persistSession();
    }
  }

  /* ---------- SAVE AS NOTES ---------- */

  get hasConversation(): boolean {
    return this.messages.some(m => m.role === 'user');
  }

  openSaveModal(): void {
    if (!this.hasConversation) return;
    // Build a suggested topic from the first user message
    const firstUserMsg = this.messages.find(m => m.role === 'user');
    this.saveNoteTopic  = firstUserMsg ? firstUserMsg.text.slice(0, 80) : '';
    this.saveNoteContent = this.buildConversationText();
    this.showSaveModal  = true;
  }

  onNoteSaved(): void {
    this.savedToast = true;
    setTimeout(() => this.savedToast = false, 3000);
  }

  /* ---------- PER-MESSAGE SAVE ---------- */

  saveMessageAsNote(index: number): void {
    const msg = this.messages[index];
    this.saveNoteTopic  = msg.text.slice(0, 80);
    this.saveNoteContent = `${msg.role === 'user' ? '🧑 You' : '🤖 AI'}: ${msg.text}`;
    this.showSaveModal  = true;
  }

  /* ---------- MULTI-SELECT ---------- */

  toggleSelectMode(): void {
    this.selectionMode   = !this.selectionMode;
    this.selectedIndices = new Set();
  }

  toggleMsgSelection(index: number): void {
    if (this.selectedIndices.has(index)) {
      this.selectedIndices.delete(index);
    } else {
      this.selectedIndices.add(index);
    }
    // trigger change detection on the Set
    this.selectedIndices = new Set(this.selectedIndices);
  }

  saveSelection(): void {
    if (this.selectedIndices.size === 0) return;
    const selected = [...this.selectedIndices].sort((a, b) => a - b)
      .map(i => this.messages[i]);
    const firstUser = selected.find(m => m.role === 'user');
    this.saveNoteTopic   = firstUser ? firstUser.text.slice(0, 80) : 'Selected Messages';
    this.saveNoteContent = selected
      .map(m => `${m.role === 'user' ? '🧑 You' : '🤖 AI'}: ${m.text}`)
      .join('\n\n');
    this.selectionMode   = false;
    this.selectedIndices = new Set();
    this.showSaveModal   = true;
  }

  private buildConversationText(): string {
    return this.messages
      .filter(m => m.role !== 'ai' || m.text !== this.messages[0].text) // skip automated welcome
      .map(m => `${m.role === 'user' ? '🧑 You' : '🤖 AI'}: ${m.text}`)
      .join('\n\n');
  }
}

