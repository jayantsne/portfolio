// ─── Roadmap Domain Models ───────────────────────────────────────────────────

export type NodeStatus     = 'completed' | 'active' | 'locked';
export type SkillLevel     = 'beginner' | 'intermediate' | 'advanced';
export type LearningGoal   = 'research' | 'industry' | 'projects' | 'interview';
export type Commitment     = 'casual' | 'regular' | 'intensive';
export type AICourseFocus  =
  | 'Machine Learning'
  | 'Deep Learning'
  | 'NLP'
  | 'Computer Vision'
  | 'Generative AI'
  | 'AI Engineering'
  | 'Data Science'
  | 'Reinforcement Learning';
/** @deprecated use AICourseFocus — kept for backwards compat with stored data */
export type ProgrammingLang = AICourseFocus;

export interface RoadmapNode {
  id:          string;
  order:       number;
  topic:       string;
  description: string;
  estMinutes:  number;
  status:      NodeStatus;
  completedAt: string | null;
  icon:        string;
}

export interface Roadmap {
  id:             string;
  title:          string;
  language:       AICourseFocus;
  level:          SkillLevel;
  goal:           LearningGoal;
  commitment:     Commitment;
  estimatedWeeks: number;
  nodes:          RoadmapNode[];
  createdAt:      string;
  lastAccessedAt: string;
  streakDays:     number;
  lastActiveDate: string | null;
}

export interface RoadmapProgress {
  completedCount: number;
  totalCount:     number;
  percent:        number;
  activeNode:     RoadmapNode | null;
  nextNode:       RoadmapNode | null;
}

export interface WizardState {
  language:   AICourseFocus | null;
  level:      SkillLevel      | null;
  goal:       LearningGoal    | null;
  commitment: Commitment      | null;
}

// ─── Static config data ──────────────────────────────────────────────────────

export const LANGUAGES: { value: AICourseFocus; label: string; icon: string }[] = [
  { value: 'Machine Learning',       label: 'Machine Learning',      icon: '🤖' },
  { value: 'Deep Learning',          label: 'Deep Learning',         icon: '🧠' },
  { value: 'NLP',                    label: 'NLP',                   icon: '💬' },
  { value: 'Computer Vision',        label: 'Computer Vision',       icon: '👁️' },
  { value: 'Generative AI',          label: 'Generative AI',         icon: '✨' },
  { value: 'AI Engineering',         label: 'AI Engineering',        icon: '🔧' },
  { value: 'Data Science',           label: 'Data Science',          icon: '📊' },
  { value: 'Reinforcement Learning', label: 'Reinforcement Learning',icon: '🎮' },
];

export const SKILL_LEVELS: { value: SkillLevel; label: string; icon: string; desc: string }[] = [
  { value: 'beginner',     label: 'Beginner',     icon: '🌱', desc: 'Little or no prior experience'     },
  { value: 'intermediate', label: 'Intermediate', icon: '🚀', desc: 'Comfortable with the basics'       },
  { value: 'advanced',     label: 'Advanced',     icon: '⚡', desc: 'Looking to master advanced topics' },
];

export const GOALS: { value: LearningGoal; label: string; icon: string; desc: string }[] = [
  { value: 'research',  label: 'Research Track',   icon: '🔬', desc: 'Theory, papers, academic depth'      },
  { value: 'industry',  label: 'Industry / MLOps', icon: '🏭', desc: 'Production pipelines, deployment'     },
  { value: 'projects',  label: 'Build AI Projects',icon: '🛠️', desc: 'Real AI-powered apps & APIs'          },
  { value: 'interview', label: 'Interview Prep',   icon: '💼', desc: 'ML concepts for technical interviews' },
];

export const COMMITMENTS: { value: Commitment; label: string; icon: string; hours: string }[] = [
  { value: 'casual',    label: 'Casual',    icon: '🌿', hours: '~2 hrs / week'  },
  { value: 'regular',   label: 'Regular',   icon: '📅', hours: '~5 hrs / week'  },
  { value: 'intensive', label: 'Intensive', icon: '🔥', hours: '~10 hrs / week' },
];
