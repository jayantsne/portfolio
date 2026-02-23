import { Component, OnInit } from '@angular/core';

interface Project {
  id: number;
  title: string;
  category: string;
  technologies: string[];
  description: string;
  imageSmall: string;
  imageLarge: string;
  link: string;
  impactScore?: number;
  aiInsights?: string[];
  complexity?: string;
  yearLevel?: string;
  marketDemand?: number;
  similarProjects?: number[];
}

interface AIRecommendation {
  type: 'skill' | 'project' | 'trend' | 'career';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css', './portfolio-ai-features.css']
})
export class PortfolioComponent implements OnInit {
  showAIPanel = false;
  selectedRole = 'all';
  aiAnalysisActive = false;
  showAIChat = false;
  aiChatMessages: { role: 'user' | 'ai'; message: string }[] = [];
  userMessage = '';
  aiRecommendations: AIRecommendation[] = [];
  selectedProject: Project | null = null;
  showProjectDetails = false;

  projects: Project[] = [
    {
      id: 1,
      title: 'Web Design',
      category: 'design',
      technologies: ['HTML', 'CSS', 'JavaScript'],
      description: 'Modern responsive web design',
      imageSmall: '../../assets/images/portfolio/1-small.png',
      imageLarge: '../../assets/images/portfolio/1.jpg',
      link: 'https://dribbble.com'
    },
    {
      id: 2,
      title: 'Web Development',
      category: 'development',
      technologies: ['Angular', 'TypeScript', 'Node.js'],
      description: 'Full-stack web application',
      imageSmall: '../../assets/images/portfolio/2-small.png',
      imageLarge: '../../assets/images/portfolio/2.jpg',
      link: 'https://github.com'
    },
    {
      id: 3,
      title: 'Audio Mixing',
      category: 'media',
      technologies: ['Audio Engineering', 'DAW'],
      description: 'Professional audio mixing',
      imageSmall: '../../assets/images/portfolio/3-small.png',
      imageLarge: '../../assets/images/portfolio/3.jpg',
      link: 'https://soundcloud.com/'
    },
    {
      id: 4,
      title: 'Video Editing',
      category: 'media',
      technologies: ['After Effects', 'Premiere Pro'],
      description: 'Professional video editing',
      imageSmall: '../../assets/images/portfolio/4-small.png',
      imageLarge: '../../assets/images/portfolio/4.jpg',
      link: 'https://www.adobe.com/'
    },
    {
      id: 5,
      title: 'Photography',
      category: 'design',
      technologies: ['Photoshop', 'Lightroom'],
      description: 'Professional photography',
      imageSmall: '../../assets/images/portfolio/5-small.png',
      imageLarge: '../../assets/images/portfolio/5.jpg',
      link: 'https://www.adobe.com/'
    },
    {
      id: 6,
      title: 'App Development',
      category: 'development',
      technologies: ['Android', 'Kotlin', 'Java'],
      description: 'Native Android app development',
      imageSmall: '../../assets/images/portfolio/6-small.png',
      imageLarge: '../../assets/images/portfolio/6.jpg',
      link: 'https://www.android.com/'
    },
    {
      id: 7,
      title: 'App Design',
      category: 'design',
      technologies: ['Flutter', 'Dart', 'Material Design'],
      description: 'Cross-platform app design',
      imageSmall: '../../assets/images/portfolio/7-small.png',
      imageLarge: '../../assets/images/portfolio/7.jpg',
      link: 'https://flutter.dev/'
    },
    {
      id: 8,
      title: 'App Development',
      category: 'development',
      technologies: ['Flutter', 'Dart', 'Firebase'],
      description: 'Cross-platform app development',
      imageSmall: '../../assets/images/portfolio/8-small.png',
      imageLarge: '../../assets/images/portfolio/8.jpg',
      link: 'https://flutter.dev/'
    }
  ];

  constructor() { }

  ngOnInit(): void {
    this.calculateImpactScores();
    this.analyzeProjectComplexity();
    this.calculateMarketDemand();
    this.findSimilarProjects();
    this.generateAIRecommendations();
    this.initAIChat();
  }

  toggleAIPanel(): void {
    this.showAIPanel = !this.showAIPanel;
  }

  setRole(role: string): void {
    this.selectedRole = role;
  }

  toggleAIAnalysis(): void {
    this.aiAnalysisActive = !this.aiAnalysisActive;
  }

