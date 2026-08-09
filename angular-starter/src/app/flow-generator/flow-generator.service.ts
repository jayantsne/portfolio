import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GenerateFlowRequest {
  concept: string;
  audience: string;
  flowType: string;
  animationStyle: string;
}

export interface FlowDiagramResponse {
  title: string;
  summary: string;
  learningMode?: 'flow' | 'concept' | string;
  mentalModel?: string;
  visualization?: FlowVisualizationResponse;
  codeLanguage: string;
  code: string[];
  steps: FlowStepResponse[];
  edges: FlowEdgeResponse[];
  revisionTips: FlowRevisionTipResponse[];
}

export interface FlowVisualizationResponse {
  type: string;
  rationale?: string;
  primaryMetaphor?: string;
  direction?: string;
  animationNarrative?: string;
  phases?: string[];
}

export interface FlowStepResponse {
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
  nodeKind?: string;
  parentId?: string;
  group?: string;
  depth?: number | null;
  visualItems?: string[];
  codeLine?: number | null;
}

export interface FlowEdgeResponse {
  source: string;
  target: string;
  relationship?: string;
  label?: string;
}

export interface FlowRevisionTipResponse {
  title: string;
  detail: string;
}

export interface ExplainFlowStepRequest {
  concept: string;
  learningMode: string;
  stepLabel: string;
  stepDescription: string;
  audience: string;
  codeLanguage: string;
  codeLine: string;
}

export interface ExplainFlowStepResponse {
  plainEnglish: string;
  howItWorks: string;
  realExample: string;
  commonMistake: string;
  interviewAnswer: string;
}

@Injectable({ providedIn: 'root' })
export class FlowGeneratorService {
  private readonly endpoint = `${environment.apiUrl}/flow-generator/generate`;
  private readonly explainEndpoint = `${environment.apiUrl}/flow-generator/explain-step`;

  constructor(private http: HttpClient) {}

  generateFlow(request: GenerateFlowRequest): Observable<FlowDiagramResponse> {
    return this.http.post<FlowDiagramResponse>(this.endpoint, request);
  }

  explainStep(request: ExplainFlowStepRequest): Observable<ExplainFlowStepResponse> {
    return this.http.post<ExplainFlowStepResponse>(this.explainEndpoint, request);
  }
}
