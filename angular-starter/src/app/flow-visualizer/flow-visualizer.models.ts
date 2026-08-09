/** Core data model — define your diagram here, the visualizer handles the rest. */
export interface FlowStep {
  id: string;
  label: string;
  description: string;
  whyItMatters?: string;
  trigger?: string;
  input?: string;
  internalWork?: string;
  output?: string;
  example?: string;
  antiPattern?: string;
  interviewAnswer?: string;
  interviewTip?: string;
  nodeKind?: string;
  parentId?: string;
  group?: string;
  depth?: number;
  visualItems?: string[];
  /** Zero-based index into FlowDiagram.code[] to highlight when this step is active. */
  codeLine?: number;
}

export interface FlowEdge {
  source: string;
  target: string;
  relationship?: string;
  label?: string;
}

export interface FlowVisualization {
  type: 'tree' | 'cycle' | 'pipeline' | 'network' | 'layers' | 'timeline' | 'comparison' | 'journey' | string;
  rationale?: string;
  primaryMetaphor?: string;
  direction?: 'horizontal' | 'vertical' | 'radial' | string;
  animationNarrative?: string;
  phases?: string[];
}

export interface FlowDiagram {
  title?: string;
  visualization?: FlowVisualization;
  steps: FlowStep[];
  edges: FlowEdge[];
  /** Lines of source code to display in the code panel. */
  code?: string[];
  codeLanguage?: string;
}

// ─── Internal computed types (used by the renderer, not by consumers) ─────────

export interface ComputedNode {
  step: FlowStep;
  /** Center X in SVG coordinate space. */
  cx: number;
  /** Center Y in SVG coordinate space. */
  cy: number;
  w: number;
  h: number;
}

export interface ComputedEdge {
  edge: FlowEdge;
  /** SVG cubic-bezier path string. */
  path: string;
  /** Stable unique id: "${source}__${target}" */
  id: string;
}

export type NodeState = 'idle' | 'active' | 'completed';
export type EdgeState = 'idle' | 'traversed' | 'active';