  // AI Feature: Calculate impact scores for projects
  calculateImpactScores(): void {
    this.projects.forEach(project => {
      let score = 50; // Base score
      
      // Higher score for development projects
      if (project.category === 'development') score += 20;
      
      // Bonus for modern tech stack
      const modernTech = ['Angular', 'TypeScript', 'Flutter', 'Dart', 'Firebase', 'Node.js', 'Kotlin'];
      const modernCount = project.technologies.filter(t => 
        modernTech.some(mt => t.toLowerCase().includes(mt.toLowerCase()))
      ).length;
      score += modernCount * 10;
      
      // Cap at 100
      project.impactScore = Math.min(score, 100);
      
      // Generate AI insights
      project.aiInsights = this.generateAIInsights(project);
    });
  }

  // AI Feature: Generate insights for each project
  generateAIInsights(project: Project): string[] {
    const insights: string[] = [];
    
    if (project.category === 'development') {
      insights.push('💼 High demand in job market');
      if (project.technologies.some(t => t.toLowerCase().includes('angular') || t.toLowerCase().includes('flutter'))) {
        insights.push('🚀 Modern framework - shows up-to-date skills');
      }
    }
    
    if (project.category === 'design') {
      insights.push('🎨 Showcases creativity and aesthetic sense');
    }
    
    if (project.technologies.length >= 3) {
      insights.push('⚡ Demonstrates multi-technology proficiency');
    }
    
    if (project.impactScore && project.impactScore >= 70) {
      insights.push('⭐ High impact project - feature prominently');
    }
    
    return insights;
  }

  // AI Feature: Get recommended projects based on role
  getRecommendedProjects(): Project[] {
    if (this.selectedRole === 'all') {
      return this.projects.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
    }
    
    const roleMapping: { [key: string]: string[] } = {
      'frontend': ['development', 'design'],
      'backend': ['development'],
      'fullstack': ['development', 'design'],
      'designer': ['design'],
      'mobile': ['development']
    };
    
    const relevantCategories = roleMapping[this.selectedRole] || [];
    
    return this.projects
      .filter(p => relevantCategories.includes(p.category))
      .sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
  }

