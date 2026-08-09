import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ComputedEdge,
  ComputedNode,
  EdgeState,
  FlowDiagram,
  NodeState,
} from './flow-visualizer.models';

const NODE_W = 250;
const NODE_H = 122;
const V_STEP = 178;
const H_STEP = 330;
const GAP = 28;
const PAD_X = 64;
const PAD_Y = 52;
const PLAY_MS = 1700;

type FlowOrientation = 'vertical' | 'horizontal';

@Component({
  selector: 'app-flow-visualizer',
  templateUrl: './flow-visualizer.component.html',
  styleUrls: ['./flow-visualizer.component.css', './flow-visualizer.dynamic.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowVisualizerComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('diagramPanel') private diagramPanel?: ElementRef<HTMLDivElement>;

  @Input() diagram!: FlowDiagram;
  @Input() animationStyle: 'Clean' | 'Lottie' | 'Code-focused' = 'Lottie';
  @Input() orientation: FlowOrientation = 'vertical';
  @Output() stepSelected = new EventEmitter<number>();

  computedNodes: ComputedNode[] = [];
  computedEdges: ComputedEdge[] = [];
  svgViewBox = '0 0 310 500';
  svgWidth = 310;
  svgHeight = 500;
  currentStepIndex = -1;
  isPlaying = false;
  expandedStepIndex: number | null = null;
  zoomLevel = 1;
  playbackSpeed = 1;
  readonly playbackSpeeds = [0.75, 1, 1.5, 2];

  private completedStepIds = new Set<string>();
  private traversedEdgeIds = new Set<string>();
  private activeEdgeId: string | null = null;
  private layoutSignature = '';
  private readonly destroy$ = new Subject<void>();
  private readonly pause$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.diagram) {
      this.buildLayout();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const nextSignature = this.createLayoutSignature();
    if (nextSignature && nextSignature !== this.layoutSignature) {
      this.layoutSignature = nextSignature;
      this.resetState();
      this.buildLayout();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  play(): void {
    if (this.isPlaying || this.isAtEnd) {
      return;
    }

    this.isPlaying = true;
    interval(Math.round(PLAY_MS / this.playbackSpeed)).pipe(
      takeUntil(this.pause$),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      if (!this.isAtEnd) {
        this.advance();
      } else {
        this.stopPlay();
      }
      this.cdr.markForCheck();
    });
  }

  pause(): void {
    if (!this.isPlaying) {
      return;
    }
    this.stopPlay();
  }

  next(): void {
    if (this.isAtEnd) {
      return;
    }
    this.advance();
  }

  previous(): void {
    if (!this.diagram?.steps?.length || this.currentStepIndex <= 0) {
      return;
    }
    this.selectStep(this.currentStepIndex - 1);
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(1.65, +(this.zoomLevel + 0.15).toFixed(2));
    this.cdr.markForCheck();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(0.7, +(this.zoomLevel - 0.15).toFixed(2));
    this.cdr.markForCheck();
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.cdr.markForCheck();
  }

  setPlaybackSpeed(value: string): void {
    const nextSpeed = Number(value);
    if (!this.playbackSpeeds.includes(nextSpeed)) {
      return;
    }
    const resume = this.isPlaying;
    if (resume) {
      this.pause();
    }
    this.playbackSpeed = nextSpeed;
    if (resume && !this.isAtEnd) {
      this.play();
    }
    this.cdr.markForCheck();
  }

  reset(): void {
    this.stopPlay();
    this.closeStepDetails();
    this.resetState();
    this.stepSelected.emit(0);
    this.scrollActiveStepIntoView(0);
  }

  selectStep(index: number): void {
    if (!this.diagram || index < 0 || index >= this.diagram.steps.length) {
      return;
    }

    this.stopPlay();
    this.currentStepIndex = index;
    this.completedStepIds.clear();
    this.traversedEdgeIds.clear();
    this.activeEdgeId = null;

    for (let i = 0; i < index; i++) {
      const current = this.diagram.steps[i];
      this.completedStepIds.add(current.id);
      this.diagram.edges
        .filter(edge => edge.target === current.id || (this.diagram.steps.findIndex(step => step.id === edge.target) <= index && this.diagram.steps.findIndex(step => step.id === edge.source) <= index))
        .forEach(edge => this.traversedEdgeIds.add(`${edge.source}__${edge.target}`));
    }

    if (index > 0) {
      const activeStepId = this.diagram.steps[index].id;
      const incoming = this.diagram.edges.find(edge => edge.target === activeStepId);
      this.activeEdgeId = incoming ? `${incoming.source}__${incoming.target}` : null;
    }

    this.stepSelected.emit(index);
    this.scrollActiveStepIntoView(index);
    this.cdr.markForCheck();
  }

  openStepDetails(index: number): void {
    this.selectStep(index);
    this.expandedStepIndex = index;
    this.cdr.markForCheck();
  }

  closeStepDetails(): void {
    this.expandedStepIndex = null;
    this.cdr.markForCheck();
  }

  moveExpandedStep(offset: number): void {
    if (this.expandedStepIndex === null || !this.diagram?.steps?.length) {
      return;
    }

    const nextIndex = Math.min(
      this.diagram.steps.length - 1,
      Math.max(0, this.expandedStepIndex + offset),
    );

    this.openStepDetails(nextIndex);
  }

  get expandedStep() {
    return this.expandedStepIndex === null
      ? null
      : this.diagram?.steps?.[this.expandedStepIndex] || null;
  }

  get expandedCodeLine(): string {
    const codeLine = this.expandedStep?.codeLine;
    return codeLine === undefined ? '' : this.diagram?.code?.[codeLine] || '';
  }

  get canMoveExpandedBack(): boolean {
    return this.expandedStepIndex !== null && this.expandedStepIndex > 0;
  }

  get canMoveExpandedForward(): boolean {
    return this.expandedStepIndex !== null
      && this.expandedStepIndex < (this.diagram?.steps?.length || 0) - 1;
  }

  expandedTrigger(): string {
    return this.expandedStep?.trigger
      || 'This step starts after the previous stage has completed and passed control forward.';
  }

  expandedInput(): string {
    return this.expandedStep?.input
      || 'The state, request, event, or data produced by the previous step enters here.';
  }

  expandedInternalWork(): string {
    const step = this.expandedStep;
    return step?.internalWork
      || step?.description
      || 'The system validates the input, applies this step’s responsibility, and prepares the next state.';
  }

  expandedOutput(): string {
    return this.expandedStep?.output
      || 'A decision, updated state, or result is produced for the next stage in the flow.';
  }

  get currentStep() {
    return this.currentStepIndex >= 0
      ? this.diagram.steps[this.currentStepIndex]
      : null;
  }

  get explainedStep() {
    return this.currentStep || this.diagram?.steps?.[0] || null;
  }

  get explainedStepIndex(): number {
    const step = this.explainedStep;
    return step ? Math.max(0, this.diagram.steps.indexOf(step)) : 0;
  }

  get explainedCodeLine(): string {
    const codeLine = this.explainedStep?.codeLine;
    if (codeLine === undefined) {
      return '';
    }
    return this.diagram?.code?.[codeLine] || '';
  }

  get orientationLabel(): string {
    return this.visualModeLabel;
  }

  get visualMode(): 'tree' | 'cycle' | 'pipeline' | 'network' | 'layers' | 'timeline' | 'comparison' | 'journey' {
    const requested = this.diagram?.visualization?.type?.toLowerCase();
    if (requested && ['tree', 'cycle', 'pipeline', 'network', 'layers', 'timeline', 'comparison', 'journey'].includes(requested)) {
      return requested as 'tree' | 'cycle' | 'pipeline' | 'network' | 'layers' | 'timeline' | 'comparison' | 'journey';
    }
    const labels = `${this.diagram?.title || ''} ${(this.diagram?.steps || []).map(step => step.label).join(' ')}`.toLowerCase();
    const hasCycleEdge = (this.diagram?.edges || []).some(edge => {
      const source = this.diagram.steps.findIndex(step => step.id === edge.source);
      const target = this.diagram.steps.findIndex(step => step.id === edge.target);
      return source >= 0 && target >= 0 && target <= source;
    });
    const outDegree = new Map<string, number>();
    (this.diagram?.edges || []).forEach(edge => outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1));

    if (/b\+?[- ]?tree|clustered index|hierarch|tree structure|trie|file system/.test(labels)) {
      return 'tree';
    }
    if (hasCycleEdge || /cycle|loop|repeat|lifecycle|iteration/.test(labels)) {
      return 'cycle';
    }
    if ([...outDegree.values()].some(value => value > 1) || /architecture|system|network|service|dependency/.test(labels)) {
      return 'network';
    }
    return 'journey';
  }

  get visualModeLabel(): string {
    switch (this.visualMode) {
      case 'tree': return 'Living hierarchy';
      case 'cycle': return 'Living cycle';
      case 'pipeline': return 'Transformation pipeline';
      case 'network': return 'System map';
      case 'layers': return 'Layered anatomy';
      case 'timeline': return 'Animated timeline';
      case 'comparison': return 'Visual comparison';
      default: return 'Learning journey';
    }
  }

  get activeMapStepIndex(): number {
    return this.currentStepIndex < 0 ? 0 : this.currentStepIndex;
  }

  get activeMapStep() {
    return this.diagram?.steps?.[this.activeMapStepIndex] || null;
  }

  get zoomPercent(): number {
    return Math.round(this.zoomLevel * 100);
  }

  get displayPhases(): string[] {
    const phases = (this.diagram?.visualization?.phases || []).filter(Boolean).slice(0, 5);
    return phases.length >= 2 ? phases : ['Discover', 'Transform', 'Validate', 'Complete'];
  }

  stepPhase(index: number): string {
    const step = this.diagram?.steps?.[index];
    if (step?.group) { return step.group; }
    const phases = this.diagram?.visualization?.phases || [];
    const total = this.diagram?.steps?.length || 1;
    const ratio = index / Math.max(1, total - 1);
    if (phases.length) {
      return phases[Math.min(phases.length - 1, Math.floor(ratio * phases.length))];
    }
    if (ratio < 0.25) { return 'Discover'; }
    if (ratio < 0.55) { return 'Transform'; }
    if (ratio < 0.82) { return 'Validate'; }
    return 'Complete';
  }

  get hasCode(): boolean {
    return !!this.diagram?.code?.length;
  }

  stepSummary(stepId: string): string {
    const step = this.diagram?.steps.find(item => item.id === stepId);
    if (!step) {
      return '';
    }

    const source = step.internalWork || step.description || step.whyItMatters || '';
    return this.trimForNode(source, 92);
  }

  stepFlowCue(stepId: string): string {
    const step = this.diagram?.steps.find(item => item.id === stepId);
    if (!step) {
      return '';
    }

    if (step.input && step.output) {
      return `${this.trimForNode(step.input, 28)} -> ${this.trimForNode(step.output, 28)}`;
    }

    if (step.trigger) {
      return `Starts when: ${this.trimForNode(step.trigger, 52)}`;
    }

    if (step.output) {
      return `Produces: ${this.trimForNode(step.output, 52)}`;
    }

    return '';
  }

  get progressPercent(): number {
    const total = this.diagram?.steps.length ?? 0;
    if (!total) {
      return 0;
    }
    return (Math.max(0, this.currentStepIndex + 1) / total) * 100;
  }

  get isAtEnd(): boolean {
    return !!this.diagram && this.currentStepIndex === this.diagram.steps.length - 1;
  }

  get stepLabel(): string {
    if (!this.diagram) {
      return '';
    }
    if (this.currentStepIndex < 0) {
      return 'Press Play or Next to begin';
    }
    if (this.isAtEnd) {
      return `Complete - ${this.diagram.steps.length} steps`;
    }
    return `Step ${this.currentStepIndex + 1} of ${this.diagram.steps.length}`;
  }

  nodeState(id: string): NodeState {
    const idx = this.diagram.steps.findIndex(s => s.id === id);
    if (idx === this.currentStepIndex) {
      return 'active';
    }
    if (this.completedStepIds.has(id)) {
      return 'completed';
    }
    return 'idle';
  }

  edgeState(edgeId: string): EdgeState {
    if (edgeId === this.activeEdgeId) {
      return 'active';
    }
    if (this.traversedEdgeIds.has(edgeId)) {
      return 'traversed';
    }
    return 'idle';
  }

  edgeMarker(edgeId: string): string {
    switch (this.edgeState(edgeId)) {
      case 'active':
        return 'url(#fv-ar-active)';
      case 'traversed':
        return 'url(#fv-ar-traversed)';
      default:
        return 'url(#fv-ar-idle)';
    }
  }

  isActiveCodeLine(i: number): boolean {
    return this.currentStep?.codeLine === i;
  }

  isCompletedCodeLine(i: number): boolean {
    if (!this.diagram?.code) {
      return false;
    }

    return [...this.completedStepIds].some(
      id => this.diagram.steps.find(s => s.id === id)?.codeLine === i,
    );
  }

  private advance(): void {
    if (this.currentStepIndex >= 0) {
      const fromId = this.diagram.steps[this.currentStepIndex].id;
      this.completedStepIds.add(fromId);
      const nextStep = this.diagram.steps[this.currentStepIndex + 1];
      const incoming = nextStep ? this.diagram.edges.find(edge => edge.target === nextStep.id) : undefined;
      if (incoming) {
        const edgeId = `${incoming.source}__${incoming.target}`;
        this.traversedEdgeIds.add(edgeId);
        this.activeEdgeId = edgeId;
      } else {
        this.activeEdgeId = null;
      }
    }

    this.currentStepIndex++;
    this.stepSelected.emit(Math.max(0, this.currentStepIndex));
    this.scrollActiveStepIntoView(this.currentStepIndex);
    this.cdr.markForCheck();
  }

  private scrollActiveStepIntoView(index: number): void {
    if (this.orientation !== 'horizontal') {
      return;
    }

    const panel = this.diagramPanel?.nativeElement;
    const node = this.computedNodes[index];
    if (!panel || !node) {
      return;
    }

    window.setTimeout(() => {
      const focusRatio = this.hasCode ? 0.5 : 0.72;
      const maxLeft = Math.max(0, panel.scrollWidth - panel.clientWidth);
      const targetLeft = Math.min(maxLeft, Math.max(0, node.cx - panel.clientWidth * focusRatio));
      panel.scrollTo({
        left: targetLeft,
        behavior: 'smooth',
      });
    });
  }

  private stopPlay(): void {
    this.isPlaying = false;
    this.pause$.next();
  }

  private trimForNode(value: string, max: number): string {
    const text = value.replace(/\s+/g, ' ').trim();

    if (text.length <= max) {
      return text;
    }

    return `${text.slice(0, Math.max(0, max - 1)).replace(/\s+$/g, '')}...`;
  }

  private resetState(): void {
    this.currentStepIndex = -1;
    this.expandedStepIndex = null;
    this.completedStepIds.clear();
    this.traversedEdgeIds.clear();
    this.activeEdgeId = null;
    this.zoomLevel = 1;
    this.cdr.markForCheck();
  }

  private buildLayout(): void {
    const { steps, edges } = this.diagram;
    if (!steps.length) {
      return;
    }

    let nodeW = NODE_W;
    let nodeH = NODE_H;
    const inDeg = new Map<string, number>(steps.map(s => [s.id, 0]));
    const adj = new Map<string, string[]>(steps.map(s => [s.id, []]));

    edges.forEach(e => {
      adj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    });

    const layer = new Map<string, number>(steps.map(s => [s.id, 0]));
    const queue = steps
      .filter(s => (inDeg.get(s.id) ?? 0) === 0)
      .map(s => s.id);

    while (queue.length) {
      const id = queue.shift()!;
      for (const next of adj.get(id) ?? []) {
        layer.set(next, Math.max(layer.get(next) ?? 0, (layer.get(id) ?? 0) + 1));
        inDeg.set(next, (inDeg.get(next) ?? 0) - 1);
        if ((inDeg.get(next) ?? 0) === 0) {
          queue.push(next);
        }
      }
    }

    const byLayer = new Map<number, string[]>();
    layer.forEach((l, id) => {
      if (!byLayer.has(l)) {
        byLayer.set(l, []);
      }
      byLayer.get(l)!.push(id);
    });

    const maxLayer = Math.max(...layer.values(), 0);
    const maxCount = Math.max(...[...byLayer.values()].map(g => g.length), 1);
    const pos = new Map<string, { cx: number; cy: number }>();
    let svgW: number;
    let svgH: number;

    if (this.visualMode === 'tree') {
      nodeW = 178;
      nodeH = 92;
      const levels = new Map<number, FlowDiagram['steps']>();
      steps.forEach(step => {
        const currentDepth = step.depth ?? layer.get(step.id) ?? 0;
        const group = levels.get(currentDepth) || [];
        group.push(step);
        levels.set(currentDepth, group);
      });
      const levelNumbers = [...levels.keys()].sort((a, b) => a - b);
      const widest = Math.max(...[...levels.values()].map(group => group.length), 1);
      const colStep = 208;
      const rowStep = 175;
      svgW = Math.max(760, PAD_X * 2 + widest * colStep);
      svgH = PAD_Y * 2 + levelNumbers.length * rowStep;
      levelNumbers.forEach((depth, row) => {
        const group = levels.get(depth) || [];
        const width = (group.length - 1) * colStep;
        const startX = svgW / 2 - width / 2;
        group.forEach((step, column) => pos.set(step.id, {
          cx: startX + column * colStep,
          cy: PAD_Y + nodeH / 2 + row * rowStep,
        }));
      });
    } else if (this.orientation === 'horizontal' && steps.length > 4) {
      // A living-map path keeps arbitrary AI-generated concepts readable while
      // preserving sequence, bends, and room for labels around each station.
      nodeW = 72;
      nodeH = 72;
      const columns = steps.length > 9 ? 5 : 4;
      const rows = Math.ceil(steps.length / columns);
      const colStep = 220;
      const rowStep = 230;
      svgW = PAD_X * 2 + nodeW + (columns - 1) * colStep;
      svgH = PAD_Y * 2 + nodeH + (rows - 1) * rowStep;

      steps.forEach((step, index) => {
        const row = Math.floor(index / columns);
        const indexInRow = index % columns;
        const itemsInRow = Math.min(columns, steps.length - row * columns);
        const visualColumn = row % 2 === 0 ? indexInRow : itemsInRow - 1 - indexInRow;
        pos.set(step.id, {
          cx: PAD_X + nodeW / 2 + visualColumn * colStep,
          cy: PAD_Y + nodeH / 2 + row * rowStep,
        });
      });
    } else if (this.orientation === 'horizontal') {
      const contentH = maxCount * NODE_H + (maxCount - 1) * GAP;
      svgW = PAD_X + NODE_W / 2 + maxLayer * H_STEP + NODE_W / 2 + PAD_X;
      svgH = contentH + 2 * PAD_Y;

      byLayer.forEach((group, l) => {
        const colH = group.length * NODE_H + (group.length - 1) * GAP;
        const colStartY = PAD_Y + (contentH - colH) / 2;
        group.forEach((id, i) => {
          pos.set(id, {
            cx: PAD_X + NODE_W / 2 + l * H_STEP,
            cy: colStartY + NODE_H / 2 + i * (NODE_H + GAP),
          });
        });
      });
    } else {
      const contentW = maxCount * NODE_W + (maxCount - 1) * GAP;
      svgW = contentW + 2 * PAD_X;
      svgH = PAD_Y + NODE_H / 2 + maxLayer * V_STEP + NODE_H / 2 + PAD_Y;

      byLayer.forEach((group, l) => {
        const rowW = group.length * NODE_W + (group.length - 1) * GAP;
        const rowStartX = PAD_X + (contentW - rowW) / 2;
        group.forEach((id, i) => {
          pos.set(id, {
            cx: rowStartX + NODE_W / 2 + i * (NODE_W + GAP),
            cy: PAD_Y + NODE_H / 2 + l * V_STEP,
          });
        });
      });
    }

    this.svgWidth = svgW;
    this.svgHeight = svgH;
    this.svgViewBox = `0 0 ${svgW} ${svgH}`;
    this.computedNodes = steps.map(s => ({
      step: s,
      cx: pos.get(s.id)!.cx,
      cy: pos.get(s.id)!.cy,
      w: nodeW,
      h: nodeH,
    }));

    this.computedEdges = edges.map(e => {
      const src = pos.get(e.source)!;
      const tgt = pos.get(e.target)!;
      const horizontalEdge = Math.abs(tgt.cx - src.cx) >= Math.abs(tgt.cy - src.cy);
      const directionX = tgt.cx >= src.cx ? 1 : -1;
      const directionY = tgt.cy >= src.cy ? 1 : -1;
      const x1 = horizontalEdge ? src.cx + directionX * nodeW / 2 : src.cx;
      const y1 = horizontalEdge ? src.cy : src.cy + directionY * nodeH / 2;
      const x2 = horizontalEdge ? tgt.cx - directionX * nodeW / 2 : tgt.cx;
      const y2 = horizontalEdge ? tgt.cy : tgt.cy - directionY * nodeH / 2;
      const dx = horizontalEdge ? (x2 - x1) * .45 : 0;
      const dy = horizontalEdge ? 0 : (y2 - y1) * .45;

      return {
        edge: e,
        id: `${e.source}__${e.target}`,
        path: `M ${x1},${y1} C ${x1 + dx},${y1 + dy} ${x2 - dx},${y2 - dy} ${x2},${y2}`,
      };
    });
  }

  private createLayoutSignature(): string {
    if (!this.diagram) {
      return '';
    }

    return [
      this.orientation,
      this.diagram.title || '',
      this.diagram.codeLanguage || '',
      this.diagram.code?.length || 0,
      this.diagram.steps.map(step => `${step.id}:${step.label}`).join('|'),
      this.diagram.edges.map(edge => `${edge.source}>${edge.target}`).join('|'),
    ].join('::');
  }
}
