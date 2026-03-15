import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core';
import { LwTopic, LwModule } from '../learning-workspace.models';

@Component({
  selector: 'app-lw-sidebar',
  templateUrl: './lw-sidebar.component.html',
  styleUrls: ['./lw-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwSidebarComponent {
  /** Flat topic list (used when no modules grouping is needed) */
  @Input() topics: LwTopic[] = [];

  /** Grouped modules — if provided, overrides flat `topics` */
  @Input() modules: LwModule[] | null = null;

  /** ID of the currently selected/active topic */
  @Input() activeTopicId: string | null = null;

  /** Roadmap title shown at top of sidebar */
  @Input() roadmapTitle = '';

  /** Roadmap icon shown next to title */
  @Input() roadmapIcon = '🗺️';

  /** Emits the LwTopic the user clicked */
  @Output() topicSelect = new EventEmitter<LwTopic>();

  /** Number of quiz questions — shows the quiz button when > 0 */
  @Input() quizCount = 0;

  /** Fired when user clicks the Module Quiz button */
  @Output() quizClick = new EventEmitter<void>();

  /** Tracks which module indexes are expanded */
  expandedModules = new Set<string>();

  toggleModule(id: string): void {
    if (this.expandedModules.has(id)) this.expandedModules.delete(id);
    else this.expandedModules.add(id);
  }

  onSelect(topic: LwTopic): void {
    if (topic.status === 'locked') return;
    this.topicSelect.emit(topic);
  }

  statusIcon(s: LwTopic['status']): string {
    return s === 'completed' ? '✓' : s === 'active' ? '▶' : '🔒';
  }

  /** Total + completed counts for a flat topics array */
  moduleProgress(topics: LwTopic[]): { done: number; total: number } {
    return {
      done: topics.filter(t => t.status === 'completed').length,
      total: topics.length,
    };
  }
}
