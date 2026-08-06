import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AdminInterviewPrepService } from '../admin/admin-interview-prep/admin-interview-prep.service';
import { NotesService, SavedNote } from '../shared/notes.service';
import { BattleAnswer, BattleQuestion, BattleSession, BattleSetup, BattleSummary, RetryComparison } from './interview-battle.models';
import { InterviewBattleService } from './services/interview-battle.service';

interface PrepLaunchContext {
  questionId: string;
  question: string;
  category: string;
  difficulty: string;
  answerHint: string;
  noteId: string;
}

@Component({
  selector: 'app-interview-battle',
  template: `
    <main class="battle-page">
      <nav class="battle-nav" *ngIf="stage==='setup' && !prepContext">
        <button (click)="library='history'">History</button>
        <button (click)="library='revision'">Revision Battle</button>
        <button (click)="library='mistakes'">English Mistakes</button>
      </nav>

      <section class="battle-workspace-head" *ngIf="prepContext">
        <button class="battle-back" type="button" (click)="returnToPrep()"><i class="fas fa-arrow-left"></i> Interview plan</button>
        <div class="battle-source-copy">
          <span class="battle-source-icon"><i class="fas fa-microphone-alt"></i></span>
          <div><small>FOCUS PRACTICE · {{prepContext.category}}</small><strong>{{prepContext.question}}</strong></div>
        </div>
        <span class="battle-source-note" *ngIf="linkedNote"><i class="fas fa-link"></i> Note connected</span>
      </section>

      <app-battle-library *ngIf="library" [mode]="library" (close)="library=undefined"></app-battle-library>
      <ng-container *ngIf="!library">
        <app-battle-setup *ngIf="stage==='setup' && !prepContext" [starting]="busy" (start)="start($event)"></app-battle-setup>
        <section class="battle-launching" *ngIf="stage==='setup' && prepContext && busy">
          <span class="state-spinner"></span><strong>Preparing your focused interview</strong><p>Bringing the selected question and linked study context into Battle.</p>
        </section>
        <div class="status-success" *ngIf="message" role="status">{{message}}</div>
        <div class="status-error" *ngIf="error" role="alert">{{error}} <button *ngIf="retry" (click)="retry()">Retry</button></div>
        <div class="card comparison" *ngIf="comparison"><strong>Practice improvement</strong><span>Technical {{comparison.firstAttempt.evaluation.technicalEvaluation.score}} → {{comparison.secondAttempt.evaluation.technicalEvaluation.score}}</span><span>English {{comparison.firstAttempt.evaluation.communicationEvaluation.overallScore}} → {{comparison.secondAttempt.evaluation.communicationEvaluation.overallScore}}</span><span>Filler words reduced: {{comparison.fillerWordsReduced}}</span></div>
        <app-battle-session *ngIf="stage==='session'&&session&&question" [session]="session" [question]="question" [submitting]="busy" [startingTranscript]="retryDraft" (submit)="evaluate($event)" (end)="complete()"></app-battle-session>
        <app-battle-evaluation *ngIf="stage==='evaluation'&&answer" [answer]="answer" (practice)="practiceAgain()" (followUp)="followUp()" (save)="saveToNotes()" (next)="nextQuestion()" (end)="complete()"></app-battle-evaluation>
        <app-battle-summary *ngIf="stage==='summary'&&summary" [summary]="summary" (restart)="reset()"></app-battle-summary>
        <div class="battle-flow-actions" *ngIf="prepContext && (stage==='evaluation'||stage==='summary')">
          <button type="button" class="primary" (click)="finishPrepFlow()"><i class="fas fa-check"></i> Mark prepared & return</button>
        </div>
      </ng-container>
    </main>`,
  styleUrls: ['./interview-battle.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class InterviewBattleComponent implements OnInit {
  stage: 'setup'|'session'|'evaluation'|'summary' = 'setup';
  library?: 'history'|'revision'|'mistakes';
  session?: BattleSession; question?: BattleQuestion; answer?: BattleAnswer; summary?: BattleSummary; comparison?: RetryComparison;
  busy=false; error=''; message=''; retryDraft=''; retry?:()=>void; prepContext?:PrepLaunchContext; linkedNote?:SavedNote;
  private pending?:{transcript:string;duration:number;thinking:number}; private retryAnswerId?:string;

  constructor(private api:InterviewBattleService, private notes:NotesService, private prep:AdminInterviewPrepService, private route:ActivatedRoute, private router:Router) {}

  async ngOnInit(): Promise<void> {
    const p=this.route.snapshot.queryParamMap;
    const question=p.get('question');
    if(!question)return;
    this.prepContext={questionId:p.get('questionId')||'',question,category:p.get('category')||'General',difficulty:p.get('difficulty')||'Medium',answerHint:p.get('answerHint')||'',noteId:p.get('noteId')||''};
    if(this.prepContext.noteId){await this.notes.loadNotes();this.linkedNote=this.notes.notes.find(n=>n.id===this.prepContext!.noteId);}
    const difficulty=/hard|senior/i.test(this.prepContext.difficulty)?'Senior':/easy|beginner/i.test(this.prepContext.difficulty)?'Beginner':'Intermediate';
    this.start({role:'Senior .NET Developer',experienceLevel:'6–9 years',technologies:[this.mapTechnology(this.prepContext.category)],interviewType:'Technical',difficulty,interviewerStyle:'Normal',durationMinutes:10,assistanceLevel:'Guided',plannedQuestion:this.prepContext.question,plannedQuestionCategory:this.prepContext.category,plannedAnswerHint:this.prepContext.answerHint,sourceQuestionId:this.prepContext.questionId,sourceNoteId:this.prepContext.noteId});
  }

  start(x:BattleSetup){if(this.busy)return;this.run(()=>this.api.createSession(x),s=>{this.session=s;this.nextQuestion();},()=>this.start(x));}
  nextQuestion(){if(!this.session)return;this.retryAnswerId=undefined;this.retryDraft='';this.comparison=undefined;this.run(()=>this.api.nextQuestion(this.session!.id),q=>{this.question=q;this.stage='session';this.answer=undefined;},()=>this.nextQuestion());}
  evaluate(x:{transcript:string;duration:number;thinking:number}){this.pending=x;if(this.retryAnswerId){this.run(()=>this.api.retry(this.session!.id,this.retryAnswerId!,x.transcript,x.duration,x.thinking),c=>{this.comparison=c;this.answer=c.secondAttempt;this.retryAnswerId=undefined;this.stage='evaluation';},()=>this.evaluate(this.pending!));return;}this.run(()=>this.api.submit(this.session!.id,this.question!.id,x.transcript,x.duration,x.thinking),a=>{this.answer=a;this.stage='evaluation';},()=>this.evaluate(this.pending!));}
  practiceAgain(){if(!this.answer)return;this.retryAnswerId=this.answer.id;this.retryDraft=this.answer.evaluation.answerImprovement.startWith||this.answer.evaluation.answerImprovement.shortAnswer;this.stage='session';}
  followUp(){if(!this.answer)return;this.run(()=>this.api.followUp(this.session!.id,this.answer!.id),q=>{this.question=q;this.answer=undefined;this.stage='session';});}
  async saveToNotes(){if(!this.answer||!this.question)return;try{this.error='';const i=this.answer.evaluation.answerImprovement;const contextId=this.prepContext?.questionId||this.question.id;const content=`## My answer\n${this.answer.transcript}\n\n## Short answer\n${i.shortAnswer}\n\n## Natural spoken answer\n${i.easySpokenAnswer}\n\n## Senior-level answer\n${i.improvedAnswer}`;if(this.linkedNote?.id){await this.notes.mergeNote(this.linkedNote.id,content);this.message='Battle review added to your linked note.';}else{const duplicate=this.notes.findExactDuplicate(this.question.question,content);if(!duplicate){await this.notes.saveNote(this.question.question,this.prepContext?.category||'Interview Battle',content,['interview','practice',this.question.technology],this.prepContext?'admin-interview-prep':'interview-battle',contextId);}this.linkedNote=duplicate||this.notes.getNotesForContext(this.prepContext?'admin-interview-prep':'interview-battle',contextId)[0];this.message=duplicate?'This review is already in Notes.':'Battle review saved to Notes.';}}catch{this.error='Could not save the answer to Notes.';}}
  complete(){if(!this.session)return;this.run(()=>this.api.complete(this.session!.id),s=>{this.summary=s;this.stage='summary';});}
  async finishPrepFlow(){if(this.prepContext?.questionId){try{await this.prep.setCovered(this.prepContext.questionId,true);}catch{this.error='Your result is saved, but prep progress could not be updated.';return;}}this.returnToPrep();}
  returnToPrep(){this.router.navigate(['/admin/interview-prep']);}
  reset(){if(this.prepContext){this.returnToPrep();return;}this.stage='setup';this.session=undefined;this.question=undefined;this.answer=undefined;this.summary=undefined;this.comparison=undefined;this.error='';this.message='';}
  private mapTechnology(category:string){const c=category.toLowerCase();if(c.includes('cache')||c.includes('performance'))return '.NET Core';if(c.includes('sql'))return 'SQL Server';if(c.includes('angular'))return 'Angular';if(c.includes('azure'))return 'Azure';if(c.includes('design'))return 'Design Patterns';return category||'.NET Core';}
  private run<T>(f:()=>Observable<T>,ok:(x:T)=>void,retry?:()=>void){this.busy=true;this.error='';this.retry=undefined;f().pipe(finalize(()=>this.busy=false)).subscribe(x=>ok(x),e=>{this.error=e?.error?.message||e?.error?.title||'That step could not be completed. Your answer is still here.';this.retry=retry;});}
}
