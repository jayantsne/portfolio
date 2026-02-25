import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ApiService } from '../../shared/api.service';

interface QAPair {
  _id?: string;
  id: number;
  question: string;
  answer: string;
  timestamp: Date;
  category?: string;
  saved: boolean;
}

@Component({
  selector: 'app-ask-ai',
  templateUrl: './ask-ai.component.html',
  styleUrls: ['./ask-ai.component.css', '../ai-qa.component.css'],
  animations: [
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('expandAnswer', [
      transition(':enter', [
        style({ opacity: 0, maxHeight: 0, overflow: 'hidden' }),
        animate('0.4s ease-out', style({ opacity: 1, maxHeight: '2000px' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, maxHeight: 0 }))
      ])
    ])
  ]
})
export class AskAiComponent implements OnInit {
  currentQuestion = '';
  generatedAnswer = '';
  isGenerating = false;
  savedQAs: QAPair[] = [];
  showSaved = false;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadSavedQAs();
  }

  getAnswer(): void {
    if (!this.currentQuestion.trim()) {
      alert('Please enter a question!');
      return;
    }

    this.isGenerating = true;
    this.generatedAnswer = '';

    this.apiService.generateAIAnswer(this.currentQuestion).subscribe({
      next: (response: any) => {
        this.generatedAnswer = response.answer || 'No answer received';
        this.isGenerating = false;
      },
      error: (error) => {
        console.error('Error generating answer:', error);
        this.generatedAnswer = 'Sorry, there was an error generating the answer. Please try again.';
        this.isGenerating = false;
      }
    });
  }

  saveQA(): void {
    if (!this.generatedAnswer) return;

    const qa: QAPair = {
      id: Date.now(),
      question: this.currentQuestion,
      answer: this.generatedAnswer,
      timestamp: new Date(),
      saved: true
    };

    this.savedQAs.unshift(qa);
    localStorage.setItem('saved_qas', JSON.stringify(this.savedQAs));
    alert('Answer saved successfully!');
  }

  loadSavedQAs(): void {
    const saved = localStorage.getItem('saved_qas');
    if (saved) {
      this.savedQAs = JSON.parse(saved);
    }
  }

  deleteQA(id: number): void {
    if (confirm('Are you sure you want to delete this Q&A?')) {
      this.savedQAs = this.savedQAs.filter(qa => qa.id !== id);
      localStorage.setItem('saved_qas', JSON.stringify(this.savedQAs));
    }
  }

  expandCard(id: number): void {
    const qa = this.savedQAs.find(q => q.id === id);
    if (qa) {
      alert(`${qa.question}\n\n${qa.answer}`);
    }
  }

  clearQuestion(): void {
    this.currentQuestion = '';
    this.generatedAnswer = '';
  }
}
