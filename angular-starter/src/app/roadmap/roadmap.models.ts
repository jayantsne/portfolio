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

export const LANGUAGES: { value: AICourseFocus; label: string; icon: string; desc: string; topicCount: number }[] = [
  { value: 'Machine Learning',       label: 'Machine Learning',       icon: '🤖', desc: 'Core algorithms, model training & evaluation',   topicCount: 20 },
  { value: 'Deep Learning',          label: 'Deep Learning',          icon: '🧠', desc: 'Neural networks, CNNs, transformers & beyond',    topicCount: 18 },
  { value: 'NLP',                    label: 'NLP',                    icon: '💬', desc: 'Text processing, LLMs & language understanding',  topicCount: 16 },
  { value: 'Computer Vision',        label: 'Computer Vision',        icon: '👁️', desc: 'Image recognition, detection & visual AI',        topicCount: 15 },
  { value: 'Generative AI',          label: 'Generative AI',          icon: '✨', desc: 'Diffusion models, GPT prompting & creative AI',   topicCount: 14 },
  { value: 'AI Engineering',         label: 'AI Engineering',         icon: '🔧', desc: 'MLOps, deployment, pipelines & serving',          topicCount: 18 },
  { value: 'Data Science',           label: 'Data Science',           icon: '📊', desc: 'Analysis, statistics, pandas & visualization',    topicCount: 20 },
  { value: 'Reinforcement Learning', label: 'Reinforcement Learning', icon: '🎮', desc: 'Agents, rewards, Q-learning & policy networks',   topicCount: 14 },
];

export const SKILL_LEVELS: { value: SkillLevel; label: string; icon: string; desc: string; knowledge: string }[] = [
  { value: 'beginner',     label: 'Beginner',     icon: '🌱', desc: 'Little or no prior experience',     knowledge: 'No prerequisites — start from scratch' },
  { value: 'intermediate', label: 'Intermediate', icon: '🚀', desc: 'Comfortable with the basics',       knowledge: 'Familiar with core concepts & some code' },
  { value: 'advanced',     label: 'Advanced',     icon: '⚡', desc: 'Looking to master advanced topics', knowledge: 'Production AI or research background' },
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
