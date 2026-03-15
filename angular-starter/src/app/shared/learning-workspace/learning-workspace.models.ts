/** Shared data models for the LearningWorkspace component suite. */

export type TopicStatus = 'completed' | 'active' | 'locked';

export interface LwTopic {
  id: string;
  title: string;
  icon: string;
  status: TopicStatus;
  estMinutes: number;
  description?: string;
  order: number;
  /** Optional tag shown as a small badge (e.g. "New", "Core") */
  tag?: string;
}

export interface LwModule {
  id: string;
  title: string;
  icon?: string;
  topics: LwTopic[];
}

export type SectionType =
  | 'concept'
  | 'analogy'
  | 'example'
  | 'code'
  | 'keypoints'
  | 'practice'
  | 'exam-tip';

export interface LwSection {
  type: SectionType;
  title: string;
  icon: string;
  content: string;
}

export interface LwMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface LwNote {
  topicTitle: string;
  text: string;
  createdAt: Date;
}

/** Config passed down from the host to tune workspace behaviour */
export interface LwConfig {
  /** Show/hide the AI playground strip at the bottom */
  showPlayground?: boolean;
  /** Show/hide the right mentor panel */
  showMentor?: boolean;
  /** Sidebar width override (CSS value, e.g. '240px') */
  sidebarWidth?: string;
  /** Mentor panel width override (CSS value, e.g. '300px') */
  mentorWidth?: string;
}

export const SECTION_META: Record<SectionType, { icon: string; title: string }> = {
  concept:   { icon: '💡', title: 'Concept' },
  analogy:   { icon: '🔗', title: 'Real-world Analogy' },
  example:   { icon: '📌', title: 'Example' },
  code:      { icon: '💻', title: 'Code Snippet' },
  keypoints: { icon: '🎯', title: 'Key Points' },
  practice:  { icon: '✏️', title: 'Practice Question' },
  'exam-tip':{ icon: '🏆', title: 'Exam Tip' },
};

/** Quick-action chips shown in the mentor panel */
export const MENTOR_CHIPS: { label: string; icon: string; prompt: string }[] = [
  { icon: '🔤', label: 'Explain Simply',   prompt: 'Please explain this concept in even simpler terms, as if I am a complete beginner. Use plain language and avoid jargon.' },
  { icon: '🔗', label: 'Analogy',          prompt: 'Give me a memorable real-world analogy that makes this concept intuitive and easy to remember.' },
  { icon: '❓', label: 'Interview Q',      prompt: 'Give me a typical interview question on this topic with a model answer I can practise.' },
  { icon: '⚠️', label: 'Common Mistakes',  prompt: 'What are the most common mistakes and misconceptions learners have about this concept? How can I avoid them?' },
  { icon: '💻', label: 'Code Example',     prompt: 'Write a short, practical, runnable code example that demonstrates this concept clearly.' },
  { icon: '🏆', label: 'Exam Tips',        prompt: 'Give me the most important exam tips and key points to remember about this topic for a test or certification.' },
];
