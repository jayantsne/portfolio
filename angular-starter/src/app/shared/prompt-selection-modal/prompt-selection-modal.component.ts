import { Component, Input, Output, EventEmitter } from '@angular/core';
import { QuestionPrompt, QuestionPromptsResponse } from '../../services/interview-questions.service';

@Component({
  selector: 'app-prompt-selection-modal',
  templateUrl: './prompt-selection-modal.component.html',
  styleUrls: ['./prompt-selection-modal.component.css']
})
export class PromptSelectionModalComponent {
  @Input() promptData: QuestionPromptsResponse | null = null;
  @Input() isVisible: boolean = false;
  @Input() isGenerating: boolean = false;
  @Input() aiResponse: string | null = null;
  
  @Output() promptSelected = new EventEmitter<QuestionPrompt>();
  @Output() closeModal = new EventEmitter<void>();
  @Output() startNewPrompt = new EventEmitter<void>();

  selectedPrompt: QuestionPrompt | null = null;

  selectPrompt(prompt: QuestionPrompt) {
    this.selectedPrompt = prompt;
    this.promptSelected.emit(prompt);
  }

  close() {
    this.closeModal.emit();
    this.selectedPrompt = null;
  }

  tryAnotherPrompt() {
    this.startNewPrompt.emit();
    this.selectedPrompt = null;
  }
}
