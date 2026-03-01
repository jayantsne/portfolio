import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// import { PortfolioComponent } from './portfolio/portfolio.component'; // Temporarily disabled
// import { AppComponent } from './app.component'; // Not needed in routing
import { InterviewQuestionsComponent } from './interview-questions/interview-questions.component';
import { AuthGuard } from './shared/auth.guard';
import { HomeComponent } from './home/home.component';
// import { QuestionsPublicComponent } from './questions-public/questions-public.component'; // Temporarily disabled
// import { AiQaComponent } from './ai-qa/ai-qa.component'; // Removed - replaced by HomeComponent
// import { LoginComponent } from './login/login.component'; // Temporarily disabled
// import { NamespaceManagementComponent } from './namespace-management/namespace-management.component'; // Temporarily disabled
// import { AuthManagementComponent } from './auth-management/auth-management.component'; // Temporarily disabled
// import { AskAiComponent } from './ai-qa/ask-ai/ask-ai.component'; // Temporarily disabled
import { QuestionsListComponent } from './ai-qa/questions-list/questions-list.component';
import { LearnQuestComponent } from './learn-quest/learn-quest.component';
// import { VisualDesignerComponent } from './visual-designer/visual-designer.component'; // Temporarily disabled
import { DsaGameComponent } from './dsa-game/dsa-game.component';
import { AzureAiLearnComponent } from './azure-ai-learn/azure-ai-learn.component';
import { MemoryGameComponent } from './memory-game/memory-game.component';
import { TestPageComponent } from './test-page/test-page.component';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { NotesComponent } from './notes/notes.component';
import { DeploymentComponent } from './deployment/deployment.component';


const routes: Routes = [
  // Test page for debugging reload issues
  { path: 'test', component: TestPageComponent },
  
  // Home page - AI Interactive Concept Explainer
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },

  // Saved Notes (requires Google Sign-In)
  { path: 'notes', component: NotesComponent },
  
  // { path: 'login', component: LoginComponent }, // Temporarily disabled
  // { path: 'tools', component: FreeToolsComponent }, // Free Tools - Public (removed)
  
  // Direct access to games (outside ai-qa parent)
  { path: 'learn-quest', component: LearnQuestComponent },
  { path: 'dsa-game', component: DsaGameComponent },
  { path: 'memory-game', component: MemoryGameComponent },
  { path: 'azure-ai-102', component: AzureAiLearnComponent },
  { path: 'questions', component: QuestionsListComponent }, // Practice questions
  
  // { path: 'questions', component: QuestionsPublicComponent }, // Public access - Temporarily disabled
  // { path: 'ai-tool', component: AiToolComponent }, // Unique AI Tool page (removed)
  { path: 'admin', component: InterviewQuestionsComponent, canActivate: [AuthGuard] }, // Admin only for managing questions
  // { path: 'auth-management', component: AuthManagementComponent, canActivate: [AuthGuard] }, // Temporarily disabled
  // { path: 'namespaces', component: NamespaceManagementComponent, canActivate: [AuthGuard] }, // Temporarily disabled
  //{ path: '', redirectTo: '/home', pathMatch: 'full' },
  
  // AI Provider Admin (standalone, not linked from main app)
  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  // Deployment Manager — JWT ADMIN + localhost enforced at backend level
  { path: 'admin-deploy', component: DeploymentComponent },
]

@NgModule({
  
  imports: [
    RouterModule.forRoot(routes)
  ],
  declarations: [ ],
  exports: [RouterModule]
})


export class AppRoutingModule { }
