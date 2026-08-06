import { Component,EventEmitter,Input,OnDestroy,OnInit,Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { BattleQuestion,BattleSession } from './interview-battle.models';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { TextToSpeechService } from './services/text-to-speech.service';

@Component({selector:'app-battle-session',template:`
<section class="session">
  <header class="session-head">
    <div><span class="live-dot"></span> {{session.role}}</div>
    <strong>Question {{question.sequence}}</strong>
    <span>{{question.technology}} · {{session.difficulty}}</span>
  </header>
  <div class="battle-grid">
    <article class="card interviewer">
      <div class="avatar" aria-hidden="true"><i class="fas fa-robot"></i></div>
      <span class="eyebrow">YOUR INTERVIEWER</span>
      <h2>{{question.question}}</h2>
      <button class="ghost listen-button" type="button" (click)="tts.speak(question.question)"><i class="fas fa-volume-up"></i> Listen again</button>
    </article>
    <article class="card recorder">
      <div class="recorder-heading">
        <div><span class="eyebrow">YOUR RESPONSE</span><strong>Answer naturally or type below</strong></div>
        <div class="thinking" *ngIf="thinking>0">Think <strong>{{thinking}}s</strong></div>
      </div>
      <div class="retry-draft" *ngIf="startingTranscript"><i class="fas fa-redo-alt"></i> Your coached opening is ready. Rewrite it in your own words, then complete the answer.</div>
      <label class="sr-only" for="transcript">Your answer</label>
      <textarea id="transcript" [(ngModel)]="transcript" maxlength="12000" placeholder="Your live transcript appears here. You can also type your answer."></textarea>
      <p class="error" role="alert" *ngIf="error">{{error}}</p>
      <div class="record-controls">
        <button class="mic" type="button" [disabled]="submitting" [class.recording]="recording" (click)="toggleRecording()" [attr.aria-label]="recording?'Stop recording':'Start recording'"><i class="fas" [class.fa-stop]="recording" [class.fa-microphone]="!recording"></i></button>
        <div class="record-status"><strong>{{recording?'Listening…':'Tap to answer'}}</strong><small>{{duration}}s{{speech.supported?'':' · microphone unavailable'}}</small></div>
      </div>
    </article>
    <aside class="card coach">
      <div class="coach-intro">
        <span class="eyebrow">ANSWER COACH</span>
        <h3>{{showHints?'A simple structure to follow':'Real interview mode'}}</h3>
        <p>{{showHints?'Use these points as a guide—not a script.':'Answer without hints. Feedback appears after submission.'}}</p>
      </div>
      <ol *ngIf="showHints"><li *ngFor="let x of question.answerFramework">{{x}}</li></ol>
      <div class="no-hints" *ngIf="!showHints"><i class="fas fa-shield-alt"></i><span>Hints are hidden for this interview.</span></div>
      <div class="session-actions">
        <button class="primary" [disabled]="submitting||!transcript.trim()" (click)="submitAnswer()">{{submitting?'Evaluating…':'Submit answer'}} <i class="fas fa-arrow-right" *ngIf="!submitting"></i></button>
        <button class="danger" [disabled]="submitting" (click)="endInterview()">End interview</button>
      </div>
    </aside>
  </div>
</section>`})
export class BattleSessionComponent implements OnInit,OnDestroy {
  @Input() session!:BattleSession; @Input() question!:BattleQuestion; @Input() submitting=false; @Input() startingTranscript='';
  @Output() submit=new EventEmitter<{transcript:string;duration:number;thinking:number}>(); @Output() end=new EventEmitter<void>();
  transcript='';recording=false;error='';duration=0;thinking=5;private subs=new Subscription();private timer:any;
  constructor(public speech:SpeechRecognitionService,public tts:TextToSpeechService){}
  get showHints(){return !['No Hints','Real Interview'].includes(this.session.assistanceLevel);}
  ngOnInit(){this.speech.reset();this.transcript=this.startingTranscript;this.tts.speak(this.question.question);this.timer=setInterval(()=>{if(this.thinking>0)this.thinking--;if(this.recording)this.duration=this.speech.durationSeconds;},1000);this.subs.add(this.speech.transcript$.subscribe(x=>{if(x)this.transcript=x;}));this.subs.add(this.speech.recording$.subscribe(x=>this.recording=x));this.subs.add(this.speech.error$.subscribe(x=>this.error=x));}
  toggleRecording(){if(this.recording)this.speech.stop();else this.speech.start(this.transcript?this.transcript+' ':'');}
  submitAnswer(){if(this.submitting||!this.transcript.trim())return;this.speech.stop();this.submit.emit({transcript:this.transcript.trim(),duration:this.duration,thinking:5-this.thinking});}
  endInterview(){if(this.submitting)return;this.speech.stop();this.end.emit();}
  ngOnDestroy(){clearInterval(this.timer);this.speech.stop();this.tts.stop();this.subs.unsubscribe();}
}
