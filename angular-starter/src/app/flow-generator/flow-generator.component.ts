import { Component } from '@angular/core';
import { FlowDiagram } from '../flow-visualizer/flow-visualizer.models';

type Audience = 'Beginner' | 'Interview' | 'Senior';
type FlowType = 'Timeline' | 'State machine' | 'Architecture' | 'Request pipeline';
type MotionStyle = 'Clean' | 'Lottie' | 'Code-focused';

interface FlowExample {
  id: string;
  title: string;
  prompt: string;
  category: string;
  summary: string;
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
  readonly audiences: Audience[] = ['Interview', 'Beginner', 'Senior'];
  readonly flowTypes: FlowType[] = ['Timeline', 'State machine', 'Architecture', 'Request pipeline'];
  readonly motionStyles: MotionStyle[] = ['Lottie', 'Clean', 'Code-focused'];

  concept = 'Angular component lifecycle';
  selectedAudience: Audience = 'Interview';
  selectedFlowType: FlowType = 'Timeline';
  selectedMotionStyle: MotionStyle = 'Lottie';
  selectedExampleId = 'angular-lifecycle';
  selectedStepIndex = 0;
  storyboardPlaying = true;

  readonly examples: FlowExample[] = [
    {
      id: 'angular-lifecycle',
      title: 'Angular Lifecycle',
      prompt: 'Angular component lifecycle',
      category: 'Frontend',
      summary: 'Shows how Angular creates, checks, renders, and destroys a component.',
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
      summary: 'Maps each SOLID principle to a design decision and interview talking point.',
      outputType: 'Architecture',
      estimatedTime: '5 principles',
      diagram: {
        title: 'SOLID Design Flow',
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
          { id: 'srp', label: 'SRP', description: 'One class should have one reason to change.', codeLine: 3 },
          { id: 'ocp', label: 'OCP', description: 'Add behavior by extension, not by rewriting stable code.', codeLine: 1 },
          { id: 'lsp', label: 'LSP', description: 'Implementations should be substitutable without breaking callers.', codeLine: 2 },
          { id: 'isp', label: 'ISP', description: 'Prefer focused interfaces over large general-purpose contracts.', codeLine: 0 },
          { id: 'dip', label: 'DIP', description: 'High-level code depends on abstractions, not concrete classes.', codeLine: 5 },
        ],
        edges: [
          { source: 'srp', target: 'ocp' },
          { source: 'ocp', target: 'lsp' },
          { source: 'lsp', target: 'isp' },
          { source: 'isp', target: 'dip' },
        ],
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

  get selectedStep() {
    return this.selectedExample.steps[this.selectedStepIndex] ?? this.selectedExample.steps[0];
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
  }

  selectStep(index: number): void {
    this.selectedStepIndex = index;
  }

  useConcept(value: string): void {
    this.concept = value;
  }

  toggleStoryboard(): void {
    this.storyboardPlaying = !this.storyboardPlaying;
  }
}
