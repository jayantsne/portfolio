import { Component,EventEmitter,Input,OnDestroy,OnInit,Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { BattleQuestion,BattleSession } from './interview-battle.models';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { TextToSpeechService } from './services/text-to-speech.service';

@Component({selector:'app-battle-session',template:`
<section class="session">
  <header class="session-head"><div><span class="live-dot"></span> {{session.role}}</div><strong>Question {{question.sequence}}</strong><span>{{question.technology}} · {{session.difficulty}}</span></header>
  <div class="battle-grid">
    <article class="card interviewer"><div class="avatar" aria-hidden="true">AI</div><span class="eyebrow">YOUR INTERVIEWER</span><h2>{{question.question}}</h2><button class="ghost" (click)="tts.speak(question.question)"><i class="fas fa-volume-up"></i> Listen</button></article>
    <article class="card recorder"><div class="retry-draft" *ngIf="startingTranscript"><i class="fas fa-redo-alt"></i> Your coached opening is ready. Rewrite it in your own words, then complete the answer.</div><div class="thinking" *ngIf="thinking>0">Thinking time <strong>{{thinking}}</strong></div><label for="transcript">Your answer</label><textarea id="transcript" [(ngModel)]="transcript" maxlength="12000" placeholder="Your live transcript appears here. You can also type your answer."></textarea><p class="error" role="alert" *ngIf="error">{{error}}</p><div class="record-controls"><button class="mic" [class.recording]="recording" (click)="toggleRecording()"><i class="fas" [class.fa-stop]="recording" [class.fa-microphone]="!recording"></i></button><span>{{recording?'Recording…':'Tap to answer'}}</span><span>{{duration}}s</span></div></article>
    <aside class="card coach"><span class="eyebrow">ANSWER COACH</span><ng-container *ngIf="showHints"><ol><li *ngFor="let x of question.answerFramework">{{x}}</li></ol></ng-container><p *ngIf="!showHints">Real interview mode — feedback appears after submission.</p><button class="primary" [disabled]="submitting||!transcript.trim()" (click)="submit.emit({transcript:transcript.trim(),duration:duration,thinking:5-thinking})">{{submitting?'Evaluating…':'Submit answer'}}</button><button class="danger" (click)="end.emit()">End interview</button></aside>
  </div>
</section>`})
export class BattleSessionComponent implements OnInit,OnDestroy {
  @Input() session!:BattleSession; @Input() question!:BattleQuestion; @Input() submitting=false; @Input() startingTranscript='';
  @Output() submit=new EventEmitter<{transcript:string;duration:number;thinking:number}>(); @Output() end=new EventEmitter<void>();
  transcript='';recording=false;error='';duration=0;thinking=5;private subs=new Subscription();private timer:any;
  constructor(public speech:SpeechRecognitionService,public tts:TextToSpeechService){}
  get showHints(){return !['No Hints','Real Interview'].includes(this.session.assistanceLevel);}
  ngOnInit(){this.transcript=this.startingTranscript;this.tts.speak(this.question.question);this.timer=setInterval(()=>{if(this.thinking>0)this.thinking--;if(this.recording)this.duration=this.speech.durationSeconds;},1000);this.subs.add(this.speech.transcript$.subscribe(x=>{if(x)this.transcript=x;}));this.subs.add(this.speech.recording$.subscribe(x=>this.recording=x));this.subs.add(this.speech.error$.subscribe(x=>this.error=x));}
  toggleRecording(){if(this.recording)this.speech.stop();else this.speech.start(this.transcript?this.transcript+' ':'');}
  ngOnDestroy(){clearInterval(this.timer);this.speech.stop();this.tts.stop();this.subs.unsubscribe();}
}
