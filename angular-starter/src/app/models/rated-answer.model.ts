export interface RatedAnswer {
  questionId: string;
  question: string;
  category: string;
  aiExplanation: string;
  rating: number;
  ratingCount: number;
  totalRating: number;
  createdAt: number;
  lastUpdated: number;
}

export interface AnswerRating {
  questionId: string;
  stars: number;
  timestamp: number;
}
