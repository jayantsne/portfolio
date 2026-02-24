import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router'
import { PortfolioComponent } from './portfolio/portfolio.component';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { InterviewQuestionsComponent } from './interview-questions/interview-questions.component';
import { AuthGuard } from './shared/auth.guard';
import { MainPortfolioComponent } from './main-portfolio/main-portfolio.component';
import { QuestionsPublicComponent } from './questions-public/questions-public.component';
import { AiQaComponent } from './ai-qa/ai-qa.component';
import { LoginComponent } from './login/login.component';
import { NamespaceManagementComponent } from './namespace-management/namespace-management.component';
import { AuthManagementComponent } from './auth-management/auth-management.component';

const routes: Routes = [
  { path: '', component: AiQaComponent }, // AI Learn App as default
  { path: 'home', component: MainPortfolioComponent },
  { path: 'portfolio', component: MainPortfolioComponent }, // Portfolio accessible via /portfolio
  { path: 'login', component: LoginComponent },
  { path: 'ai-qa', component: AiQaComponent },
  { path: 'questions', component: QuestionsPublicComponent }, // Public access
  { path: 'admin', component: InterviewQuestionsComponent, canActivate: [AuthGuard] }, // Admin only
  { path: 'auth-management', component: AuthManagementComponent, canActivate: [AuthGuard] }, // Authentication management
  { path: 'namespaces', component: NamespaceManagementComponent, canActivate: [AuthGuard] }, // Database namespace management
]

@NgModule({
  
  imports: [
    BrowserModule,
    CommonModule,
    RouterModule.forRoot(routes)
  ],
  declarations: [ ],
})


export class AppRoutingModule { }
