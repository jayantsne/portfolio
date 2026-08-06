import { AdminPrepImportQuestion } from '../admin-interview-prep/admin-interview-prep.service';

const EXISTING_DOTNET_CORE_QUESTION_PACK: AdminPrepImportQuestion[] = [
  { category: '.NET Core', question: 'What is .NET Core, and how is it different from the .NET Framework?', difficulty: 'Easy', tags: ['dotnet-core', 'fundamentals'], answerHint: '.NET Core is cross-platform, open source, modular, and designed for side-by-side deployment. The .NET Framework is Windows-focused and mainly maintained for existing applications.' },
  { category: '.NET Core', question: 'Explain the role of the CLR in .NET applications.', difficulty: 'Easy', tags: ['clr', 'runtime'], answerHint: 'The CLR executes managed code and provides JIT compilation, garbage collection, exception handling, type safety, and threading services.' },
  { category: '.NET Core', question: 'What is managed code and unmanaged code?', difficulty: 'Easy', tags: ['clr', 'memory'], answerHint: 'Managed code runs under the CLR and receives runtime services. Unmanaged code runs directly as native machine code outside CLR management.' },
  { category: '.NET Core', question: 'How does dependency injection work in ASP.NET Core?', difficulty: 'Medium', tags: ['dependency-injection', 'services'], answerHint: 'Services are registered in IServiceCollection and resolved from IServiceProvider. Prefer constructor injection and select an appropriate transient, scoped, or singleton lifetime.' },
  { category: '.NET Core', question: 'Explain transient, scoped, and singleton service lifetimes.', difficulty: 'Medium', tags: ['dependency-injection', 'lifetimes'], answerHint: 'Transient creates an instance per resolution, scoped creates one per request or scope, and singleton creates one for the application lifetime.' },
  { category: '.NET Core', question: 'What is middleware in ASP.NET Core?', difficulty: 'Easy', tags: ['middleware', 'request-pipeline'], answerHint: 'Middleware is a component in the HTTP pipeline that can inspect, modify, handle, or pass a request to the next component.' },
  { category: '.NET Core', question: 'Why does middleware order matter?', difficulty: 'Medium', tags: ['middleware', 'request-pipeline'], answerHint: 'Requests flow through middleware in registration order and responses return in reverse order. Incorrect ordering can bypass authentication, authorization, routing, or exception handling.' },
  { category: '.NET Core', question: 'What is the difference between Use, Run, and Map middleware?', difficulty: 'Medium', tags: ['middleware', 'pipeline'], answerHint: 'Use can call the next middleware, Run terminates the pipeline, and Map branches the pipeline based on the request path.' },
  { category: '.NET Core', question: 'How does configuration work in ASP.NET Core?', difficulty: 'Medium', tags: ['configuration', 'appsettings'], answerHint: 'Configuration combines providers such as appsettings files, environment variables, command-line arguments, user secrets, and external stores; later providers override earlier values.' },
  { category: '.NET Core', question: 'Explain the Options pattern and IOptions, IOptionsSnapshot, and IOptionsMonitor.', difficulty: 'Hard', tags: ['configuration', 'options-pattern'], answerHint: 'The Options pattern binds configuration to typed classes. IOptions is singleton-style, IOptionsSnapshot refreshes per scope, and IOptionsMonitor supports change notifications and current values.' },
  { category: '.NET Core', question: 'How do environments work in ASP.NET Core?', difficulty: 'Easy', tags: ['environments', 'configuration'], answerHint: 'DOTNET_ENVIRONMENT or ASPNETCORE_ENVIRONMENT selects an environment such as Development, Staging, or Production and can load environment-specific configuration.' },
  { category: '.NET Core', question: 'How do you implement global exception handling in ASP.NET Core?', difficulty: 'Medium', tags: ['exceptions', 'middleware'], answerHint: 'Use the built-in exception handler or custom exception-handling middleware, log the exception, and return a consistent ProblemDetails response without exposing sensitive data.' },
  { category: '.NET Core', question: 'How does logging work in ASP.NET Core?', difficulty: 'Medium', tags: ['logging', 'observability'], answerHint: 'Inject ILogger<T>, use structured message templates and levels, and configure providers and filters through configuration.' },
  { category: '.NET Core', question: 'What are hosted services and BackgroundService?', difficulty: 'Medium', tags: ['hosted-services', 'background-jobs'], answerHint: 'IHostedService runs work with the application lifecycle. BackgroundService provides ExecuteAsync for long-running work and must honor cancellation and create scopes for scoped dependencies.' },
  { category: '.NET Core', question: 'What is the Generic Host in .NET?', difficulty: 'Medium', tags: ['hosting', 'generic-host'], answerHint: 'The Generic Host centralizes dependency injection, configuration, logging, application lifetime, and hosted-service management for web and non-web applications.' },
  { category: '.NET Core', question: 'What is Kestrel?', difficulty: 'Easy', tags: ['kestrel', 'hosting'], answerHint: 'Kestrel is the cross-platform web server used by ASP.NET Core. In production it can run directly or behind a reverse proxy.' },
  { category: '.NET Core', question: 'What is the difference between framework-dependent and self-contained deployment?', difficulty: 'Medium', tags: ['deployment', 'runtime'], answerHint: 'Framework-dependent deployment requires a compatible installed runtime and is smaller. Self-contained deployment includes the runtime and is larger but independent of machine installation.' },
  { category: '.NET Core', question: 'What are global tools and local tools in the .NET CLI?', difficulty: 'Easy', tags: ['dotnet-cli', 'tools'], answerHint: 'Global tools are available for a user or machine. Local tools are recorded in a tool manifest, making versions reproducible for a repository.' },
  { category: '.NET Core', question: 'How does garbage collection work in .NET?', difficulty: 'Hard', tags: ['garbage-collection', 'memory'], answerHint: 'The generational GC automatically reclaims unreachable managed objects. Generations 0, 1, and 2 optimize collection frequency; IDisposable is still required for deterministic cleanup of unmanaged resources.' },
  { category: '.NET Core', question: 'What is the difference between IDisposable and a finalizer?', difficulty: 'Medium', tags: ['idisposable', 'memory'], answerHint: 'IDisposable provides deterministic cleanup through Dispose or using. A finalizer is a nondeterministic fallback for directly owned unmanaged resources and adds GC cost.' },
  { category: '.NET Core', question: 'How should async and await be used in ASP.NET Core?', difficulty: 'Medium', tags: ['async-await', 'performance'], answerHint: 'Use async APIs for I/O, await the task, propagate cancellation, avoid blocking with Result or Wait, and avoid unnecessary Task.Run for request work.' },
  { category: '.NET Core', question: 'What is IHttpClientFactory and why should you use it?', difficulty: 'Medium', tags: ['httpclientfactory', 'resilience'], answerHint: 'IHttpClientFactory centralizes client configuration, manages handler lifetimes to avoid socket exhaustion, and supports named, typed, generated, and resilient clients.' },
  { category: '.NET Core', question: 'How do model binding and validation work in ASP.NET Core?', difficulty: 'Medium', tags: ['model-binding', 'validation'], answerHint: 'Model binding maps route, query, form, header, and body values to parameters or models. Validation applies configured rules or attributes and API controllers can automatically return validation errors.' },
  { category: '.NET Core', question: 'What are Minimal APIs, and when would you use them?', difficulty: 'Medium', tags: ['minimal-api', 'web-api'], answerHint: 'Minimal APIs define HTTP endpoints with a lightweight routing syntax. They suit small services and focused APIs while still supporting DI, filters, validation, and OpenAPI.' },
  { category: '.NET Core', question: 'How do you improve the performance of an ASP.NET Core application?', difficulty: 'Hard', tags: ['performance', 'scalability'], answerHint: 'Measure first, use async I/O, cache suitable data, paginate queries, reduce allocations and serialization, optimize database access, enable compression, and monitor production metrics.' }
];

