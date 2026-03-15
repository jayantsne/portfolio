import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { LwConfig } from '../learning-workspace.models';

@Component({
  selector: 'app-lw-workspace',
  templateUrl: './lw-workspace.component.html',
  styleUrls: ['./lw-workspace.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LwWorkspaceComponent {
  @Input() config: LwConfig = {};
  @Input() heightFill = true;
}
