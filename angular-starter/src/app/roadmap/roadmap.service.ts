import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { CustomAuthService } from '../shared/custom-auth.service';
import { AILearnService } from '../services/ai-learn.service';
import {
  Roadmap, RoadmapNode, RoadmapProgress, WizardState,
  NodeStatus, AICourseFocus, SkillLevel, LearningGoal, Commitment,
} from './roadmap.models';

const STORAGE_KEY = 'rm_saved_roadmaps';

@Injectable({ providedIn: 'root' })
export class RoadmapService {

  constructor(
    private auth:    CustomAuthService,
    private aiSvc:   AILearnService,
  ) {}

  // ─── Storage helpers (per-user) ──────────────────────────────────────────

  private storageKey(): string {
    return `${STORAGE_KEY}_${this.auth.currentUser?.userId ?? 'guest'}`;
  }

  loadAll(): Roadmap[] {
    try {
      const raw = localStorage.getItem(this.storageKey());
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveAll(roadmaps: Roadmap[]): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(roadmaps));
  }

  getById(id: string): Roadmap | null {
    return this.loadAll().find(r => r.id === id) ?? null;
  }

  save(roadmap: Roadmap): void {
    const all = this.loadAll().filter(r => r.id !== roadmap.id);
    this.saveAll([roadmap, ...all]);
  }

  rename(id: string, newTitle: string): void {
    const all = this.loadAll().map(r => r.id === id ? { ...r, title: newTitle } : r);
    this.saveAll(all);
  }

  delete(id: string): void {
    this.saveAll(this.loadAll().filter(r => r.id !== id));
  }

  // ─── Progress ────────────────────────────────────────────────────────────

  computeProgress(nodes: RoadmapNode[]): RoadmapProgress {
    const completed    = nodes.filter(n => n.status === 'completed');
    const activeNode   = nodes.find(n => n.status === 'active') ?? null;
    const activeIdx    = activeNode ? nodes.indexOf(activeNode) : -1;
    const nextNode     = activeIdx >= 0 ? (nodes[activeIdx + 1] ?? null) : null;
    return {
      completedCount: completed.length,
      totalCount:     nodes.length,
      percent:        nodes.length ? Math.round((completed.length / nodes.length) * 100) : 0,
      activeNode,
      nextNode,
    };
  }

  markNodeComplete(roadmapId: string, nodeId: string): Roadmap | null {
    const roadmap = this.getById(roadmapId);
    if (!roadmap) return null;

    const nodeIdx  = roadmap.nodes.findIndex(n => n.id === nodeId);
    if (nodeIdx === -1) return null;

    roadmap.nodes[nodeIdx].status      = 'completed';
    roadmap.nodes[nodeIdx].completedAt = new Date().toISOString();

    // unlock next node
    const next = roadmap.nodes[nodeIdx + 1];
    if (next && next.status === 'locked') next.status = 'active';

    // update streak
    roadmap.lastActiveDate  = new Date().toISOString();
    roadmap.streakDays      = this.calcStreak(roadmap);
    roadmap.lastAccessedAt  = new Date().toISOString();

    this.save(roadmap);
    return roadmap;
  }

  private calcStreak(roadmap: Roadmap): number {
    const completedDates = roadmap.nodes
      .filter(n => n.completedAt)
      .map(n => new Date(n.completedAt!).toDateString());

    const uniqueDays = [...new Set(completedDates)].sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );
    if (!uniqueDays.length) return 0;

