import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { TranslocoRootModule } from './transloco-root.module';
import { AppRoutingModule } from './app-routing.module';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { ContactmeComponent } from './contactme/contactme.component';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { ServicesComponent } from './services/services.component';
import { SkillsComponent } from './skills/skills.component';
import { ExperienceComponent } from './experience/experience.component';
import { TestimonialsComponent } from './testimonials/testimonials.component';
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
import { LoginComponent } from './login/login.component';
import { NamespaceManagementComponent } from './namespace-management/namespace-management.component';
import { AuthManagementComponent } from './auth-management/auth-management.component';
@NgModule({
  declarations: [
    AppComponent,
    PortfolioComponent,
    HeaderComponent,
    SplashScreenComponent,
    FooterComponent,
    ContactmeComponent,
    HomeComponent,
    AboutComponent,
    ServicesComponent,
    SkillsComponent,
    ExperienceComponent,
    TestimonialsComponent,
    AiChatComponent,
    RevealOnScrollDirective,
    InterviewQuestionsComponent,
    MainPortfolioComponent,
    QuestionsPublicComponent,
    AiQaComponent,
    MarkdownPipe,
    LoginComponent,
    NamespaceManagementComponent,
    AuthManagementComponent
  ],
  imports: [
    RouterModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    TranslocoRootModule,
    AppRoutingModule,
    NgScrollbarModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
