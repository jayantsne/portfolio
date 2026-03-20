import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InterviewQuestionsComponent } from './interview-questions/interview-questions.component';
import { AuthGuard } from './shared/auth.guard';
import { HomeComponent } from './home/home.component';
import { QuestionsListComponent } from './ai-qa/questions-list/questions-list.component';
import { LearnQuestComponent } from './learn-quest/learn-quest.component';
import { DsaGameComponent } from './dsa-game/dsa-game.component';
import { AzureAiLearnComponent } from './azure-ai-learn/azure-ai-learn.component';
import { MemoryGameComponent }   from './memory-game/memory-game.component';
import { TestPageComponent }     from './test-page/test-page.component';
import { AdminLoginComponent }   from './admin/admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent }   from './admin/admin-users/admin-users.component';
import { NotesComponent }        from './notes/notes.component';
import { DeploymentComponent }   from './deployment/deployment.component';
import { AnalyticsDashboardComponent } from './analytics-dashboard/analytics-dashboard.component';
import { RoadmapComponent }      from './roadmap/roadmap.component';
import { InterviewPrepComponent } from './interview-prep/interview-prep.component';
import { LoginGuard }            from './shared/login.guard';
import { SubscribeComponent }    from './subscribe/subscribe.component';
import { SubscriptionGuard }     from './shared/subscription.guard';
import { CodePlaygroundComponent } from './code-playground/code-playground.component';
import { QuizComponent }          from './quiz/quiz.component';


const routes: Routes = [
  // ── Test / debug ────────────────────────────────────────────────
  { path: 'test', component: TestPageComponent },

  // ── Home ─────────────────────────────────────────────────────────
  { path: '',    component: HomeComponent },
  { path: 'home', component: HomeComponent },

  // ── /learn/* aliases → existing flat routes ──────────────────────
  { path: 'ai-learn',          redirectTo: 'home',         pathMatch: 'full' },
  { path: 'ai-learn/questions', redirectTo: 'questions',   pathMatch: 'full' },
  { path: 'learn',              redirectTo: 'home',         pathMatch: 'full' },
  { path: 'learn/ai-tutor',    redirectTo: 'home',         pathMatch: 'full' },
  { path: 'learn/roadmap',     redirectTo: 'roadmap',      pathMatch: 'full' },
  { path: 'learn/notes',       redirectTo: 'notes',        pathMatch: 'full' },

  // ── /practice/* aliases → existing flat routes ──────────────────
  { path: 'practice',                  redirectTo: 'interview-prep', pathMatch: 'full' },
  { path: 'practice/interview-prep',   redirectTo: 'interview-prep', pathMatch: 'full' },
  { path: 'practice/interview-qa',     redirectTo: 'questions',      pathMatch: 'full' },
  { path: 'practice/azure-ai102',      redirectTo: 'azure-ai-102',   pathMatch: 'full' },

  // ── Learn content (requires subscription) ────────────────────────
  { path: 'notes',        component: NotesComponent,         canActivate: [LoginGuard, SubscriptionGuard] },
  { path: 'learn-quest',  component: LearnQuestComponent,    canActivate: [SubscriptionGuard] },
  { path: 'dsa-game',     component: DsaGameComponent,       canActivate: [SubscriptionGuard] },
  { path: 'memory-game',  component: MemoryGameComponent,    canActivate: [SubscriptionGuard] },
  { path: 'azure-ai-102', component: AzureAiLearnComponent,  canActivate: [SubscriptionGuard] },
  { path: 'roadmap',      component: RoadmapComponent,       canActivate: [LoginGuard, SubscriptionGuard] },
  { path: 'quiz/module/:moduleId', component: QuizComponent, canActivate: [LoginGuard, SubscriptionGuard] },
  { path: 'playground',   component: CodePlaygroundComponent, canActivate: [SubscriptionGuard] },

  // ── Practice (public) ──────────────────────────────────────────────
  { path: 'interview-prep', component: InterviewPrepComponent },

  // ── Practice Q&A (requires subscription) ────────────────────────────
  { path: 'questions',      component: QuestionsListComponent,  canActivate: [SubscriptionGuard] },

  // ── Subscription / payment ───────────────────────────────────────
  { path: 'subscribe', component: SubscribeComponent },

  // ── Admin routes (requires admin role via AuthGuard) ─────────────
  { path: 'admin',           redirectTo: 'admin/users',           pathMatch: 'full' },
  { path: 'admin/users',     component: AdminUsersComponent,      canActivate: [AuthGuard] },
  { path: 'admin/questions', component: InterviewQuestionsComponent, canActivate: [AuthGuard] },

  // ── Standalone admin tools (JWT-guarded at backend level) ────────
  { path: 'admin-login',     component: AdminLoginComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'admin-deploy',    component: DeploymentComponent },
  { path: 'admin-analytics', component: AnalyticsDashboardComponent },

  // ── Fallback — unknown paths go to home (no blank page on refresh)
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { useHash: true })
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }
