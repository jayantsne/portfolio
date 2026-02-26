import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TestPageComponent } from './test-page/test-page.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
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
import { FormsModule } from '@angular/forms';
import { RevealOnScrollDirective } from './shared/reveal-on-scroll.directive';
import { InterviewQuestionsComponent } from './interview-questions/interview-questions.component';
import { MainPortfolioComponent } from './main-portfolio/main-portfolio.component';
import { QuestionsPublicComponent } from './questions-public/questions-public.component';
import { AiQaComponent } from './ai-qa/ai-qa.component';
import { MarkdownPipe } from './shared/markdown.pipe';
// import { LoginComponent } from './login/login.component'; // Temporarily disabled
// import { NamespaceManagementComponent } from './namespace-management/namespace-management.component'; // Temporarily disabled
// import { AuthManagementComponent } from './auth-management/auth-management.component'; // Temporarily disabled
// import { AskAiComponent } from './ai-qa/ask-ai/ask-ai.component'; // Temporarily disabled - API method missing
import { QuestionsListComponent } from './ai-qa/questions-list/questions-list.component';
import { LearnQuestComponent } from './learn-quest/learn-quest.component';
// import { VisualDesignerComponent } from './visual-designer/visual-designer.component'; // Temporarily disabled - needs FormsModule
import { DsaGameComponent } from './dsa-game/dsa-game.component';
import { AzureAiLearnComponent } from './azure-ai-learn/azure-ai-learn.component';
import { MemoryGameComponent } from './memory-game/memory-game.component';

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
    MainPortfolioComponent,
    QuestionsPublicComponent,
    AiQaComponent,
    MarkdownPipe,
    // LoginComponent, // Temporarily disabled - FormsModule issues
    // NamespaceManagementComponent, // Temporarily disabled - FormsModule/DatePipe issues
    // AuthManagementComponent, // Temporarily disabled - FormsModule issues
    // AskAiComponent, // Temporarily disabled - API method missing
    QuestionsListComponent,
    LearnQuestComponent,
    // VisualDesignerComponent, // Temporarily disabled - needs FormsModule in separate module
    DsaGameComponent,
    AzureAiLearnComponent,
    MemoryGameComponent,
    // FreeToolsComponent removed
    // AiToolComponent (removed)
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    TranslocoRootModule,
    AppRoutingModule,
    NgScrollbarModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
