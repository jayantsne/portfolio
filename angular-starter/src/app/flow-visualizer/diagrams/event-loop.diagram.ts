import { FlowDiagram } from '../flow-visualizer.models';

/**
 * JavaScript Event Loop diagram.
 * Demonstrates the classic tick: sync code → microtask queue → task queue.
 * Output order: "1 – sync", "4 – sync end", "2 – microtask", "3 – setTimeout".
 */
export const EVENT_LOOP_DIAGRAM: FlowDiagram = {
  title: 'JavaScript Event Loop',

  steps: [
    {
      id: 'sync-start',
      label: 'Sync Code Begins',
      description:
        'The script starts. console.log("1") runs immediately on the call stack. Synchronous code always executes first, top to bottom.',
      codeLine: 0,
    },
    {
      id: 'settimeout-reg',
      label: 'setTimeout Queued',
      description:
        'setTimeout(cb, 0) is handed off to the browser\'s Web API timer. The callback is NOT placed on the call stack yet — it waits in the Web API layer.',
      codeLine: 1,
    },
    {
      id: 'promise-queued',
      label: 'Microtask Queued',
      description:
        'Promise.resolve().then(cb) schedules the callback into the microtask queue — a high-priority queue separate from the task (macrotask) queue.',
      codeLine: 4,
    },
    {
      id: 'sync-end',
      label: 'Sync Code Ends',
      description:
        'console.log("4") runs — the last synchronous statement. The call stack is now empty. The event loop can check queues.',
      codeLine: 7,
    },
    {
      id: 'drain-micro',
      label: 'Microtasks Drain',
      description:
        'Before touching the task queue, the event loop drains ALL pending microtasks. The Promise callback runs, logging "2 – microtask".',
      codeLine: 5,
    },
    {
      id: 'macro-task',
      label: 'Macrotask Runs',
      description:
        'The event loop picks one task from the task queue — the setTimeout callback — and runs it. It logs "3 – setTimeout".',
      codeLine: 2,
    },
    {
      id: 'loop-again',
      label: 'Loop Continues',
      description:
        'The cycle repeats indefinitely: run all sync code → drain all microtasks → execute one macrotask → drain microtasks again → repeat.',
      codeLine: 8,
    },
  ],

  edges: [
    { source: 'sync-start',    target: 'settimeout-reg' },
    { source: 'settimeout-reg',target: 'promise-queued'  },
    { source: 'promise-queued',target: 'sync-end'        },
    { source: 'sync-end',      target: 'drain-micro'     },
    { source: 'drain-micro',   target: 'macro-task'      },
    { source: 'macro-task',    target: 'loop-again'      },
  ],

  code: [
    'console.log("1 – sync");',
    'setTimeout(() => {',
    '  console.log("3 – setTimeout");',
    '}, 0);',
    'Promise.resolve().then(() => {',
    '  console.log("2 – microtask");',
    '});',
    'console.log("4 – sync end");',
    '// Output: 1, 4, 2, 3',
  ],

  codeLanguage: 'JavaScript',
};