interface QuestionSection {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  questions: string[];
}

const ATTACHED_QUESTION_SECTIONS: QuestionSection[] = [
  {
    difficulty: 'Easy',
    tags: ['dotnet-core', 'fundamentals'],
    questions: [
      'What is .NET Core, and how is it different from the .NET Framework?',
      'What are the main advantages of .NET Core?',
      'What is the difference between .NET Core, .NET 5, .NET 6, .NET 8, and later versions?',
      'What is the Common Language Runtime, or CLR?',
      'What is managed code and unmanaged code?',
      'What is the difference between CTS and CLS?',
      'What is Just-In-Time compilation?',
      'What is Ahead-of-Time compilation?',
      'What is the difference between framework-dependent and self-contained deployment?',
      'What is the difference between SDK and runtime?',
      'What happens internally when a .NET application starts?',
      'What is the purpose of the Program.cs file?',
      'What is the Generic Host in .NET?',
      'What is Kestrel?',
      'Can an ASP.NET Core application run without IIS?'
    ]
  },
  {
    difficulty: 'Medium',
    tags: ['aspnet-core', 'request-pipeline', 'middleware'],
    questions: [
      'Explain the ASP.NET Core request lifecycle.',
      'What is middleware?',
      'How do you create custom middleware?',
      'What is the difference between Use, Run, and Map?',
      'Why is middleware registration order important?',
      'What is terminal middleware?',
      'What is the difference between middleware and MVC filters?',
      'What is endpoint routing?',
      'What is the difference between UseRouting() and MapControllers()?',
      'How do you handle exceptions globally in ASP.NET Core?',
      'What is UseExceptionHandler()?',
      'What is ProblemDetails?',
      'How do you add correlation IDs to requests?',
      'How do you log request and response information?',
      'How do you prevent sensitive data from being written to logs?'
    ]
  },
  {
    difficulty: 'Medium',
    tags: ['dependency-injection', 'ioc', 'service-lifetimes'],
    questions: [
      'What is dependency injection?',
      'What is inversion of control?',
      'Explain Singleton, Scoped, and Transient lifetimes.',
      'What happens when a Scoped service is injected into a Singleton service?',
      'What is a captive dependency?',
      'How do you resolve Scoped services inside a background service?',
      'What is IServiceProvider?',
      'What is IServiceScopeFactory?',
      'What is constructor injection?',
      'When would you use method injection?',
      'What is the service locator anti-pattern?',
      'How do you register multiple implementations of the same interface?',
      'What are keyed services?',
      'How do you register generic services?',
      'How would you replace the built-in dependency injection container?'
    ]
  },
  {
    difficulty: 'Medium',
    tags: ['configuration', 'options-pattern', 'secrets'],
    questions: [
      'How does configuration work in ASP.NET Core?',
      'What is the order of configuration providers?',
      'What is the difference between appsettings.json and appsettings.Environment.json?',
      'What are user secrets?',
      'Why should secrets not be stored in appsettings.json?',
      'What is the Options pattern?',
      'What is the difference between IOptions, IOptionsSnapshot, and IOptionsMonitor?',
      'How do you validate configuration at application startup?',
      'How do you reload configuration without restarting the application?',
      'How do you manage configuration in production?'
    ]
  },
  {
    difficulty: 'Medium',
    tags: ['web-api', 'controllers', 'model-binding'],
    questions: [
      'What is the difference between Controller and ControllerBase?',
      'What is the difference between IActionResult and ActionResult<T>?',
      'What is model binding?',
      'What is model validation?',
      'What does the [ApiController] attribute provide?',
      'What is the difference between route parameters, query parameters, and request-body parameters?',
      'What is the difference between PUT and PATCH?',
      'What is JSON Patch?',
      'How do you return consistent API responses?',
      'How do you version an ASP.NET Core Web API?',
      'What is content negotiation?',
      'How do you customize JSON serialization?',
      'What are Minimal APIs?',
      'When would you choose controllers instead of Minimal APIs?',
      'How do you implement custom model validation?'
    ]
  },
  {
    difficulty: 'Medium',
    tags: ['ef-core', 'database', 'data-access'],
    questions: [
      'What is Entity Framework Core?',
      'What is the difference between code-first and database-first approaches?',
      'What is DbContext?',
      'Why is DbContext normally registered as Scoped?',
      'What is change tracking?',
      'What is the difference between tracking and AsNoTracking()?',
      'What happens internally when SaveChanges() is called?',
      'Does SaveChanges() create a transaction?',
      'What is the difference between eager, lazy, and explicit loading?',
      'What is the N+1 query problem?',
      'What is the difference between IEnumerable and IQueryable?',
      'What is the difference between First, FirstOrDefault, Single, and SingleOrDefault?',
      'What are EF Core migrations?',
      'How do you handle concurrency in EF Core?',
      'What is a concurrency token?',
      'What is optimistic concurrency?',
      'What is the difference between Add, Attach, and Update?',
      'What are compiled queries?',
      'When would you use Dapper instead of EF Core?',
      'How do you investigate a slow EF Core query?'
    ]
  },
  {
    difficulty: 'Hard',
    tags: ['async-await', 'performance', 'security', 'architecture'],
    questions: [
      'How does async/await work internally?',
      'What is the difference between a Task and a Thread?',
      'What is the Thread Pool?',
      'What is the difference between Task.Delay() and Thread.Sleep()?',
      'What can cause an async deadlock?',
      'What is authentication versus authorization?',
      'How does JWT authentication work?',
      'What is the difference between OAuth 2.0 and OpenID Connect?',
      'How do you improve the performance of an ASP.NET Core application?',
      'How would you design a scalable and maintainable .NET Core application?'
    ]
  }
];

