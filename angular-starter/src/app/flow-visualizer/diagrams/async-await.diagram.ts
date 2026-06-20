import { FlowDiagram } from '../flow-visualizer.models';

/**
 * Async/Await execution flow diagram.
 * Demonstrates how JS suspends an async function at `await`,
 * frees the call stack, and resumes after the Promise resolves.
 */
export const ASYNC_AWAIT_DIAGRAM: FlowDiagram = {
  title: 'Async / Await Execution Flow',

  steps: [
    {
      id: 'start',
      label: 'Start Function',
      description:
        'fetchData() is invoked. The JS engine starts executing the async function body synchronously from the top.',
      codeLine: 0,
    },
    {
      id: 'log-start',
      label: 'Sync Code Runs',
      description:
        'console.log("Start") executes immediately. All synchronous statements run before any async suspension point is reached.',
      codeLine: 1,
    },
    {
      id: 'await-hit',
      label: 'Await Encountered',
      description:
        'The `await` keyword is hit. JS registers a microtask for the Promise result and prepares to suspend fetchData().',
      codeLine: 2,
    },
    {
      id: 'exec-paused',
      label: 'Execution Paused',
      description:
        'fetchData() is suspended and removed from the call stack. The event loop is now free to process other tasks or I/O events.',
      codeLine: 3,
    },
    {
      id: 'resolved',
      label: 'Promise Resolved',
      description:
        'fetch() resolves with a Response. The microtask queue picks up the continuation and schedules fetchData() to resume.',
      codeLine: 4,
    },
    {
      id: 'resume',
      label: 'Resume Execution',
      description:
        'fetchData() resumes from exactly where it paused. The resolved value is assigned to `data`. Remaining code now runs.',
      codeLine: 5,
    },
    {
      id: 'end',
      label: 'Function Ends',
      description:
        'console.log("End") executes. fetchData() finishes and implicitly returns a resolved Promise<void> to its caller.',
      codeLine: 6,
    },
  ],

  edges: [
    { source: 'start',       target: 'log-start'   },
    { source: 'log-start',   target: 'await-hit'   },
    { source: 'await-hit',   target: 'exec-paused' },
    { source: 'exec-paused', target: 'resolved'    },
    { source: 'resolved',    target: 'resume'      },
    { source: 'resume',      target: 'end'         },
  ],

  code: [
    'async function fetchData() {',
    '  console.log("Start");',
    '  const data = await fetch("/api/data");',
    '  // ⏳  Promise is pending — execution suspended',
    '  // ✅  Promise resolved — microtask scheduled',
    '  console.log("End:", data);',
    '}',
  ],

  codeLanguage: 'TypeScript',
};
