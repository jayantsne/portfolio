import { FlowDiagram } from '../flow-visualizer.models';

/**
 * Promise Chain execution flow diagram.
 * Shows how .then() handlers chain together, and how .catch()
 * intercepts errors anywhere in the chain.
 */
export const PROMISE_CHAIN_DIAGRAM: FlowDiagram = {
  title: 'Promise Chain Execution',

  steps: [
    {
      id: 'fetch-call',
      label: 'fetch() Called',
      description:
        'fetch("/api/data") is called. It returns a pending Promise immediately — no network data has arrived yet. Execution continues synchronously.',
      codeLine: 0,
    },
    {
      id: 'handlers-reg',
      label: 'Handlers Registered',
      description:
        'All .then() and .catch() handlers are attached synchronously. None of them run yet — they are callbacks waiting for the Promise to settle.',
      codeLine: 1,
    },
    {
      id: 'network-wait',
      label: 'Network I/O Wait',
      description:
        'The HTTP request is in-flight. The call stack is free to do other work. The Promise stays pending until a response arrives.',
      codeLine: 2,
    },
    {
      id: 'response',
      label: 'Response Arrives',
      description:
        'The server responds. The Promise returned by fetch() resolves with a Response object. The microtask queue is updated.',
      codeLine: 3,
    },
    {
      id: 'then1-run',
      label: 'First .then() Runs',
      description:
        'res.json() is called. It returns a new Promise for the parsed body. The chain waits for JSON parsing before advancing.',
      codeLine: 4,
    },
    {
      id: 'then2-run',
      label: 'Second .then() Runs',
      description:
        'The parsed JSON is now available as `data`. This handler processes it. Its return value becomes the resolved value of the next link.',
      codeLine: 5,
    },
    {
      id: 'catch-standby',
      label: '.catch() On Guard',
      description:
        'If any step above threw or rejected, .catch() intercepts the error here. On the happy path it is skipped, but it protects the whole chain.',
      codeLine: 6,
    },
  ],

  edges: [
    { source: 'fetch-call',   target: 'handlers-reg' },
    { source: 'handlers-reg', target: 'network-wait'  },
    { source: 'network-wait', target: 'response'      },
    { source: 'response',     target: 'then1-run'     },
    { source: 'then1-run',    target: 'then2-run'     },
    { source: 'then2-run',    target: 'catch-standby' },
  ],

  code: [
    'fetch("/api/data")',
    '  .then(res => res.json())',
    '  // ⏳  waiting for network...',
    '  // ✅  Response received',
    '  .then(data => {',
    '    console.log("Got:", data);',
    '  })',
    '  .catch(err => console.error(err));',
  ],

  codeLanguage: 'JavaScript',
};
