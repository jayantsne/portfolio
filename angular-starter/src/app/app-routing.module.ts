import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InterviewQuestionsComponent } from './interview-questions/interview-questions.component';
import { AuthGuard } from './shared/auth.guard';
import { HomeComponent } from './home/home.component';
import { ChatHomeComponent } from './chat-home/chat-home.component';
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
import { LoginGuard }            from './shared/login.guard';
import { SubscribeComponent }    from './subscribe/subscribe.component';
import { SubscriptionGuard }     from './shared/subscription.guard';
import { CodePlaygroundComponent } from './code-playground/code-playground.component';
import { QuizComponent }          from './quiz/quiz.component';
import { SemanticKernelLearnComponent } from './semantic-kernel/semantic-kernel.component';
import { RevisionDashboardComponent } from './revision/revision-dashboard.component';
import { RevisionSessionComponent }  from './revision/revision-session.component';
import { AccountComponent }           from './account/account.component';
import { LayoutComponent }            from './layout/layout.component';
import { VisualLearnComponent }       from './visual-learn/visual-learn.component';
import { FlowGeneratorComponent }     from './flow-generator/flow-generator.component';
import { AuthCallbackComponent }      from './auth-callback/auth-callback.component';
import { AdminGuard }                 from './shared/admin.guard';
import { AdminInterviewPrepComponent } from './admin/admin-interview-prep/admin-interview-prep.component';
import { AdminInterviewPrepImportComponent } from './admin/admin-interview-prep-import/admin-interview-prep-import.component';
import { AndroidReleasesComponent } from './admin/android-releases/android-releases.component';


const routes: Routes = [

  // ── Standalone routes (NO layout shell) ────────────────────────
  // These run without the sidebar/navbar — used for test/debug pages
  { path: 'test', component: TestPageComponent },
  { path: 'auth/google/callback', component: AuthCallbackComponent },

  /**
   * ── App Shell layout routes ─────────────────────────────────────
   *
   * All routes below are CHILDREN of LayoutComponent.
   * LayoutComponent renders:
   *   .layout (flex-row)
   *     app-sidebar  (child #1, fixed width)
   *     .right       (child #2, take remaining width)
   *       app-navbar ← scoped to .right width, NOT full-viewport
   *       .content
   *         <router-outlet> ← child route renders here
   *
   * Adding a route here automatically gives it the full
   * ChatGPT-style sidebar + navbar layout.
   */
  {
    path: '',
    component: LayoutComponent,
    children: [

      // ── Redirects / aliases ──────────────────────────────────────
      { path: 'ai-learn',           redirectTo: '',          pathMatch: 'full' },
      { path: 'ai-learn/questions', redirectTo: 'questions', pathMatch: 'full' },
      { path: 'learn',              redirectTo: '',          pathMatch: 'full' },
      { path: 'learn/ai-tutor',     redirectTo: '',          pathMatch: 'full' },
      { path: 'learn/roadmap',      redirectTo: 'roadmap',   pathMatch: 'full' },
      { path: 'learn/notes',        redirectTo: 'notes',     pathMatch: 'full' },
      { path: 'practice',               redirectTo: 'admin/interview-prep', pathMatch: 'full' },
      { path: 'practice/interview-prep', redirectTo: 'admin/interview-prep', pathMatch: 'full' },
      { path: 'practice/interview-qa',   redirectTo: 'questions',      pathMatch: 'full' },
      { path: 'practice/azure-ai102',    redirectTo: 'azure-ai-102',   pathMatch: 'full' },
      { path: 'home', redirectTo: '', pathMatch: 'full' },
      { path: 'flow', redirectTo: 'flow-generator', pathMatch: 'full' },

      // ── Home / AI Chat ───────────────────────────────────────────
      { path: '',        redirectTo: 'explore', pathMatch: 'full' },
      { path: 'explore', component: HomeComponent     },

      // ── Learn content (requires subscription) ───────────────────
      { path: 'notes',        component: NotesComponent,           canActivate: [LoginGuard, SubscriptionGuard] },
      { path: 'notes-recall/:noteId', loadChildren: () => import('./notes-recall/notes-recall.module').then(m => m.NotesRecallModule), canActivate: [LoginGuard, SubscriptionGuard] },
      { path: 'revision',     component: RevisionDashboardComponent, canActivate: [LoginGuard, SubscriptionGuard] },
      { path: 'revision/session/:noteId', component: RevisionSessionComponent, canActivate: [LoginGuard, SubscriptionGuard] },
      { path: 'learn-quest',  component: LearnQuestComponent,      canActivate: [SubscriptionGuard] },
      { path: 'dsa-game',     component: DsaGameComponent,         canActivate: [SubscriptionGuard] },
      { path: 'memory-game',  component: MemoryGameComponent,      canActivate: [SubscriptionGuard] },
      { path: 'azure-ai-102', component: AzureAiLearnComponent,    canActivate: [SubscriptionGuard] },
      { path: 'roadmap',      component: RoadmapComponent,         canActivate: [LoginGuard, SubscriptionGuard] },
      { path: 'quiz/module/:moduleId', component: QuizComponent,   canActivate: [LoginGuard, SubscriptionGuard] },
      { path: 'playground',   component: CodePlaygroundComponent,  canActivate: [SubscriptionGuard] },
      { path: 'code-playground', component: CodePlaygroundComponent, canActivate: [SubscriptionGuard] },
      { path: 'learn/semantic-kernel', component: SemanticKernelLearnComponent, canActivate: [LoginGuard, SubscriptionGuard] },

      // ── Visual Learning Mode ──────────────────────────────────────
      { path: 'visual-learn', component: VisualLearnComponent },
      { path: 'flow-generator', component: FlowGeneratorComponent },

      // ── Practice ─────────────────────────────────────────────────
      // The legacy roadmap screen is hidden. Keep its URL working by sending
      // web and mobile users to the personal Question Library instead.
      { path: 'interview-prep', redirectTo: 'admin/interview-prep', pathMatch: 'full' },
      { path: 'interview-battle', loadChildren: () => import('./interview-battle/interview-battle.module').then(m => m.InterviewBattleModule), canActivate: [LoginGuard, SubscriptionGuard] },
      { path: 'questions',      component: QuestionsListComponent, canActivate: [SubscriptionGuard] },

      // ── Account / subscription ───────────────────────────────────
      { path: 'subscribe', component: SubscribeComponent },
      { path: 'account',   component: AccountComponent   },

      // ── Admin routes ─────────────────────────────────────────────
      { path: 'admin',           redirectTo: 'admin/users', pathMatch: 'full' },
      { path: 'admin/users',     component: AdminUsersComponent,       canActivate: [AuthGuard] },
      { path: 'admin/questions', component: InterviewQuestionsComponent, canActivate: [AuthGuard] },
      // The question library stores questions and progress per user, so every
      // signed-in user can safely use it. Other admin routes remain protected.
      { path: 'admin/interview-prep', component: AdminInterviewPrepComponent, canActivate: [LoginGuard] },
      { path: 'admin/interview-prep/import', component: AdminInterviewPrepImportComponent, canActivate: [LoginGuard] },
      { path: 'admin/android-releases', component: AndroidReleasesComponent, canActivate: [AdminGuard] },
      { path: 'admin-login',     component: AdminLoginComponent },
      { path: 'admin-dashboard', component: AdminDashboardComponent },
      { path: 'admin-deploy',    component: DeploymentComponent },
      { path: 'admin-analytics', component: AnalyticsDashboardComponent },

      // Fallback inside shell
      { path: '**', redirectTo: '', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      onSameUrlNavigation: 'reload'
    })
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }
