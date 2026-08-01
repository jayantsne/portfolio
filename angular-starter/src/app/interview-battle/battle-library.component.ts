import { Component,EventEmitter,Input,OnChanges,Output,SimpleChanges } from '@angular/core';
import { BattleSession,EnglishMistake,RevisionItem } from './interview-battle.models';
import { InterviewBattleService } from './services/interview-battle.service';
import { TextToSpeechService } from './services/text-to-speech.service';
@Component({selector:'app-battle-library',template:`
<section class="library">
  <button class="back-link" type="button" (click)="close.emit()" aria-label="Back to Interview Battle">← Interview Battle</button>
  <header>
    <span class="eyebrow">{{mode==='history'?'INTERVIEW HISTORY':mode==='revision'?'REVISION BATTLE':'MY ENGLISH MISTAKES'}}</span>
    <h1>{{title}}</h1>
  </header>
  <div *ngIf="loading" class="library-state"><span class="state-spinner"></span><strong>Loading your practice data</strong></div>

  <ng-container *ngIf="!loading && mode==='history'">
    <div class="library-state" *ngIf="!history.length"><strong>No interviews yet</strong><p>Complete your first battle and your progress will appear here.</p><button class="primary" (click)="close.emit()">Start a battle</button></div>
    <article class="card list-row" *ngFor="let x of history"><div><strong>{{x.role}}</strong><p>{{x.startedAt|date:'medium'}} · {{x.technologies.join(', ')}}</p></div><span class="score-badge">{{x.overallScore||0}}%</span></article>
  </ng-container>

  <ng-container *ngIf="!loading && mode==='revision'">
    <div class="library-state" *ngIf="!revision.length"><strong>You’re all caught up</strong><p>Weak topics from completed interviews will be scheduled here for focused revision.</p><button class="primary" (click)="close.emit()">Practice now</button></div>
    <article class="card list-row" *ngFor="let x of revision"><div><strong>{{x.technology}} — {{x.question}}</strong><p>Due {{x.nextRevisionAt|date:'mediumDate'}} · Technical {{x.technicalScore}}/10 · English {{x.englishScore}}/10</p><p *ngIf="x.missingConcepts.length">Missing: {{x.missingConcepts.join(', ')}}</p></div><button class="primary" (click)="attempt(x)">Record revision</button></article>
  </ng-container>

  <ng-container *ngIf="!loading && mode==='mistakes'">
    <label class="library-filter">Filter<select [(ngModel)]="type" (change)="load()"><option value="">All types</option><option *ngFor="let x of types">{{x}}</option></select></label>
    <div class="library-state" *ngIf="!mistakes.length"><strong>No mistakes to review</strong><p>Language corrections from your answers will collect here automatically.</p><button class="primary" (click)="close.emit()">Start a battle</button></div>
    <article class="card mistake" *ngFor="let x of mistakes"><del>{{x.originalSentence}}</del><strong>{{x.correctedSentence}}</strong><p>{{x.explanation}} · Seen {{x.occurrenceCount}} time(s)</p><div class="card-actions"><button class="ghost" (click)="tts.speak(x.easyToSpeakSentence||x.correctedSentence)">Listen</button><button class="primary" (click)="master(x)">{{x.mastered?'Restore':'Mark mastered'}}</button></div></article>
  </ng-container>
</section>`})
export class BattleLibraryComponent implements OnChanges{
 @Input()mode:'history'|'revision'|'mistakes'='history';@Output()close=new EventEmitter<void>();history:BattleSession[]=[];revision:RevisionItem[]=[];mistakes:EnglishMistake[]=[];loading=false;type='';types=['Verb tense','Missing article','Subject-verb agreement','Preposition','Plural or singular','Sentence structure'];
 constructor(private api:InterviewBattleService,public tts:TextToSpeechService){} get title(){return this.mode==='history'?'See how your interviews are progressing':this.mode==='revision'?'Strengthen weak topics':'Turn repeated errors into confident sentences';}ngOnChanges(_:SimpleChanges){this.load();}
 load(){this.loading=true;if(this.mode==='history'){this.api.history().subscribe(x=>{this.history=x;this.loading=false;},()=>this.loading=false);return;}if(this.mode==='revision'){this.api.revision().subscribe(x=>{this.revision=x;this.loading=false;},()=>this.loading=false);return;}this.api.mistakes(this.type).subscribe(x=>{this.mistakes=x;this.loading=false;},()=>this.loading=false);}
 attempt(x:RevisionItem){this.api.revisionAttempt(x.id,x.technicalScore,x.englishScore).subscribe(()=>this.load());}master(x:EnglishMistake){this.api.markMistake(x.id,!x.mastered).subscribe(()=>this.load());}
}
