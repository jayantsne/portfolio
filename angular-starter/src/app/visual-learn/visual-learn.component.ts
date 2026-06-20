import { Component } from '@angular/core';
import { FlowDiagram } from '../flow-visualizer/flow-visualizer.models';
import { ASYNC_AWAIT_DIAGRAM }    from '../flow-visualizer/diagrams/async-await.diagram';
import { PROMISE_CHAIN_DIAGRAM }  from '../flow-visualizer/diagrams/promise-chain.diagram';
import { EVENT_LOOP_DIAGRAM }     from '../flow-visualizer/diagrams/event-loop.diagram';
import { CLOSURES_DIAGRAM }       from '../flow-visualizer/diagrams/closures.diagram';

interface DiagramOption {
  id: string;
  label: string;
  diagram: FlowDiagram;
}

@Component({
  selector: 'app-visual-learn',
  templateUrl: './visual-learn.component.html',
  styleUrls: ['./visual-learn.component.css'],
})
export class VisualLearnComponent {
  readonly diagrams: DiagramOption[] = [
    { id: 'async-await',    label: 'Async / Await',   diagram: ASYNC_AWAIT_DIAGRAM   },
    { id: 'promise-chain',  label: 'Promise Chain',   diagram: PROMISE_CHAIN_DIAGRAM },
    { id: 'event-loop',     label: 'Event Loop',      diagram: EVENT_LOOP_DIAGRAM    },
    { id: 'closures',       label: 'Closures',        diagram: CLOSURES_DIAGRAM      },
  ];

  activeDiagramId = this.diagrams[0].id;

  get activeDiagram(): FlowDiagram {
    return this.diagrams.find(d => d.id === this.activeDiagramId)!.diagram;
  }

  selectDiagram(id: string): void {
    this.activeDiagramId = id;
  }
}
