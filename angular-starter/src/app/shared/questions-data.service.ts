import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';

export interface InterviewQuestion {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  dateAdded?: string;
  expanded?: boolean;
}

export interface QuestionData {
  version: string;
  lastUpdated: string;
  totalQuestions: number;
  questions: InterviewQuestion[];
}

@Injectable({
  providedIn: 'root'
})
export class QuestionsDataService {
  private readonly VERSION = '1.0.0';
  
  private questionsSubject = new BehaviorSubject<InterviewQuestion[]>([]);
  public questions$ = this.questionsSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.loadFromMongoDB();
  }

  getQuestions(): InterviewQuestion[] {
    return this.questionsSubject.value;
  }

  addQuestion(question: InterviewQuestion): void {
    const questionToSave = {
      ...question,
      dateAdded: question.dateAdded ? new Date(question.dateAdded) : new Date()
    };
    
    this.apiService.addQuestion(questionToSave as any).subscribe(
      (savedQuestion) => {
        const questions = this.getQuestions();
        questions.push(savedQuestion as any);
        this.questionsSubject.next(questions);
      },
      (error) => {
        console.error('Error adding question to MongoDB:', error);
      }
    );
  }

  updateQuestion(question: InterviewQuestion): void {
    const questionToUpdate = {
      ...question,
      dateAdded: question.dateAdded ? new Date(question.dateAdded) : new Date()
    };
    
    this.apiService.updateQuestion(question.id, questionToUpdate as any).subscribe(
      (updatedQuestion) => {
        const questions = this.getQuestions();
        const index = questions.findIndex(q => q.id === question.id);
        if (index !== -1) {
          questions[index] = updatedQuestion as any;
          this.questionsSubject.next(questions);
        }
      },
      (error) => {
        console.error('Error updating question in MongoDB:', error);
      }
    );
  }

  deleteQuestion(id: number): void {
    this.apiService.deleteQuestion(id).subscribe(
      () => {
        const questions = this.getQuestions().filter(q => q.id !== id);
        this.questionsSubject.next(questions);
      },
      (error) => {
        console.error('Error deleting question from MongoDB:', error);
      }
    );
  }

  importQuestions(data: QuestionData): void {
    this.apiService.importQuestions({ questions: data.questions as any }).subscribe(
      () => {
        this.loadFromMongoDB();
      },
      (error) => {
        console.error('Error importing questions to MongoDB:', error);
      }
    );
  }

  exportData(): QuestionData {
    return {
      version: this.VERSION,
      lastUpdated: new Date().toISOString(),
      totalQuestions: this.getQuestions().length,
      questions: this.getQuestions()
    };
  }

  clearAll(): void {
    this.apiService.clearAllQuestions().subscribe(
      () => {
        this.questionsSubject.next([]);
      },
      (error) => {
        console.error('Error clearing questions from MongoDB:', error);
      }
    );
  }

  private loadFromMongoDB(): void {
    this.apiService.getQuestions().subscribe(
      (data) => {
        this.questionsSubject.next(data.questions as any || []);
        if (data.questions.length === 0) {
          this.loadSampleQuestions();
        }
      },
      (error) => {
        console.error('Error loading questions from MongoDB:', error);
        this.loadSampleQuestions();
      }
    );
  }

  private loadSampleQuestions(): void {
    const questions: InterviewQuestion[] = [
      {
        id: 1,
        question: 'What is Angular?',
        answer: 'Angular is a TypeScript-based open-source web application framework led by the Angular Team at Google. It provides a comprehensive solution for building modern web applications with features like dependency injection, two-way data binding, routing, and more.',
        category: 'Angular',
        difficulty: 'Easy',
        tags: ['framework', 'basics'],
        dateAdded: new Date().toISOString(),
        expanded: false
      },
      {
        id: 2,
        question: 'Explain the Singleton Pattern',
        answer: 'The Singleton Pattern ensures a class has only one instance and provides a global point of access to it. It\'s useful when exactly one object is needed to coordinate actions across the system. Implementation involves making the constructor private, creating a static instance variable, and providing a static method to access that instance.',
        category: 'Design Patterns',
        difficulty: 'Medium',
        tags: ['creational', 'singleton'],
        dateAdded: new Date().toISOString(),
        expanded: false
      },
      {
        id: 3,
        question: 'What is the difference between .NET Framework and .NET Core?',
        answer: '.NET Framework is Windows-only and has been around since 2002. .NET Core (now just .NET 5+) is cross-platform (Windows, Linux, macOS), open-source, and optimized for modern cloud-based applications. .NET Core has better performance, supports side-by-side versioning, and is the future of the .NET platform.',
        category: '.NET Core',
        difficulty: 'Medium',
        tags: ['dotnet', 'framework', 'cross-platform'],
        dateAdded: new Date().toISOString(),
        expanded: false
      },
      {
        id: 4,
        question: 'Explain SOLID Principles',
        answer: 'SOLID is an acronym for five design principles:\n- S: Single Responsibility Principle - A class should have only one reason to change\n- O: Open/Closed Principle - Open for extension, closed for modification\n- L: Liskov Substitution Principle - Derived classes must be substitutable for base classes\n- I: Interface Segregation Principle - Many specific interfaces are better than one general interface\n- D: Dependency Inversion Principle - Depend on abstractions, not concretions',
        category: 'SOLID Principles',
        difficulty: 'Medium',
        tags: ['principles', 'architecture', 'best-practices'],
        dateAdded: new Date().toISOString(),
        expanded: false
      }
    ];

    // Push directly to subject — do NOT try to re-save to MongoDB (would 401 again)
    this.questionsSubject.next(questions);
  }
}
