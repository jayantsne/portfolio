import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
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

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_W   = 182;  // node width  (px, in SVG coordinate space)
const NODE_H   = 52;   // node height
const V_STEP   = 110;  // vertical center-to-center between layers
const H_GAP    = 28;   // horizontal gap between sibling nodes in same layer
const PAD_X    = 64;   // left/right canvas padding
const PAD_Y    = 52;   // top/bottom canvas padding

const PLAY_MS  = 1700; // ms between auto-advance steps

@Component({
  selector: 'app-flow-visualizer',
  templateUrl: './flow-visualizer.component.html',
  styleUrls: ['./flow-visualizer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowVisualizerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() diagram!: FlowDiagram;

  // ─── Rendered geometry ──────────────────────────────────────────────────────
  computedNodes: ComputedNode[] = [];
  computedEdges: ComputedEdge[] = [];
  svgViewBox = '0 0 310 500';

  // ─── Playback state ─────────────────────────────────────────────────────────
  currentStepIndex = -1;
  isPlaying        = false;

  private completedStepIds  = new Set<string>();
  private traversedEdgeIds  = new Set<string>();
  private activeEdgeId: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly pause$   = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (this.diagram) { this.buildLayout(); }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['diagram']?.currentValue) {
      this.resetState();
      this.buildLayout();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Public controls ────────────────────────────────────────────────────────

  play(): void {
    if (this.isPlaying || this.isAtEnd) { return; }
    this.isPlaying = true;

    interval(PLAY_MS).pipe(
      takeUntil(this.pause$),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      if (!this.isAtEnd) {
        this.advance();
        this.cdr.markForCheck();
      } else {
        this.stopPlay();
      }
    });
  }

  pause(): void {
    if (!this.isPlaying) { return; }
    this.stopPlay();
  }

  next(): void {
    if (this.isAtEnd) { return; }
    this.advance();
  }

  reset(): void {
    this.stopPlay();
    this.resetState();
  }

  // ─── Template queries ────────────────────────────────────────────────────────

  get currentStep() {
    return this.currentStepIndex >= 0
      ? this.diagram.steps[this.currentStepIndex]
      : null;
  }

  get progressPercent(): number {
    const total = this.diagram?.steps.length ?? 0;
    if (!total) { return 0; }
    return (Math.max(0, this.currentStepIndex + 1) / total) * 100;
  }

  get isAtEnd(): boolean {
    return !!this.diagram && this.currentStepIndex === this.diagram.steps.length - 1;
  }

  get stepLabel(): string {
    if (!this.diagram) { return ''; }
    if (this.currentStepIndex < 0)        { return 'Press Play or → Next to begin'; }
    if (this.isAtEnd)                      { return `✓ Complete — ${this.diagram.steps.length} steps`; }
    return `Step ${this.currentStepIndex + 1} of ${this.diagram.steps.length}`;
  }

  nodeState(id: string): NodeState {
    const idx = this.diagram.steps.findIndex(s => s.id === id);
    if (idx === this.currentStepIndex)    { return 'active'; }
    if (this.completedStepIds.has(id))    { return 'completed'; }
    return 'idle';
  }

  edgeState(edgeId: string): EdgeState {
    if (edgeId === this.activeEdgeId)         { return 'active'; }
    if (this.traversedEdgeIds.has(edgeId))    { return 'traversed'; }
    return 'idle';
  }

  edgeMarker(edgeId: string): string {
    switch (this.edgeState(edgeId)) {
      case 'active':    return 'url(#fv-ar-active)';
      case 'traversed': return 'url(#fv-ar-traversed)';
      default:          return 'url(#fv-ar-idle)';
    }
  }

  isActiveCodeLine(i: number): boolean {
    return this.currentStep?.codeLine === i;
  }

  isCompletedCodeLine(i: number): boolean {
    if (!this.diagram?.code) { return false; }
    return [...this.completedStepIds].some(
      id => this.diagram.steps.find(s => s.id === id)?.codeLine === i,
    );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private advance(): void {
    if (this.currentStepIndex >= 0) {
      const fromId = this.diagram.steps[this.currentStepIndex].id;
      const toId   = this.diagram.steps[this.currentStepIndex + 1].id;
      const eid    = `${fromId}__${toId}`;
      this.completedStepIds.add(fromId);
      this.traversedEdgeIds.add(eid);
      this.activeEdgeId = eid;       // glows until the next advance
    }
    this.currentStepIndex++;
    this.cdr.markForCheck();
  }

  private stopPlay(): void {
    this.isPlaying = false;
    this.pause$.next();
  }

  private resetState(): void {
    this.currentStepIndex = -1;
    this.completedStepIds.clear();
    this.traversedEdgeIds.clear();
    this.activeEdgeId = null;
    this.cdr.markForCheck();
  }

  // ─── DAG layout engine (Sugiyama-lite) ───────────────────────────────────────
  /**
   * Assigns each node a "layer" (row) using longest-path BFS from root nodes.
   * Handles linear chains, branches (diamonds), and merges correctly.
   * Nodes in the same layer are spread horizontally and centred as a group.
   */
  private buildLayout(): void {
    const { steps, edges } = this.diagram;
    if (!steps.length) { return; }

    /* ── 1. Build adjacency + in-degree maps ─────────────────────── */
    const inDeg = new Map<string, number>(steps.map(s => [s.id, 0]));
    const adj   = new Map<string, string[]>(steps.map(s => [s.id, []]));
    edges.forEach(e => {
      adj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    });

    /* ── 2. Longest-path BFS for layer assignment ────────────────── */
    const layer = new Map<string, number>(steps.map(s => [s.id, 0]));
    const queue = steps
      .filter(s => (inDeg.get(s.id) ?? 0) === 0)
      .map(s => s.id);

    while (queue.length) {
      const id = queue.shift()!;
      for (const nxt of adj.get(id) ?? []) {
        layer.set(nxt, Math.max(layer.get(nxt) ?? 0, (layer.get(id) ?? 0) + 1));
        inDeg.set(nxt, (inDeg.get(nxt) ?? 0) - 1);
        if ((inDeg.get(nxt) ?? 0) === 0) { queue.push(nxt); }
      }
    }

    /* ── 3. Group nodes by layer ─────────────────────────────────── */
    const byLayer = new Map<number, string[]>();
    layer.forEach((l, id) => {
      if (!byLayer.has(l)) { byLayer.set(l, []); }
      byLayer.get(l)!.push(id);
    });

    /* ── 4. Compute SVG canvas width ─────────────────────────────── */
    const maxCount = Math.max(...[...byLayer.values()].map(g => g.length), 1);
    const contentW = maxCount * NODE_W + (maxCount - 1) * H_GAP;
    const svgW     = contentW + 2 * PAD_X;

    /* ── 5. Assign pixel positions (centres), centring each row ──── */
    const pos = new Map<string, { cx: number; cy: number }>();
    byLayer.forEach((grp, l) => {
      const rowW       = grp.length * NODE_W + (grp.length - 1) * H_GAP;
      const rowStartX  = PAD_X + (contentW - rowW) / 2;
      grp.forEach((id, i) => {
        pos.set(id, {
          cx: rowStartX + NODE_W / 2 + i * (NODE_W + H_GAP),
          cy: PAD_Y + NODE_H / 2 + l * V_STEP,
        });
      });
    });

    /* ── 6. Compute canvas height ─────────────────────────────────── */
    const maxLayer = Math.max(...layer.values(), 0);
    const svgH     = PAD_Y + NODE_H / 2 + maxLayer * V_STEP + NODE_H / 2 + PAD_Y;
    this.svgViewBox = `0 0 ${svgW} ${svgH}`;

    /* ── 7. Build ComputedNode array ─────────────────────────────── */
    this.computedNodes = steps.map(s => ({
      step: s,
      cx: pos.get(s.id)!.cx,
      cy: pos.get(s.id)!.cy,
      w: NODE_W,
      h: NODE_H,
    }));

    /* ── 8. Build ComputedEdge array (cubic bezier paths) ────────── */
    this.computedEdges = edges.map(e => {
      const src = pos.get(e.source)!;
      const tgt = pos.get(e.target)!;
      // Exit: bottom-centre of source; Entry: top-centre of target
      const x1 = src.cx;
      const y1 = src.cy + NODE_H / 2;
      const x2 = tgt.cx;
      const y2 = tgt.cy - NODE_H / 2;
      const dy = Math.min(Math.abs(y2 - y1) * 0.45, 50);
      const dx = Math.abs(x2 - x1) > 4 ? (x2 - x1) * 0.5 : 0;
      return {
        edge: e,
        id:   `${e.source}__${e.target}`,
        path: `M ${x1},${y1} C ${x1 + dx},${y1 + dy} ${x2 - dx},${y2 - dy} ${x2},${y2}`,
      };
    });
  }
}