    let streak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const diff = (new Date(uniqueDays[i - 1]).getTime() - new Date(uniqueDays[i]).getTime())
        / (1000 * 60 * 60 * 24);
      if (diff <= 1.5) streak++;
      else break;
    }
    return streak;
  }

  // ─── AI: generate roadmap nodes ─────────────────────────────────────────

  generateRoadmap(wizard: WizardState): Observable<string> {
    const { language, level, goal, commitment } = wizard;
    const weeklyHours = commitment === 'casual' ? 2 : commitment === 'regular' ? 5 : 10;
    const totalWeeks  = commitment === 'casual' ? 12 : commitment === 'regular' ? 8 : 5;

    const prompt = `You are an AI curriculum designer.
Generate a structured learning roadmap for:
- AI Domain: ${language}
- Skill Level: ${level}
- Goal: ${goal}
- Commitment: ${commitment} (~${weeklyHours} hrs/week, ~${totalWeeks} weeks)

Return ONLY a valid JSON array of 10-12 learning nodes. No markdown, no code blocks, just raw JSON.

Format:
[
  {"order":1,"topic":"Topic Name","description":"One sentence description (max 10 words)","estMinutes":20,"icon":"single_emoji"},
  ...
]

Rules:
- Topics must be ordered from fundamentals to advanced
- icon MUST be a single emoji character only (not text, not multiple emojis)
- estMinutes between 15 and 60
- First topic: absolute starting point for a ${level} learner of ${language}
- Last topic: a practical project or real-world application
- All topics must be specifically about ${language}
- Match the goal: ${goal} — focus topics accordingly`;

    return this.aiSvc.getSimplifiedExplanation(prompt);
  }

  // ─── AI: explain a topic node for the lesson panel ───────────────────────

  explainNode(node: RoadmapNode, language: AICourseFocus, level: SkillLevel): Observable<any> {
    const prompt = `You are an expert AI teacher. Teach me "${node.topic}" in the context of ${language} for a ${level} learner.

Structure your response as:
1. **What it is** — one-line essence
2. **Why it matters** — real-world significance
3. **How it works** — step-by-step explanation
4. **Practical example** — code or concrete walkthrough
5. **Key takeaway** — the one thing to remember

Be concise, visual with examples, and avoid unnecessary jargon.`;

    return this.aiSvc.getSimplifiedExplanation(prompt);
  }

  // ─── Factory: build a new Roadmap from wizard + AI nodes ────────────────

  buildRoadmap(wizard: WizardState, rawNodes: RoadmapNode[]): Roadmap {
    const goalLabels: Record<string, string> = {
      research: 'Research Track', industry: 'MLOps / Industry',
      projects: 'AI Projects',    interview: 'Interview Prep',
    };
    const estWeeks = wizard.commitment === 'casual' ? 12 : wizard.commitment === 'regular' ? 8 : 5;

    return {
      id:             'rm_' + Date.now().toString(36),
      title:          `${wizard.language} ${goalLabels[wizard.goal!]} Path`,
      language:       wizard.language!,
      level:          wizard.level!,
      goal:           wizard.goal!,
      commitment:     wizard.commitment!,
      estimatedWeeks: estWeeks,
      nodes:          rawNodes,
      createdAt:      new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      streakDays:     0,
      lastActiveDate: null,
    };
  }

  /** Parse the raw AI JSON string into typed RoadmapNode[] */
  parseNodes(raw: string): RoadmapNode[] {
    // strip potential markdown code fences
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // find JSON array
    const start = clean.indexOf('[');
    const end   = clean.lastIndexOf(']');
    if (start === -1 || end === -1) return this.fallbackNodes();

    try {
      const arr = JSON.parse(clean.substring(start, end + 1));
      return arr.map((n: any, i: number) => ({
        id:          'node_' + i + '_' + Date.now().toString(36),
        order:       n.order ?? i + 1,
        topic:       n.topic ?? `Topic ${i + 1}`,
        description: n.description ?? '',
        estMinutes:  n.estMinutes ?? 20,
        status:      (i === 0 ? 'active' : 'locked') as NodeStatus,
        completedAt: null,
        icon:        n.icon ?? '📌',
      }));
    } catch {
      return this.fallbackNodes();
    }
  }

  private fallbackNodes(): RoadmapNode[] {
    const topics = [
      { topic: 'AI Fundamentals',        icon: '🤖', desc: 'Core concepts and the AI landscape' },
      { topic: 'Math Foundations',       icon: '📐', desc: 'Linear algebra, calculus, statistics' },
      { topic: 'Data Preprocessing',     icon: '🔧', desc: 'Clean and transform raw datasets' },
      { topic: 'Supervised Learning',    icon: '🎯', desc: 'Regression and classification models' },
      { topic: 'Model Evaluation',       icon: '📊', desc: 'Metrics, validation, and overfitting' },
      { topic: 'Neural Networks',        icon: '🧠', desc: 'Perceptrons, layers, and backprop' },
      { topic: 'Feature Engineering',    icon: '⚙️', desc: 'Extract signal from raw data' },
      { topic: 'Unsupervised Learning',  icon: '🔍', desc: 'Clustering and dimensionality reduction' },
      { topic: 'Model Deployment',       icon: '🚀', desc: 'APIs, containers, and serving models' },
      { topic: 'Capstone AI Project',    icon: '🏆', desc: 'Apply everything in a real project' },
    ];
    return topics.map((t: any, i) => ({
      id:          'node_' + i + '_fb',
      order:       i + 1,
      topic:       t.topic,
      description: t.desc ?? 'Core AI concept for this level',
      estMinutes:  20,
      status:      (i === 0 ? 'active' : 'locked') as NodeStatus,
      completedAt: null,
      icon:        t.icon,
    }));
  }
}
