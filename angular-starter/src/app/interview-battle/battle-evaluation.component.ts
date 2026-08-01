import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BattleAnswer } from './interview-battle.models';
import { TextToSpeechService } from './services/text-to-speech.service';

@Component({
  selector: 'app-battle-evaluation',
  template: `
    <section class="evaluation smart-review">
      <header class="review-heading">
        <div><span class="eyebrow">ANSWER COACH</span><h1>Your next answer starts here</h1><p>Correct the answer, then practise it once more.</p></div>
        <div class="review-scores"><span><strong>{{answer.evaluation.technicalEvaluation.score|number:'1.1-1'}}</strong>/10 Technical</span><span><strong>{{answer.evaluation.communicationEvaluation.overallScore|number:'1.1-1'}}</strong>/10 Communication</span></div>
      </header>
      <article class="start-card"><span class="step-badge">1</span><div><span class="eyebrow">SAY THIS FIRST</span><blockquote>{{startWith}}</blockquote><button class="text-action" type="button" (click)="tts.speak(startWith)"><i class="fas fa-volume-up"></i> Listen to opening</button></div></article>
      <div class="coach-grid">
        <article class="coach-card fix-card"><div class="coach-card-title"><span class="step-badge">2</span><div><span class="eyebrow">FIX THE GAPS</span><h2>What to change</h2></div></div><ul class="feedback-list"><li *ngFor="let x of answer.evaluation.technicalEvaluation.incorrectPoints"><i class="fas fa-times-circle"></i><span><strong>Correct this</strong>{{x}}</span></li><li *ngFor="let x of answer.evaluation.technicalEvaluation.missingPoints"><i class="fas fa-plus-circle"></i><span><strong>Add this</strong>{{x}}</span></li><li *ngIf="!hasGaps"><i class="fas fa-check-circle"></i><span><strong>Good foundation</strong>{{answer.evaluation.technicalEvaluation.feedback}}</span></li></ul></article>
        <article class="coach-card structure-card"><div class="coach-card-title"><span class="step-badge">3</span><div><span class="eyebrow">BUILD THE ANSWER</span><h2>Cover these points</h2></div></div><ol class="answer-steps"><li *ngFor="let point of keyPoints; index as i"><span>{{i+1}}</span>{{point}}</li></ol></article>
      </div>
      <article class="model-answer-card"><div class="model-answer-head"><div><span class="eyebrow">A STRONG ANSWER</span><h2>What you can say</h2></div><div class="answer-tabs" role="tablist"><button type="button" [class.active]="answerMode==='short'" (click)="answerMode='short'">30 sec</button><button type="button" [class.active]="answerMode==='natural'" (click)="answerMode='natural'">Natural</button><button type="button" [class.active]="answerMode==='senior'" (click)="answerMode='senior'">Senior</button></div></div><p class="model-answer">{{selectedAnswer}}</p><div class="why-row"><i class="fas fa-lightbulb"></i><div><strong>Why this works</strong><span>{{whyThisWorks}}</span></div></div><div class="model-tools"><button class="ghost" type="button" (click)="tts.speak(selectedAnswer)"><i class="fas fa-volume-up"></i> Listen</button><button class="ghost" type="button" (click)="save.emit()"><i class="far fa-sticky-note"></i> Save to Notes</button></div></article>
      <article class="language-card" *ngIf="answer.evaluation.languageCorrections.length"><span class="eyebrow">SOUND MORE NATURAL</span><div class="correction" *ngFor="let x of answer.evaluation.languageCorrections"><del>{{x.original}}</del><i class="fas fa-arrow-right"></i><strong>{{x.easyToSpeak || x.corrected}}</strong></div></article>
      <footer class="review-actions"><button class="ghost end-action" type="button" (click)="end.emit()">End battle</button><button class="ghost" type="button" *ngIf="answer.evaluation.followUpQuestion" (click)="followUp.emit()">Answer follow-up</button><button class="ghost" type="button" (click)="next.emit()">Next question</button><button class="primary practice-action" type="button" (click)="practice.emit()"><i class="fas fa-redo-alt"></i> Practise improved answer</button></footer>
    </section>`
})
export class BattleEvaluationComponent {
  @Input() answer!: BattleAnswer;
  @Output() next = new EventEmitter<void>(); @Output() end = new EventEmitter<void>(); @Output() practice = new EventEmitter<void>(); @Output() followUp = new EventEmitter<void>(); @Output() save = new EventEmitter<void>();
  answerMode: 'short'|'natural'|'senior' = 'natural';
  constructor(public tts: TextToSpeechService) {}
  get improvement() { return this.answer.evaluation.answerImprovement; }
  get startWith() { return this.improvement.startWith || this.improvement.shortAnswer; }
  get keyPoints() { return this.improvement.keyPointsToInclude?.length ? this.improvement.keyPointsToInclude : this.improvement.idealStructure; }
  get whyThisWorks() { return this.improvement.whyThisWorks || 'It answers directly, explains the mechanism, and demonstrates practical judgment.'; }
  get hasGaps() { const t=this.answer.evaluation.technicalEvaluation; return t.incorrectPoints.length + t.missingPoints.length > 0; }
  get selectedAnswer() { return this.answerMode==='short' ? this.improvement.shortAnswer : this.answerMode==='senior' ? this.improvement.improvedAnswer : this.improvement.easySpokenAnswer; }
}
