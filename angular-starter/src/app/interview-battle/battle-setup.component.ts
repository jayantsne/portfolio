import { Component,EventEmitter,Output } from '@angular/core';
import { FormBuilder,Validators } from '@angular/forms';
import { BattleSetup } from './interview-battle.models';

@Component({selector:'app-battle-setup',template:`
<section class="card setup simple-setup">
  <header class="setup-intro">
    <span class="eyebrow">INTERVIEW BATTLE</span>
    <h1>What do you want to practise?</h1>
    <p>Set your focus and start. We’ll adapt the interview as you answer.</p>
  </header>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <section class="setup-section">
      <div class="setup-step"><span>1</span><div><strong>Your interview target</strong><small>We use this to choose relevant questions.</small></div></div>
      <div class="target-grid">
        <label>Role<select formControlName="role"><option *ngFor="let x of roles" [ngValue]="x">{{x}}</option></select></label>
        <label>Experience<select formControlName="experienceLevel"><option *ngFor="let x of levels" [ngValue]="x">{{x}}</option></select></label>
      </div>
      <label *ngIf="form.value.role==='Custom Role'">Custom role<input formControlName="customRole" maxlength="100" placeholder="e.g. Azure Solutions Architect"></label>
    </section>

    <section class="setup-section focus-section">
      <div class="setup-step"><span>2</span><div><strong>Choose your focus</strong><small>Select one or two topics for a focused session.</small></div><em>{{selected.length}} selected</em></div>
      <div class="focus-chips">
        <button type="button" *ngFor="let x of visibleTech" [class.on]="selected.includes(x)" (click)="toggle(x)"><i class="fas" [class.fa-check]="selected.includes(x)" [class.fa-plus]="!selected.includes(x)"></i>{{x}}</button>
      </div>
      <button class="more-topics" type="button" (click)="showAllTopics=!showAllTopics">{{showAllTopics?'Show fewer topics':'More topics'}} <i class="fas" [class.fa-chevron-up]="showAllTopics" [class.fa-chevron-down]="!showAllTopics"></i></button>
      <p class="error" *ngIf="submitted&&selected.length===0">Choose at least one topic to continue.</p>
    </section>

    <details class="advanced-settings">
      <summary><span><i class="fas fa-sliders-h"></i><strong>Customize interview</strong><small>{{form.value.difficulty}} · {{form.value.durationMinutes}} min · {{form.value.assistanceLevel}}</small></span><i class="fas fa-chevron-down"></i></summary>
      <div class="advanced-grid">
        <label>Interview type<select formControlName="interviewType"><option *ngFor="let x of types" [ngValue]="x">{{x}}</option></select></label>
        <label>Difficulty<select formControlName="difficulty"><option *ngFor="let x of difficulties" [ngValue]="x">{{x}}</option></select></label>
        <label>Interviewer style<select formControlName="interviewerStyle"><option *ngFor="let x of styles" [ngValue]="x">{{x}}</option></select></label>
        <label>Duration<select formControlName="durationMinutes"><option *ngFor="let x of durations" [ngValue]="x">{{x}} minutes</option></select></label>
        <label>Assistance<select formControlName="assistanceLevel"><option *ngFor="let x of assistance" [ngValue]="x">{{x}}</option></select></label>
      </div>
    </details>

    <footer class="start-panel">
      <div><span class="ready-icon"><i class="fas fa-microphone-alt"></i></span><p><strong>Ready for a {{form.value.durationMinutes}}-minute practice</strong><small>{{selected.join(' + ') || 'Choose a focus topic'}} · {{form.value.difficulty}}</small></p></div>
      <button class="primary" [disabled]="form.invalid||!selected.length" type="submit">Start practice <i class="fas fa-arrow-right"></i></button>
    </footer>
  </form>
</section>`})
export class BattleSetupComponent {
  @Output() start=new EventEmitter<BattleSetup>();
  submitted=false; showAllTopics=false;
  roles=['Senior .NET Developer','Full Stack Developer','Technical Lead','Engineering Manager','Backend Developer','Custom Role'];
  levels=['0–2 years','3–5 years','6–9 years','10+ years'];
  tech=['C#','ASP.NET Core','.NET Core','Web API','SQL Server','Entity Framework Core','Angular','Azure','Microservices','System Design','PostgreSQL','JavaScript','TypeScript','Design Patterns','Oracle PL/SQL'];
  types=['Technical','English Practice','Mixed Technical and English','Project Discussion','Behavioural','Managerial'];
  difficulties=['Beginner','Intermediate','Senior','Expert']; styles=['Friendly','Normal','Strict','Rapid Fire']; durations=[5,10,20,30]; assistance=['Guided','Keyword Hints','No Hints','Real Interview'];
  selected=['C#','ASP.NET Core'];
  form=this.fb.group({role:['Senior .NET Developer',Validators.required],customRole:[''],experienceLevel:['6–9 years',Validators.required],interviewType:['Technical',Validators.required],difficulty:['Senior',Validators.required],interviewerStyle:['Normal',Validators.required],durationMinutes:[10,Validators.required],assistanceLevel:['Guided',Validators.required]});
  constructor(private fb:FormBuilder){}
  get visibleTech(){return this.showAllTopics?this.tech:this.tech.slice(0,8);}
  toggle(x:string){this.selected=this.selected.includes(x)?this.selected.filter(t=>t!==x):(this.selected.length>=3?[...this.selected.slice(1),x]:[...this.selected,x]);}
  submit(){this.submitted=true;if(this.form.invalid||!this.selected.length)return;const v=this.form.value;this.start.emit({...v,role:v.role==='Custom Role'?(v.customRole||'Custom Role'):v.role,technologies:this.selected} as BattleSetup);}
}
