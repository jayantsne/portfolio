import { Component, ElementRef, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { FlowVisualizerComponent } from '../flow-visualizer/flow-visualizer.component';
import { FlowDiagram } from '../flow-visualizer/flow-visualizer.models';
import {
  ExplainFlowStepResponse,
  FlowDiagramResponse,
  FlowGeneratorService,
  FlowRevisionTipResponse,
} from './flow-generator.service';

type Audience = 'Beginner' | 'Interview' | 'Senior';
type FlowType = 'Timeline' | 'State machine' | 'Architecture' | 'Request pipeline';
type MotionStyle = 'Clean' | 'Lottie' | 'Code-focused';
type FlowOrientation = 'vertical' | 'horizontal';

interface ConceptSuggestion {
  title: string;
  category: string;
  description: string;
  prompt: string;
  flowType: FlowType;
}

interface FlowExample {
  id: string;
  title: string;
  prompt: string;
  category: string;
  summary: string;
  learningMode: 'flow' | 'concept';
  mentalModel: string;
  outputType: FlowType;
  estimatedTime: string;
  diagram: FlowDiagram;
  insights: Array<{ label: string; value: string }>;
  steps: Array<{ title: string; detail: string; interviewTip: string }>;
}

@Component({
  selector: 'app-flow-generator',
  templateUrl: './flow-generator.component.html',
  styleUrls: ['./flow-generator.component.css']
})
export class FlowGeneratorComponent {
  @ViewChild(FlowVisualizerComponent) private visualizer?: FlowVisualizerComponent;
  @ViewChild('flowPage') private flowPage?: ElementRef<HTMLElement>;

  readonly audiences: Audience[] = ['Interview', 'Beginner', 'Senior'];
  readonly flowTypes: FlowType[] = ['Timeline', 'State machine', 'Architecture', 'Request pipeline'];
  readonly motionStyles: MotionStyle[] = ['Lottie', 'Clean', 'Code-focused'];

  concept = '';
  selectedAudience: Audience = 'Interview';
  selectedFlowType: FlowType = 'Timeline';
  selectedMotionStyle: MotionStyle = 'Lottie';
  selectedExampleId = '';
  selectedStepIndex = 0;
  storyboardPlaying = false;
  autoPlayGenerated = true;
  showSuggestions = true;
  isGenerating = false;
  isExplainingStep = false;
  errorMessage = '';
  stepExplanationError = '';
  aiStepExplanation?: ExplainFlowStepResponse;
  generatedFlow?: FlowDiagramResponse;
  recentConcepts: Array<{ title: string; audience: Audience; flowType: FlowType }> = this.loadRecentConcepts();

  constructor(private flowService: FlowGeneratorService) {}

  readonly conceptSuggestions: ConceptSuggestion[] = [
    {
      title: 'Angular component lifecycle',
      category: 'Angular',
      description: 'constructor, ngOnChanges, ngOnInit, view hooks, destroy',
      prompt: 'Angular component lifecycle',
      flowType: 'Timeline',
    },
    {
      title: 'SOLID principles in .NET',
      category: '.NET',
      description: 'SRP, OCP, LSP, ISP, DIP with service examples',
      prompt: 'SOLID principles in .NET',
      flowType: 'Architecture',
    },
    {
      title: 'ASP.NET Core middleware pipeline',
      category: '.NET',
      description: 'request, exception handling, auth, endpoint, response',
      prompt: 'ASP.NET Core middleware pipeline',
      flowType: 'Request pipeline',
    },
    {
      title: 'OpenID Connect Google login',
      category: 'Auth',
      description: 'authorization code, callback, token exchange, user session',
      prompt: 'OpenID Connect Google login flow',
      flowType: 'Architecture',
    },
    {
      title: 'Dependency Injection lifetime',
      category: '.NET',
      description: 'singleton, scoped, transient, container resolution',
      prompt: 'Dependency Injection lifetimes in .NET',
      flowType: 'Architecture',
    },
  ];

  readonly examples: FlowExample[] = [
    {
      id: 'angular-lifecycle',
      title: 'Angular Lifecycle',
      prompt: 'Angular component lifecycle',
      category: 'Frontend',
      summary: 'Shows how Angular creates, checks, renders, and destroys a component.',
      learningMode: 'flow',
      mentalModel: 'A component has a runtime life: create, receive inputs, initialize, check, render, and clean up.',
      outputType: 'Timeline',
      estimatedTime: '9 steps',
      diagram: {
        title: 'Angular Component Lifecycle',
        codeLanguage: 'TypeScript',
        code: [
          'constructor(private users: UserService) {}',
          'ngOnChanges(changes: SimpleChanges) {}',
          'ngOnInit() { this.loadUsers(); }',
          'ngDoCheck() {}',
          'ngAfterContentInit() {}',
          'ngAfterContentChecked() {}',
          'ngAfterViewInit() { this.focusInput(); }',
          'ngAfterViewChecked() {}',
          'ngOnDestroy() { this.sub.unsubscribe(); }',
        ],
        steps: [
          { id: 'constructor', label: 'constructor', description: 'Class instance is created. Keep this for dependency injection and cheap setup only.', codeLine: 0 },
          { id: 'changes', label: 'ngOnChanges', description: 'Runs when input-bound properties receive values or change.', codeLine: 1 },
          { id: 'init', label: 'ngOnInit', description: 'Runs once after inputs are initialized. Good place to load data.', codeLine: 2 },
          { id: 'check', label: 'ngDoCheck', description: 'Custom change detection hook. Use carefully because it can run often.', codeLine: 3 },
          { id: 'content-init', label: 'Content init', description: 'Projected content is initialized for the first time.', codeLine: 4 },
          { id: 'content-check', label: 'Content checked', description: 'Projected content has been checked by change detection.', codeLine: 5 },
          { id: 'view-init', label: 'View init', description: 'Component view and child views are ready.', codeLine: 6 },
          { id: 'view-check', label: 'View checked', description: 'Component view and child views have been checked.', codeLine: 7 },
          { id: 'destroy', label: 'Destroy', description: 'Cleanup subscriptions, timers, and resources.', codeLine: 8 },
        ],
        edges: [
          { source: 'constructor', target: 'changes' },
          { source: 'changes', target: 'init' },
          { source: 'init', target: 'check' },
          { source: 'check', target: 'content-init' },
          { source: 'content-init', target: 'content-check' },
          { source: 'content-check', target: 'view-init' },
          { source: 'view-init', target: 'view-check' },
          { source: 'view-check', target: 'destroy' },
        ],
      },
      insights: [
        { label: 'Interview focus', value: 'Know when each hook runs and what not to do in constructor.' },
        { label: 'Common mistake', value: 'Calling APIs in constructor instead of ngOnInit.' },
        { label: 'Save target', value: 'Can become a structured note or revision card later.' },
      ],
      steps: [
        { title: 'Instance setup', detail: 'Angular creates the class and injects dependencies.', interviewTip: 'Constructor is not a lifecycle hook; it is TypeScript class setup.' },
        { title: 'Input initialization', detail: 'Input-bound values are checked before the main init hook.', interviewTip: 'ngOnChanges can run before ngOnInit.' },
        { title: 'View readiness', detail: 'Content hooks run before view hooks, then cleanup happens on destroy.', interviewTip: 'Use ngOnDestroy for unsubscribing and teardown.' },
      ],
    },
    {
      id: 'solid-principles',
      title: 'SOLID Principles',
      prompt: 'SOLID principles in .NET',
      category: 'Architecture',
      summary: 'Explains each SOLID principle with purpose, .NET example, mistake, and interview answer.',
      learningMode: 'concept',
      mentalModel: 'SOLID is a design checklist for keeping classes focused, replaceable, and easy to extend.',
      outputType: 'Architecture',
      estimatedTime: '5 principles',
      diagram: {
        title: 'SOLID Principles Concept Map',
        codeLanguage: 'C#',
        code: [
          'public interface INotificationSender { Task SendAsync(Message msg); }',
          'public sealed class EmailSender : INotificationSender { }',
          'public sealed class SmsSender : INotificationSender { }',
          'public sealed class NotificationService',
          '{',
          '  public NotificationService(INotificationSender sender) {}',
          '}',
        ],
        steps: [
          {
            id: 'srp',
            label: 'SRP',
            description: 'Single Responsibility means a class owns one job and has one reason to change.',
            whyItMatters: 'Small focused classes are easier to test, review, and modify without side effects.',
            example: 'Keep NotificationService orchestration separate from EmailSender delivery logic.',
            antiPattern: 'A service that validates input, writes DB records, sends email, and formats reports.',
            interviewAnswer: 'SRP reduces change impact: when email rules change, only the email sender changes.',
            codeLine: 3,
          },
          {
            id: 'ocp',
            label: 'OCP',
            description: 'Open/Closed means add new behavior through extension, not by editing stable code repeatedly.',
            whyItMatters: 'New providers can be added with less regression risk.',
            example: 'Add SmsSender implementing INotificationSender without rewriting NotificationService.',
            antiPattern: 'A long switch statement inside NotificationService for email, SMS, push, and WhatsApp.',
            interviewAnswer: 'OCP is usually achieved with interfaces, polymorphism, strategies, or decorators.',
            codeLine: 1,
          },
          {
            id: 'lsp',
            label: 'LSP',
            description: 'Liskov Substitution means an implementation can replace its abstraction without surprising callers.',
            whyItMatters: 'Polymorphism is only safe when implementations honor the same contract.',
            example: 'EmailSender and SmsSender both send messages without throwing for valid Message input.',
            antiPattern: 'A derived class that disables a base method or changes expected behavior.',
            interviewAnswer: 'LSP is about behavior, not just inheritance syntax.',
            codeLine: 2,
          },
          {
            id: 'isp',
            label: 'ISP',
            description: 'Interface Segregation means clients should depend only on methods they actually use.',
            whyItMatters: 'Focused contracts reduce accidental coupling and mocking noise.',
            example: 'Use INotificationSender instead of one huge ICommunicationService with unused methods.',
            antiPattern: 'Forcing EmailSender to implement SendFaxAsync because the interface is too broad.',
            interviewAnswer: 'ISP leads to small role-based interfaces that match real client needs.',
            codeLine: 0,
          },
          {
            id: 'dip',
            label: 'DIP',
            description: 'Dependency Inversion means high-level policy depends on abstractions, not concrete classes.',
            whyItMatters: 'The application can swap implementations and test with mocks.',
            example: 'Inject INotificationSender into NotificationService using ASP.NET Core DI.',
            antiPattern: 'new EmailSender() inside NotificationService, which hard-codes infrastructure.',
            interviewAnswer: 'DIP is the principle; dependency injection is a common technique to apply it.',
            codeLine: 5,
          },
        ],
        edges: [],
      },
      insights: [
        { label: 'Interview focus', value: 'Explain principles with a small service/interface example.' },
        { label: 'Common mistake', value: 'Reciting definitions without code tradeoffs.' },
        { label: 'Backend fit', value: 'Perfect contract for your .NET concept-flow service.' },
      ],
      steps: [
        { title: 'Separate responsibilities', detail: 'Split orchestration, provider calls, validation, and mapping.', interviewTip: 'Use SRP to explain why controllers should stay thin.' },
        { title: 'Depend on contracts', detail: 'Use interfaces for AI provider, prompt builder, and flow validator.', interviewTip: 'This is the easiest way to demonstrate DIP in .NET.' },
        { title: 'Swap implementations', detail: 'OpenAI, local model, or mock provider can share the same interface.', interviewTip: 'That is OCP plus LSP in a practical system.' },
      ],
    },
    {
      id: 'aspnet-pipeline',
      title: 'ASP.NET Request Pipeline',
      prompt: 'ASP.NET Core request pipeline',
      category: '.NET',
      summary: 'Explains how a request moves through middleware, routing, controller, and response.',
      learningMode: 'flow',
      mentalModel: 'A request walks through ordered checkpoints; each middleware can inspect, stop, or pass it forward.',
      outputType: 'Request pipeline',
      estimatedTime: '7 stages',
      diagram: {
        title: 'ASP.NET Core Request Pipeline',
        codeLanguage: 'C#',
        code: [
          'app.UseExceptionHandler();',
          'app.UseHttpsRedirection();',
          'app.UseAuthentication();',
          'app.UseAuthorization();',
          'app.MapControllers();',
          'return Results.Ok(response);',
        ],
        steps: [
          { id: 'request', label: 'Request', description: 'HTTP request enters Kestrel and the middleware chain.', codeLine: 0 },
          { id: 'errors', label: 'Errors', description: 'Exception middleware handles failures consistently.', codeLine: 0 },
          { id: 'https', label: 'HTTPS', description: 'Security middleware can redirect or enforce transport rules.', codeLine: 1 },
          { id: 'authn', label: 'AuthN', description: 'Authentication identifies the caller.', codeLine: 2 },
          { id: 'authz', label: 'AuthZ', description: 'Authorization checks access rules.', codeLine: 3 },
          { id: 'endpoint', label: 'Endpoint', description: 'Routing selects controller or minimal API endpoint.', codeLine: 4 },
          { id: 'response', label: 'Response', description: 'Result is serialized and sent back to the client.', codeLine: 5 },
        ],
        edges: [
          { source: 'request', target: 'errors' },
          { source: 'errors', target: 'https' },
          { source: 'https', target: 'authn' },
          { source: 'authn', target: 'authz' },
          { source: 'authz', target: 'endpoint' },
          { source: 'endpoint', target: 'response' },
        ],
      },
      insights: [
        { label: 'Interview focus', value: 'Middleware order matters because each stage wraps the next one.' },
        { label: 'Common mistake', value: 'Putting authorization before authentication.' },
        { label: 'Backend fit', value: 'Can be generated from a prompt plus a known template.' },
      ],
      steps: [
        { title: 'Middleware order', detail: 'Each middleware can inspect, short-circuit, or pass to the next stage.', interviewTip: 'UseAuthentication must come before UseAuthorization.' },
        { title: 'Endpoint selection', detail: 'Routing maps the request to controller/minimal API code.', interviewTip: 'MapControllers registers attribute-routed controllers.' },
        { title: 'Response shaping', detail: 'The endpoint returns a result that ASP.NET serializes.', interviewTip: 'Mention filters and model binding when asked for depth.' },
      ],
    },
  ];

  get selectedExample(): FlowExample {
    return this.examples.find(x => x.id === this.selectedExampleId) ?? this.examples[0];
  }

  get hasActiveFlow(): boolean {
    return !!this.generatedFlow || !!this.selectedExampleId;
  }

  get activeDiagram(): FlowDiagram {
    if (!this.generatedFlow) {
      return {
        ...this.selectedExample.diagram,
        steps: this.selectedExample.diagram.steps.map((step, index) => ({
          ...step,
          whyItMatters: step.whyItMatters || this.buildWhyItMatters(step.label),
          interviewTip: this.selectedExample.steps[index]?.interviewTip
            || step.interviewAnswer
            || this.selectedExample.insights[index]?.value
            || this.selectedExample.insights[0]?.value,
        })),
      };
    }

    return {
      title: this.generatedFlow.title,
      codeLanguage: this.generatedFlow.codeLanguage,
      code: this.generatedFlow.code,
      steps: this.generatedFlow.steps.map((step, index) => ({
        id: step.id,
        label: step.label,
        description: step.description,
        whyItMatters: step.whyItMatters || this.buildWhyItMatters(step.label),
        trigger: step.trigger,
        input: step.input,
        internalWork: step.internalWork,
        output: step.output,
        example: step.example,
        antiPattern: step.antiPattern,
        interviewAnswer: step.interviewAnswer,
        interviewTip: this.generatedFlow?.revisionTips[index]?.detail
          || step.interviewAnswer
          || this.generatedFlow?.revisionTips[0]?.detail,
        codeLine: step.codeLine ?? undefined,
      })),
      edges: this.generatedFlow.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
      })),
    };
  }

  get activeTitle(): string {
    return this.generatedFlow?.title || (this.selectedExampleId ? this.selectedExample.title : 'Concept Flow');
  }

  get activeSummary(): string {
    return this.generatedFlow?.summary
      || (this.selectedExampleId
        ? this.selectedExample.summary
        : 'Generate a visual flow to see readable steps, code highlights, and interview notes.');
  }

  get activeLearningMode(): 'flow' | 'concept' {
    const mode = this.generatedFlow?.learningMode?.toLowerCase()
      || (this.selectedExampleId ? this.selectedExample.learningMode : 'flow');

    return mode === 'concept' ? 'concept' : 'flow';
  }

  get isConceptMode(): boolean {
    return this.activeLearningMode === 'concept';
  }

  get activeMentalModel(): string {
    return this.generatedFlow?.mentalModel
      || (this.selectedExampleId ? this.selectedExample.mentalModel : '')
      || 'Break the topic into clear parts, then connect each part to usage, mistakes, and interview language.';
  }

  get activeModeLabel(): string {
    return this.isConceptMode ? 'Concept map' : `${this.selectedAudience} flow`;
  }

  get selectedOrientation(): FlowOrientation {
    if (this.isConceptMode) {
      return 'vertical';
    }

    return 'horizontal';
  }

  get activeSteps(): Array<{ title: string; detail: string; interviewTip: string }> {
    if (!this.generatedFlow) {
      return this.selectedExample.steps;
    }

    return this.generatedFlow.steps.map((step, index) => ({
      title: step.label,
      detail: step.description,
      interviewTip: this.generatedFlow?.revisionTips[index]?.detail
        || step.interviewAnswer
        || this.generatedFlow?.revisionTips[0]?.detail
        || 'Explain this step in your own words, then connect it to the next step.',
    }));
  }

  get activeRevisionTips(): FlowRevisionTipResponse[] {
    return this.generatedFlow?.revisionTips?.length
      ? this.generatedFlow.revisionTips
      : this.selectedExample.insights.map(insight => ({
          title: insight.label,
          detail: insight.value,
        }));
  }

  get selectedStep() {
    return this.activeSteps[this.selectedStepIndex]
      ?? this.activeSteps[0]
      ?? {
        title: this.selectedFlowStep?.label || 'Step',
        detail: this.selectedFlowStep?.description || '',
        interviewTip: 'Explain this step in your own words, then connect it to the next step.',
      };
  }

  get selectedFlowStep() {
    return this.activeDiagram.steps[this.selectedStepIndex] ?? this.activeDiagram.steps[0];
  }

  get selectedStepCodeLine(): string {
    const step = this.selectedFlowStep;
    if (!step || step.codeLine === undefined) {
      return '';
    }

    return this.activeDiagram.code?.[step.codeLine] || '';
  }

  get canExplainSelectedStep(): boolean {
    return this.hasActiveFlow && !!this.selectedFlowStep && !this.isGenerating;
  }

  get selectedStepDetail(): { title: string; detail: string; interviewTip: string; whyItMatters: string } {
    const step = this.selectedFlowStep;
    const revisionTip = this.activeRevisionTips[this.selectedStepIndex]?.detail
      || this.activeRevisionTips[0]?.detail
      || this.selectedStep.interviewTip;

    return {
      title: step?.label || this.selectedStep.title,
      detail: step?.description || this.selectedStep.detail,
      interviewTip: revisionTip,
      whyItMatters: this.buildWhyItMatters(step?.label || this.selectedStep.title),
    };
  }

  get filteredSuggestions(): ConceptSuggestion[] {
    const search = this.concept.trim().toLowerCase();

    if (!search) {
      return this.conceptSuggestions.slice(0, 4);
    }

    const matches = this.conceptSuggestions.filter(item =>
      `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(search)
    );

    const rest = this.conceptSuggestions.filter(item => !matches.includes(item));

    return [...matches, ...rest].slice(0, 4);
  }

  get revisionPlan(): Array<{ label: string; detail: string }> {
    return [
      {
        label: 'Understand',
        detail: `Read the generated ${this.selectedFlowType.toLowerCase()} from left to right.`,
      },
      {
        label: 'Explain',
        detail: 'Practice a 60-second interview answer using the current step notes.',
      },
      {
        label: 'Code',
        detail: `Connect each visual step to the ${this.selectedExample.diagram.codeLanguage} snippet.`,
      },
      {
        label: 'Revise',
        detail: 'Save the flow later as notes, flashcards, or a revision session.',
      },
    ];
  }

  get previewPayload(): string {
    return JSON.stringify({
      concept: this.concept,
      audience: this.selectedAudience,
      flowType: this.selectedFlowType,
      motionStyle: this.selectedMotionStyle,
      output: {
        title: this.selectedExample.diagram.title,
        steps: this.selectedExample.diagram.steps.map(s => ({
          id: s.id,
          title: s.label,
          shortText: s.description,
          codeLine: s.codeLine,
        })),
        edges: this.selectedExample.diagram.edges.map(e => ({
          from: e.source,
          to: e.target,
        })),
      },
    }, null, 2);
  }

  selectExample(example: FlowExample): void {
    this.selectedExampleId = example.id;
    this.concept = example.prompt;
    this.selectedFlowType = example.outputType;
    this.selectedStepIndex = 0;
    this.generatedFlow = undefined;
    this.errorMessage = '';
    this.scrollFlowToTop();
  }

  selectStep(index: number): void {
    this.selectedStepIndex = index;
    this.storyboardPlaying = false;
    this.aiStepExplanation = undefined;
    this.stepExplanationError = '';
    this.visualizer?.selectStep(index);
  }

  useConcept(value: string): void {
    this.concept = value;
    this.showSuggestions = true;
  }

  applySuggestion(suggestion: ConceptSuggestion): void {
    this.concept = suggestion.prompt;
    this.selectedFlowType = suggestion.flowType;
    this.showSuggestions = false;

    const matchingExample = this.examples.find(example =>
      example.prompt.toLowerCase() === suggestion.prompt.toLowerCase()
      || suggestion.prompt.toLowerCase().includes(example.prompt.toLowerCase())
      || example.prompt.toLowerCase().includes(suggestion.prompt.toLowerCase())
    );

    if (matchingExample) {
      this.selectExample(matchingExample);
    }
  }

  generateFlow(): void {
    const concept = this.concept.trim();
    if (!concept) {
      this.errorMessage = 'Type a concept first.';
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';
    this.showSuggestions = false;

    this.flowService.generateFlow({
      concept,
      audience: this.selectedAudience,
      flowType: this.selectedFlowType,
      animationStyle: this.selectedMotionStyle,
    }).pipe(
      finalize(() => this.isGenerating = false)
    ).subscribe({
      next: flow => {
        this.generatedFlow = flow;
        this.selectedExampleId = '';
        this.selectedStepIndex = 0;
        this.storyboardPlaying = false;
        this.aiStepExplanation = undefined;
        this.stepExplanationError = '';
        this.rememberConcept(concept);
        this.scrollFlowToTop();
        if (this.autoPlayGenerated) {
          window.setTimeout(() => this.startGeneratedAnimation(), 250);
        }
      },
      error: err => {
        this.errorMessage = err?.error?.error
          || 'Could not generate this flow. Check the backend and try again.';
      }
    });
  }

  openRecent(item: { title: string; audience: Audience; flowType: FlowType }): void {
    this.concept = item.title;
    this.selectedAudience = item.audience;
    this.selectedFlowType = item.flowType;
    this.generateFlow();
  }

  newFlow(): void {
    this.concept = '';
    this.generatedFlow = undefined;
    this.selectedExampleId = '';
    this.selectedStepIndex = 0;
    this.storyboardPlaying = false;
    this.errorMessage = '';
    this.showSuggestions = true;
    this.scrollFlowToTop();
  }

  clearRecent(): void {
    this.recentConcepts = [];
    localStorage.removeItem('codexa-recent-concept-flows');
  }

  private startGeneratedAnimation(): void {
    if (!this.visualizer || this.isConceptMode) return;
    this.visualizer.reset();
    this.visualizer.next();
    this.visualizer.play();
    this.storyboardPlaying = true;
  }

  private rememberConcept(title: string): void {
    const item = { title, audience: this.selectedAudience, flowType: this.selectedFlowType };
    this.recentConcepts = [item, ...this.recentConcepts.filter(entry => entry.title.toLowerCase() !== title.toLowerCase())].slice(0, 12);
    localStorage.setItem('codexa-recent-concept-flows', JSON.stringify(this.recentConcepts));
  }

  private loadRecentConcepts(): Array<{ title: string; audience: Audience; flowType: FlowType }> {
    try {
      const parsed = JSON.parse(localStorage.getItem('codexa-recent-concept-flows') || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
    } catch {
      return [];
    }
  }

  handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.generateFlow();
    }
  }

  toggleStoryboard(): void {
    const visualizer = this.visualizer;

    if (!visualizer) {
      this.storyboardPlaying = !this.storyboardPlaying;
      return;
    }

    if (visualizer.isPlaying) {
      visualizer.pause();
      this.storyboardPlaying = false;
      return;
    }

    if (visualizer.isAtEnd) {
      visualizer.reset();
    }

    if (visualizer.currentStepIndex < 0) {
      visualizer.next();
    }

    visualizer.play();
    this.storyboardPlaying = true;
  }

  handleVisualizerStepSelected(index: number): void {
    this.selectedStepIndex = index;
    this.storyboardPlaying = !!this.visualizer?.isPlaying;
    this.aiStepExplanation = undefined;
    this.stepExplanationError = '';
  }

  explainSelectedStep(): void {
    const step = this.selectedFlowStep;

    if (!step) {
      return;
    }

    this.isExplainingStep = true;
    this.stepExplanationError = '';
    this.aiStepExplanation = undefined;

    this.flowService.explainStep({
      concept: this.activeTitle || this.concept,
      learningMode: this.activeLearningMode,
      stepLabel: step.label,
      stepDescription: step.description,
      audience: this.selectedAudience,
      codeLanguage: this.activeDiagram.codeLanguage || '',
      codeLine: this.selectedStepCodeLine,
    }).pipe(
      finalize(() => this.isExplainingStep = false)
    ).subscribe({
      next: explanation => {
        this.aiStepExplanation = explanation;
      },
      error: err => {
        this.stepExplanationError = err?.error?.error
          || 'Could not explain this step right now.';
      },
    });
  }

  private buildWhyItMatters(stepTitle: string): string {
    const conceptName = this.activeTitle || this.concept || 'this concept';

    return `${stepTitle} is one point in the ${conceptName} flow. In interviews, explain what triggers it, what work belongs here, and what should move to the next step.`;
  }

  private scrollFlowToTop(): void {
    window.setTimeout(() => {
      this.flowPage?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
