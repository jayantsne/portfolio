import { FlowDiagram } from '../flow-visualizer.models';

/**
 * JavaScript Closures diagram.
 * Shows how a function retains a reference to its outer scope's variables
 * even after the outer function has returned.
 */
export const CLOSURES_DIAGRAM: FlowDiagram = {
  title: 'JavaScript Closures',

  steps: [
    {
      id: 'outer-called',
      label: 'Outer Fn Called',
      description:
        'makeCounter() is invoked. A new execution context is created on the call stack, and a local variable `count = 0` is allocated in that scope.',
      codeLine: 0,
    },
    {
      id: 'inner-defined',
      label: 'Inner Fn Defined',
      description:
        'The inner function `increment` is defined. It captures a reference to the surrounding scope — including `count`. This is the closure.',
      codeLine: 2,
    },
    {
      id: 'outer-returns',
      label: 'Outer Fn Returns',
      description:
        'makeCounter() returns `increment` and exits. Its execution context is popped off the call stack, but `count` is NOT garbage-collected.',
      codeLine: 6,
    },
    {
      id: 'scope-kept',
      label: 'Scope Preserved',
      description:
        '`count` lives on in the heap because `increment` still holds a reference to the outer scope. The garbage collector cannot collect it.',
      codeLine: 6,
    },
    {
      id: 'first-call',
      label: 'First Call',
      description:
        'counter() is called. `increment` runs, increments `count` from 0 → 1, and returns 1. The same `count` variable is mutated.',
      codeLine: 9,
    },
    {
      id: 'second-call',
      label: 'Second Call',
      description:
        'counter() is called again. `count` persists from the first call — it is now incremented from 1 → 2. Each call shares the same closure.',
      codeLine: 10,
    },
    {
      id: 'independent',
      label: 'Independent Closures',
      description:
        'counter2 = makeCounter() creates a brand-new closure with its own `count = 0`. The two counters are completely isolated from each other.',
      codeLine: 12,
    },
  ],

  edges: [
    { source: 'outer-called', target: 'inner-defined' },
    { source: 'inner-defined',target: 'outer-returns' },
    { source: 'outer-returns',target: 'scope-kept'    },
    { source: 'scope-kept',   target: 'first-call'    },
    { source: 'first-call',   target: 'second-call'   },
    { source: 'second-call',  target: 'independent'   },
  ],

  code: [
    'function makeCounter() {',
    '  let count = 0;',
    '  function increment() {',
    '    count++;',
    '    return count;',
    '  }',
    '  return increment;  // closure',
    '}',
    '',
    'const counter = makeCounter();',
    'counter();   // → 1',
    'counter();   // → 2',
    '',
    'const counter2 = makeCounter();',
    'counter2();  // → 1 (own scope)',
  ],

  codeLanguage: 'JavaScript',
};
