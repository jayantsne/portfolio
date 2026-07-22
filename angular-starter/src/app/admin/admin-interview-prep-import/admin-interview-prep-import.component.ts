import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AdminInterviewPrepService, AdminPrepImportQuestion } from '../admin-interview-prep/admin-interview-prep.service';
import { DOTNET_CORE_QUESTION_PACK } from './dotnet-core-question-pack';
import { SQL_QUESTION_PACK } from './sql-question-pack';

type ImportMode = 'lines' | 'json';

@Component({
  selector: 'app-admin-interview-prep-import',
  templateUrl: './admin-interview-prep-import.component.html',
  styleUrls: ['./admin-interview-prep-import.component.css']
})
export class AdminInterviewPrepImportComponent {
  importMode: ImportMode = 'lines';
  replaceExisting = false;
  importText = '';
  importPreview: AdminPrepImportQuestion[] = [];
  importError = '';
  loading = false;
  message = '';

  readonly sampleLines = [
    '.NET | What is middleware in ASP.NET Core? | middleware, pipeline',
    'Web API | How do you handle API versioning? | versioning, rest',
    'Design Patterns | What is Repository Pattern? | architecture, ef-core',
    'Azure | How do you secure Azure App Service configuration? | cloud, security',
    'AI | What is RAG and when do you use it? | gen-ai'
  ].join('\n');

  readonly sampleJson = JSON.stringify([
    {
      category: '.NET',
      question: 'How do you handle API versioning?',
      difficulty: 'Medium',
      tags: ['web-api', 'versioning'],
      noteUrl: '/notes?search=api%20versioning'
    }
  ], null, 2);

  constructor(
    private prepService: AdminInterviewPrepService,
    private router: Router
  ) {}

  parseImport(): void {
    this.importError = '';
    this.importPreview = [];

    try {
      if (this.importMode === 'json') {
        const parsed = JSON.parse(this.importText || '[]');
        if (!Array.isArray(parsed)) {
          this.importError = 'JSON must be an array of question objects.';
          return;
        }

        this.importPreview = parsed
          .filter(x => x?.question)
          .map(x => ({
            question: String(x.question).trim(),
            category: String(x.category || 'General').trim(),
            difficulty: String(x.difficulty || 'Medium').trim(),
            tags: Array.isArray(x.tags) ? x.tags.map(String) : [],
            answerHint: x.answerHint ? String(x.answerHint) : '',
            noteUrl: x.noteUrl ? String(x.noteUrl) : '',
            allowedUserIds: Array.isArray(x.allowedUserIds) ? x.allowedUserIds.map(String) : []
          }));
        return;
      }

      this.importPreview = this.importText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split('|').map(x => x.trim());
          const category = parts.length > 1 ? parts[0] : 'General';
          const question = parts.length > 1 ? parts[1] : parts[0];
          const tags = (parts[2] || '').split(',').map(x => x.trim()).filter(Boolean);
          return { category, question, difficulty: 'Medium', tags };
        })
        .filter(x => x.question.length > 0);
    } catch (err: any) {
      this.importError = err?.message || 'Could not parse import text.';
    }
  }

  async importQuestions(): Promise<void> {
    this.parseImport();
    if (this.importPreview.length === 0) {
      this.importError = 'No valid questions found.';
      return;
    }

    this.loading = true;
    this.message = '';
    try {
      const result = await this.prepService.importQuestions(this.importPreview, this.replaceExisting);
      this.message = `${result.imported} questions imported.`;
      this.importText = '';
      this.importPreview = [];
    } catch {
      this.importError = 'Import failed. Confirm you are logged in as ADMIN.';
    } finally {
      this.loading = false;
    }
  }

  useSample(): void {
    this.importText = this.importMode === 'json' ? this.sampleJson : this.sampleLines;
    this.parseImport();
  }

  useDotNetCorePack(): void {
    this.importMode = 'json';
    this.replaceExisting = false;
    this.importText = JSON.stringify(DOTNET_CORE_QUESTION_PACK, null, 2);
    this.parseImport();
    this.message = `${DOTNET_CORE_QUESTION_PACK.length} .NET Core questions are ready to import.`;
  }

  useSqlPack(): void {
    this.importMode = 'json';
    this.replaceExisting = false;
    this.importText = JSON.stringify(SQL_QUESTION_PACK, null, 2);
    this.parseImport();
    this.message = `${SQL_QUESTION_PACK.length} SQL questions are ready to import.`;
  }

  backToPlanner(): void {
    this.router.navigate(['/admin/interview-prep']);
  }
}
