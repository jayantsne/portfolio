import {
  Component, Input, ChangeDetectionStrategy,
} from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { SectionType, SECTION_META } from '../learning-workspace.models';

@Component({
  selector: 'app-lw-lesson-card',
  templateUrl: './lw-lesson-card.component.html',
  styleUrls: ['./lw-lesson-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwLessonCardComponent {
  /**
   * Section type — drives header icon/title defaults and card accent colour.
   */
  @Input() type: SectionType = 'concept';

  /**
   * Pre-rendered SafeHtml (caller handles sanitization / markdown parsing).
   */
  @Input() htmlContent: SafeHtml = '';

  /** Override default section icon */
  @Input() icon = '';

  /** Override default section title */
  @Input() title = '';

  get meta() {
    const m = SECTION_META[this.type] ?? { icon: '📋', title: 'Section' };
    return { icon: this.icon || m.icon, title: this.title || m.title };
  }

  get isCode():     boolean { return this.type === 'code'; }
  get isPractice(): boolean { return this.type === 'practice'; }
  get isExamTip():  boolean { return this.type === 'exam-tip'; }
}
