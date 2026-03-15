import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LwWorkspaceComponent }     from './lw-workspace/lw-workspace.component';
import { LwSidebarComponent }       from './lw-sidebar/lw-sidebar.component';
import { LwLessonContentComponent } from './lw-lesson-content/lw-lesson-content.component';
import { LwLessonCardComponent }    from './lw-lesson-card/lw-lesson-card.component';
import { LwMentorPanelComponent }   from './lw-mentor-panel/lw-mentor-panel.component';
import { LwPlaygroundComponent }    from './lw-playground/lw-playground.component';
import { MarkdownPipe }             from '../markdown.pipe';

const LW_COMPONENTS = [
  LwWorkspaceComponent,
  LwSidebarComponent,
  LwLessonContentComponent,
  LwLessonCardComponent,
  LwMentorPanelComponent,
  LwPlaygroundComponent,
];

@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [...LW_COMPONENTS, MarkdownPipe],
  exports:      [...LW_COMPONENTS, MarkdownPipe],
})
export class LearningWorkspaceModule {}