  // AI Feature: Get tech stack analysis
  getTechStackAnalysis(): { tech: string; count: number; trend: string }[] {
    const techCount: { [key: string]: number } = {};
    
    this.projects.forEach(project => {
      project.technologies.forEach(tech => {
        techCount[tech] = (techCount[tech] || 0) + 1;
      });
    });
    
    const trends: { [key: string]: string } = {
      'Angular': '📈 Rising',
      'TypeScript': '📈 Rising',
      'Flutter': '🔥 Hot',
      'Dart': '🔥 Hot',
      'Node.js': '📈 Rising',
      'Kotlin': '📈 Rising',
      'Firebase': '🔥 Hot'
    };
    
    return Object.entries(techCount)
      .map(([tech, count]) => ({
        tech,
        count,
        trend: trends[tech] || '✅ Stable'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  // AI Feature: Get portfolio optimization suggestions
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    
    const categories = new Set(this.projects.map(p => p.category));
    if (categories.size < 3) {
      suggestions.push('Consider adding projects from different categories to show versatility');
    }
    
    const avgTechCount = this.projects.reduce((sum, p) => sum + p.technologies.length, 0) / this.projects.length;
    if (avgTechCount < 2.5) {
      suggestions.push('Highlight more technologies used in each project for better showcase');
    }
    
    const devProjects = this.projects.filter(p => p.category === 'development');
    if (devProjects.length < this.projects.length / 2) {
      suggestions.push('Add more development projects to strengthen technical portfolio');
    }
    
    const modernProjects = this.projects.filter(p => 
      p.technologies.some(t => ['Angular', 'Flutter', 'TypeScript', 'Dart'].includes(t))
    );
    if (modernProjects.length < 3) {
      suggestions.push('Showcase more projects with modern frameworks to demonstrate current skills');
    }
    
    return suggestions.length > 0 ? suggestions : ['Your portfolio is well-balanced! Keep updating with new projects.'];
  }

  // AI Feature: Predict project engagement
  getPredictedEngagement(project: Project): { score: number; label: string } {
    let score = project.impactScore || 50;
    
    if (project.category === 'development') score += 10;
    if (project.technologies.includes('Angular') || project.technologies.includes('Flutter')) score += 15;
    
    score = Math.min(score, 100);
    
    let label = 'Moderate';
    if (score >= 80) label = 'High';
    else if (score >= 60) label = 'Good';
    else if (score < 40) label = 'Low';
    
    return { score, label };
  }

  getFilteredProjects(): Project[] {
    return this.selectedRole === 'all' ? this.projects : this.getRecommendedProjects();
  }

  // AI Feature: Analyze project complexity
  analyzeProjectComplexity(): void {
    this.projects.forEach(project => {
      const techCount = project.technologies.length;
      const modernTech = ['Angular', 'TypeScript', 'Flutter', 'Firebase', 'Node.js', 'Kotlin'];
      const hasModernTech = project.technologies.some(t => 
        modernTech.some(mt => t.toLowerCase().includes(mt.toLowerCase()))
      );
      
      if (techCount >= 4 && hasModernTech) {
        project.complexity = 'Advanced';
        project.yearLevel = 'Senior (3-5 years)';
      } else if (techCount >= 3) {
        project.complexity = 'Intermediate';
        project.yearLevel = 'Mid-level (1-3 years)';
      } else {
        project.complexity = 'Beginner';
        project.yearLevel = 'Entry-level (0-1 year)';
      }
    });
  }

  // AI Feature: Calculate market demand for each project
  calculateMarketDemand(): void {
    const demandScores: { [key: string]: number } = {
      'Angular': 95, 'TypeScript': 92, 'Node.js': 90,
      'Flutter': 88, 'Dart': 85, 'Firebase': 87,
      'Android': 82, 'Kotlin': 86, 'Java': 75,
      'JavaScript': 85, 'HTML': 70, 'CSS': 70
    };

    this.projects.forEach(project => {
      const scores = project.technologies.map(tech => 
        demandScores[tech] || 60
      );
      project.marketDemand = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
    });
  }

  // AI Feature: Find similar projects
  findSimilarProjects(): void {
    this.projects.forEach(project => {
      const similarIds: number[] = [];
      
      this.projects.forEach(other => {
        if (project.id === other.id) return;
        
        const commonTech = project.technologies.filter(t => 
          other.technologies.includes(t)
        ).length;
        
        const sameCategory = project.category === other.category;
        
        if (commonTech >= 1 || sameCategory) {
          similarIds.push(other.id);
        }
      });
      
      project.similarProjects = similarIds.slice(0, 2);
    });
  }

  // AI Feature: Generate personalized recommendations
  generateAIRecommendations(): void {
    const devCount = this.projects.filter(p => p.category === 'development').length;
    const designCount = this.projects.filter(p => p.category === 'design').length;
    const allTechs: string[] = [];
    this.projects.forEach(p => allTechs.push(...p.technologies));
    const uniqueTechs = new Set(allTechs);

    this.aiRecommendations = [];

    // Skill gap recommendation
    if (!Array.from(uniqueTechs).some((t: string) => t.toLowerCase().includes('docker') || t.toLowerCase().includes('kubernetes'))) {
      this.aiRecommendations.push({
        type: 'skill',
        title: 'Add DevOps Skills',
        description: 'Consider learning Docker & Kubernetes to complement your development projects',
        priority: 'high',
        icon: '🚀'
      });
    }

    // Project diversity recommendation
    if (devCount > designCount * 2) {
      this.aiRecommendations.push({
        type: 'project',
        title: 'Balance Your Portfolio',
        description: 'Add more design projects to showcase versatility',
        priority: 'medium',
        icon: '🎨'
      });
    }

    // Trending tech recommendation
    if (!Array.from(uniqueTechs).some((t: string) => t.toLowerCase().includes('react') || t.toLowerCase().includes('next'))) {
      this.aiRecommendations.push({
        type: 'trend',
        title: 'Explore React Ecosystem',
        description: 'React & Next.js are highly demanded. Consider adding a project',
        priority: 'high',
        icon: '📈'
      });
    }

    // Career path suggestion
    const hasFullStack = this.projects.some(p => 
      p.technologies.some(t => t.toLowerCase().includes('node')) &&
      p.technologies.some(t => t.toLowerCase().includes('angular') || t.toLowerCase().includes('react'))
    );

    if (hasFullStack) {
      this.aiRecommendations.push({
        type: 'career',
        title: 'Full-Stack Developer Path',
        description: 'Your skills align well with Full-Stack roles. Consider highlighting this',
        priority: 'high',
        icon: '💼'
      });
    }

    // Mobile development opportunity
    const hasMobile = this.projects.some(p => 
      p.technologies.some(t => ['Flutter', 'Android', 'Kotlin'].includes(t))
    );

    if (hasMobile) {
      this.aiRecommendations.push({
        type: 'career',
        title: 'Mobile Developer Specialist',
        description: 'Strong mobile portfolio. Consider specializing in cross-platform development',
        priority: 'medium',
        icon: '📱'
      });
    }
  }

  // AI Feature: Initialize AI chat
  initAIChat(): void {
    this.aiChatMessages = [
      {
        role: 'ai',
        message: 'Hi! I\'m your AI Portfolio Assistant. I can help you understand projects, suggest improvements, or answer questions about technologies. What would you like to know?'
      }
    ];
  }

  // AI Feature: Toggle AI chat
  toggleAIChat(): void {
    this.showAIChat = !this.showAIChat;
  }

  // AI Feature: Send chat message
  sendChatMessage(): void {
    if (!this.userMessage.trim()) return;

    this.aiChatMessages.push({
      role: 'user',
      message: this.userMessage
    });

    const response = this.generateAIChatResponse(this.userMessage);
    
    setTimeout(() => {
      this.aiChatMessages.push({
        role: 'ai',
        message: response
      });
    }, 500);

    this.userMessage = '';
  }

  // AI Feature: Generate chat responses
  generateAIChatResponse(message: string): string {
    const msg = message.toLowerCase();

    if (msg.includes('recommend') || msg.includes('suggest')) {
      return `Based on your portfolio analysis:\n\n✅ You have ${this.projects.length} projects across ${new Set(this.projects.map(p => p.category)).size} categories\n\n📊 Average impact score: ${Math.round(this.projects.reduce((sum, p) => sum + (p.impactScore || 0), 0) / this.projects.length)}\n\n💡 I suggest focusing on ${this.getTopTechnology()} as it appears in ${this.getTechnologyCount(this.getTopTechnology())} projects with high market demand!`;
    }

    if (msg.includes('tech') || msg.includes('technology')) {
      const techs = this.getTechStackAnalysis();
      return `Your tech stack includes:\n\n${techs.map(t => `• ${t.tech}: ${t.count} projects ${t.trend}`).join('\n')}\n\nThe most used technology is ${techs[0].tech} with great market demand!`;
    }

    if (msg.includes('improve') || msg.includes('better')) {
      const suggestions = this.getOptimizationSuggestions();
      return `Here are AI-powered suggestions to improve your portfolio:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}`;
    }

    if (msg.includes('job') || msg.includes('career') || msg.includes('role')) {
      return `Based on your portfolio, you're well-suited for:\n\n💼 Full-Stack Developer (${this.getMatchScore('fullstack')}% match)\n🎨 Frontend Developer (${this.getMatchScore('frontend')}% match)\n📱 Mobile Developer (${this.getMatchScore('mobile')}% match)\n\nYour strongest area is ${this.getStrongestRole()}!`;
    }

    if (msg.includes('angular') || msg.includes('flutter') || msg.includes('typescript')) {
      const matchedProjects = this.projects.filter(p => 
        p.technologies.some(t => msg.includes(t.toLowerCase()))
      );
      return `I found ${matchedProjects.length} project(s) using this technology:\n\n${matchedProjects.map(p => `• ${p.title}: ${p.description}`).join('\n')}\n\nThis technology has ${matchedProjects[0]?.marketDemand || 85}% market demand!`;
    }

    return "I can help you with:\n• Technology recommendations\n• Career path guidance\n• Portfolio improvement tips\n• Project analysis\n\nJust ask me anything about your portfolio!";
  }

  // Helper methods for AI chat
  getTopTechnology(): string {
    const techCount: { [key: string]: number } = {};
    this.projects.forEach(p => p.technologies.forEach(t => {
      techCount[t] = (techCount[t] || 0) + 1;
    }));
    return Object.entries(techCount).sort((a, b) => b[1] - a[1])[0][0];
  }

  getTechnologyCount(tech: string): number {
    return this.projects.filter(p => p.technologies.includes(tech)).length;
  }

  getMatchScore(role: string): number {
    const relevant = this.getRecommendedProjects();
    return Math.round((relevant.length / this.projects.length) * 100);
  }

  getStrongestRole(): string {
    const scores = {
      'Full-Stack': this.getMatchScore('fullstack'),
      'Frontend': this.getMatchScore('frontend'),
      'Mobile': this.getMatchScore('mobile')
    };
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Show project details
  showProject(project: Project): void {
    this.selectedProject = project;
    this.showProjectDetails = true;
  }

  closeProjectDetails(): void {
    this.showProjectDetails = false;
    this.selectedProject = null;
  }

  // Get similar projects for display
  getSimilarProjects(project: Project): Project[] {
    if (!project.similarProjects) return [];
    return this.projects.filter(p => project.similarProjects?.includes(p.id));
  }
}
