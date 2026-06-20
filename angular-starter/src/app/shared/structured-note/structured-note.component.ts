import {
  Component, Input, OnChanges, SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface StructuredSection {
  heading: string;
  content: string;
  bullets: string[];
  example?: string;
}

export interface StructuredVisual {
  type: 'flow' | 'comparison' | 'diagram';
  data: string[];
}

export interface StructuredNoteDto {
  title:    string;
  summary:  string;
  sections: StructuredSection[];
  steps:    string[];
  visual?:  StructuredVisual;
}

@Component({
  selector: 'app-structured-note',
  templateUrl: './structured-note.component.html',
  styleUrls:  ['./structured-note.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructuredNoteComponent implements OnChanges {
  @Input() note!: StructuredNoteDto;

  // ── Stepper state ─────────────────────────────────────────────────────────
  currentStep   = 0;
  revealedUntil = 0; // highest index revealed so far (so past steps stay visible)
  allRevealed   = false;

  // ── Section accordion ─────────────────────────────────────────────────────
  expandedSections = new Set<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['note'] && this.note) {
      // Reset stepper + accordion whenever a new note is loaded
      this.currentStep     = 0;
      this.revealedUntil   = 0;
      this.allRevealed     = false;
      this.expandedSections = new Set<number>([0]); // first section open by default
    }
  }

  // ── Stepper ──────────────────────────────────────────────────────────────
  get steps(): string[] { return this.note?.steps ?? []; }

  get stepProgress(): number {
    return this.steps.length ? Math.round(((this.revealedUntil + 1) / this.steps.length) * 100) : 0;
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      if (this.currentStep > this.revealedUntil) {
        this.revealedUntil = this.currentStep;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) this.currentStep--;
  }

  revealAll(): void {
    this.allRevealed     = true;
    this.revealedUntil   = this.steps.length - 1;
    this.currentStep     = this.steps.length - 1;
  }

  resetSteps(): void {
    this.currentStep   = 0;
    this.revealedUntil = 0;
    this.allRevealed   = false;
  }

  isStepVisible(i: number): boolean {
    return this.allRevealed || i <= this.revealedUntil;
  }

  isStepActive(i: number): boolean {
    return !this.allRevealed && i === this.currentStep;
  }

  // ── Section accordion ────────────────────────────────────────────────────
  toggleSection(i: number): void {
    if (this.expandedSections.has(i)) {
      this.expandedSections.delete(i);
    } else {
      this.expandedSections.add(i);
    }
  }

  isSectionOpen(i: number): boolean {
    return this.expandedSections.has(i);
  }

  // ── Visual rendering ─────────────────────────────────────────────────────
  get visual(): StructuredVisual | undefined { return this.note?.visual; }

  /** For "comparison" type: parse pipe-delimited rows into cell arrays. */
  get comparisonRows(): string[][] {
    if (!this.visual || this.visual.type !== 'comparison') return [];
    return (this.visual.data ?? []).map(row =>
      row.split('|').map(cell => cell.trim())
    );
  }

  /** First comparison row = header row */
  get comparisonHeaders(): string[] {
    return this.comparisonRows[0] ?? [];
  }

  get comparisonBodyRows(): string[][] {
    return this.comparisonRows.slice(1);
  }
}