const ATTACHED_SCENARIO_QUESTIONS: AdminPrepImportQuestion[] = [
  {
    category: '.NET Core', difficulty: 'Hard', tags: ['scenario', 'performance', 'production'],
    question: 'Your ASP.NET Core API performs well locally but is slow in production. How would you investigate it?',
    answerHint: 'Check CPU, memory, disk, network, APM traces, slow endpoints, database execution time, N+1 queries, external dependencies, thread-pool starvation, logging, serialization, connection-pool exhaustion, caching, and load-test results.'
  },
  {
    category: '.NET Core', difficulty: 'Hard', tags: ['scenario', 'latency', 'troubleshooting'],
    question: 'An API normally responds in 200 milliseconds, but now takes five seconds. What would you check first?',
    answerHint: 'Check recent deployments, query-plan changes, external-service latency, resource utilization, logs and traces, traffic growth, database blocking, thread-pool starvation, and garbage-collection pressure.'
  },
  {
    category: '.NET Core', difficulty: 'Hard', tags: ['scenario', 'cpu', 'profiling'],
    question: 'Your .NET application is using 95% CPU. How would you troubleshoot it?',
    answerHint: 'Capture a CPU profile and inspect hot methods, infinite loops, expensive LINQ, serialization, repeated regular expressions, busy waiting, garbage collection, and background jobs.'
  },
  {
    category: '.NET Core', difficulty: 'Hard', tags: ['scenario', 'memory', 'diagnostics'],
    question: "The application's memory keeps increasing and never returns to normal. What might be happening?",
    answerHint: 'Investigate static collections, singleton-held request data, event subscriptions, undisposed resources, unbounded caches, HttpClient misuse, large-object-heap pressure, and background tasks retaining references.'
  },
  {
    category: '.NET Core', difficulty: 'Hard', tags: ['scenario', 'thread-pool', 'async'],
    question: 'Requests are queued even though CPU usage is low. What could cause thread-pool starvation?',
    answerHint: 'Look for .Result or .Wait(), blocking or synchronous I/O, Thread.Sleep in requests, blocking database calls, synchronous external calls, and excessive thread creation.'
  },
  {
    category: '.NET Core', difficulty: 'Hard', tags: ['scenario', 'dependency-injection', 'lifetimes'],
    question: 'A Singleton service depends on DbContext. What is wrong with this design?',
    answerHint: 'DbContext is scoped while the singleton lives for the application lifetime. Capturing it can cause cross-request concurrency and disposed-object failures. Redesign the lifetime or create a scope with IServiceScopeFactory.'
  }
];

const ATTACHED_DOTNET_CORE_QUESTIONS = ATTACHED_QUESTION_SECTIONS.reduce<AdminPrepImportQuestion[]>(
  (all, section) => all.concat(section.questions.map(question => ({
    category: '.NET Core',
    question,
    difficulty: section.difficulty,
    tags: section.tags
  }))),
  []
);

/**
 * Complete .NET Core import pack. Existing answer-rich entries are retained,
 * every question supplied in the attached list is added, and exact repeats
 * inside the pack are removed case-insensitively.
 */
export const DOTNET_CORE_QUESTION_PACK: AdminPrepImportQuestion[] = [
  ...EXISTING_DOTNET_CORE_QUESTION_PACK,
  ...ATTACHED_DOTNET_CORE_QUESTIONS,
  ...ATTACHED_SCENARIO_QUESTIONS
].filter((item, index, all) =>
  all.findIndex(candidate => candidate.question.trim().toLowerCase() === item.question.trim().toLowerCase()) === index
);
