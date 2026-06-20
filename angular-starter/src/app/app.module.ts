import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './shared/auth.interceptor';
import { AppComponent } from './app.component';
import { TestPageComponent } from './test-page/test-page.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslocoRootModule } from './transloco-root.module';
import { AppRoutingModule } from './app-routing.module';
// import { PortfolioComponent } from './portfolio/portfolio.component'; // Temporarily disabled - FormsModule issues
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { ContactmeComponent } from './contactme/contactme.component';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
// import { ServicesComponent } from './services/services.component'; // Temporarily disabled
import { SkillsComponent } from './skills/skills.component';
import { ExperienceComponent } from './experience/experience.component';
// import { TestimonialsComponent } from './testimonials/testimonials.component'; // Temporarily disabled
import { AiChatComponent } from './ai-chat/ai-chat.component';
import { SplashScreenComponent } from './splash-screen/splash-screen.component';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RevealOnScrollDirective } from './shared/reveal-on-scroll.directive';
import { InterviewQuestionsComponent } from './interview-questions/interview-questions.component';
import { QuestionsPublicComponent } from './questions-public/questions-public.component';
import { AiQaComponent } from './ai-qa/ai-qa.component';
// MarkdownPipe is now declared + exported by LearningWorkspaceModule (imported below)
// import { LoginComponent } from './login/login.component'; // Temporarily disabled
// import { AuthManagementComponent } from './auth-management/auth-management.component'; // Temporarily disabled
// import { AskAiComponent } from './ai-qa/ask-ai/ask-ai.component'; // Temporarily disabled - API method missing
import { QuestionsListComponent } from './ai-qa/questions-list/questions-list.component';
import { LearnQuestComponent } from './learn-quest/learn-quest.component';
// import { VisualDesignerComponent } from './visual-designer/visual-designer.component'; // Temporarily disabled - needs FormsModule
import { DsaGameComponent } from './dsa-game/dsa-game.component';
import { AzureAiLearnComponent } from './azure-ai-learn/azure-ai-learn.component';
import { MemoryGameComponent } from './memory-game/memory-game.component';
import { AiLoaderComponent } from './shared/ai-loader/ai-loader.component';
import { PromptSelectionModalComponent } from './shared/prompt-selection-modal/prompt-selection-modal.component';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { SafePipe } from './pipes/safe.pipe';
import { NotesComponent } from './notes/notes.component';
import { AuthModalComponent } from './auth-modal/auth-modal.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';
import { MasterConfigComponent } from './master-config/master-config.component';
import { DeploymentComponent } from './deployment/deployment.component';
import { AnalyticsDashboardComponent } from './analytics-dashboard/analytics-dashboard.component';
import { AppConfigService } from './shared/app-config.service';
import { RoadmapComponent } from './roadmap/roadmap.component';
import { InterviewPrepComponent } from './interview-prep/interview-prep.component';
import { SaveNotesModalComponent } from './shared/save-notes-modal/save-notes-modal.component';
import { SubscribeComponent }      from './subscribe/subscribe.component';
import { SubscriptionWallComponent } from './shared/subscription-wall/subscription-wall.component';
import { AdminUsersComponent }       from './admin/admin-users/admin-users.component';
import { LearningWorkspaceModule } from './shared/learning-workspace/learning-workspace.module';
import { CodePlaygroundComponent } from './code-playground/code-playground.component';
import { QuizComponent }          from './quiz/quiz.component';

@NgModule({
  declarations: [
    AppComponent,
    TestPageComponent,
    // PortfolioComponent, // Temporarily disabled - FormsModule issues
    HeaderComponent,
    SplashScreenComponent,
    FooterComponent,
    ContactmeComponent,
    HomeComponent,
    AboutComponent,
    // ServicesComponent, // Temporarily disabled
    SkillsComponent,
    ExperienceComponent,
    // TestimonialsComponent, // Temporarily disabled
    AiChatComponent,
    RevealOnScrollDirective,
    InterviewQuestionsComponent,
    QuestionsPublicComponent,
    AiQaComponent,
    // MarkdownPipe — now via LearningWorkspaceModule
    // LoginComponent, // Temporarily disabled - FormsModule issues
    // AuthManagementComponent, // Temporarily disabled - FormsModule issues
    // AskAiComponent, // Temporarily disabled - API method missing
    QuestionsListComponent,
    LearnQuestComponent,
    // VisualDesignerComponent, // Temporarily disabled - needs FormsModule in separate module
    DsaGameComponent,
    AzureAiLearnComponent,
    MemoryGameComponent,
    AiLoaderComponent,  // AI Loading Animation
    PromptSelectionModalComponent,  // Prompt Selection Modal (NEW)
    AdminLoginComponent,  // Admin Login
    AdminDashboardComponent,  // Admin Dashboard
    SafePipe,  // Safe HTML pipe for AI content
    NotesComponent,  // Saved Notes page
    AuthModalComponent,  // Custom Auth Modal
    UserSettingsComponent,  // User Settings Panel
    MasterConfigComponent,  // Admin Master Config
    DeploymentComponent,    // Admin Deployment Manager
    AnalyticsDashboardComponent, // Admin Analytics Dashboard
    RoadmapComponent,  // Personalized Learning Roadmap
    CodePlaygroundComponent, // Interactive Code Playground
    QuizComponent, // AI-generated module quiz
    InterviewPrepComponent,  // AI-powered Interview Practice
    SaveNotesModalComponent,    // Save conversation to Notes modal
    SubscribeComponent,           // Subscription / payment page
    SubscriptionWallComponent,    // Paywall modal overlay
    AdminUsersComponent,          // Admin user management panel
    // FreeToolsComponent removed
    // AiToolComponent (removed)
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoRootModule,
    AppRoutingModule,
    NgScrollbarModule,
    LearningWorkspaceModule,
    // AdminUsersComponent removed from imports (now in declarations)
  ],
  providers: [
    {
      provide:    APP_INITIALIZER,
      useFactory: (appCfg: AppConfigService) => () => appCfg.load().toPromise(),
      deps:       [AppConfigService],
      multi:      true,
    },
    {
      provide:  HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi:    true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
