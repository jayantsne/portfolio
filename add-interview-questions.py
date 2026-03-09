import paramiko
import json

hostname = '76.13.244.113'
username = 'root'
password = '1ZC7Lts7,saeb)Y0H4@n'
port = 22

MONGO_URI = '"mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@localhost:27017/jayant-portfolio?authSource=admin"'

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    if out.strip(): print(out.strip())
    if err.strip() and code != 0: print(f"ERR: {err.strip()}")
    return code, out

new_questions = [
  # ─── Angular ───────────────────────────────────────────────────
  { "question": "What are Angular lifecycle hooks and when are they called?",
    "answer": "Angular lifecycle hooks let you tap into key moments of a component/directive:\n- **ngOnChanges** – called before ngOnInit when bound inputs change\n- **ngOnInit** – once, after first ngOnChanges; ideal for data fetching\n- **ngDoCheck** – every change-detection run\n- **ngAfterContentInit / ngAfterContentChecked** – after `<ng-content>` is projected\n- **ngAfterViewInit / ngAfterViewChecked** – after the component's view (and children) is initialised\n- **ngOnDestroy** – before Angular destroys the component; use it to unsubscribe\n\n**Best practice:** put HTTP calls in `ngOnInit`, teardown logic (unsubscribe, clear timers) in `ngOnDestroy`.",
    "category": "Angular", "difficulty": "Medium", "tags": ["lifecycle", "hooks", "components"] },

  { "question": "What is the difference between ngOnInit and the constructor in Angular?",
    "answer": "**Constructor** is a TypeScript/native class feature. Angular uses it only for dependency injection; Angular hasn't finished building the component yet, so `@Input()` values are not available.\n\n**ngOnInit** is called by Angular after it has set all data-bound input properties. This is the correct place to run initialisation logic that needs inputs or services.\n\n```typescript\nconstructor(private http: HttpClient) {} // DI only\n\nngOnInit(): void {\n  this.data = this.inputValue; // @Input() is ready here\n  this.loadData();\n}\n```",
    "category": "Angular", "difficulty": "Easy", "tags": ["lifecycle", "constructor", "oninit"] },

  { "question": "Explain Angular's Change Detection strategy and OnPush.",
    "answer": "By default Angular uses **CheckAlways**: it traverses every component tree on every event, timer, or HTTP response.\n\n**OnPush** (`ChangeDetectionStrategy.OnPush`) tells Angular to only check a component when:\n1. A bound `@Input()` reference changes.\n2. An event originates from the component or its children.\n3. An `async` pipe receives a new value.\n4. `ChangeDetectorRef.markForCheck()` is called manually.\n\n```typescript\n@Component({\n  selector: 'app-card',\n  changeDetection: ChangeDetectionStrategy.OnPush,\n  template: `...`\n})\nexport class CardComponent {}\n```\nOnPush gives significant performance gains in large applications.",
    "category": "Angular", "difficulty": "Hard", "tags": ["change-detection", "onpush", "performance"] },

  { "question": "What is RxJS and how do Observables differ from Promises?",
    "answer": "RxJS is a library for reactive programming using **Observables** — streams of zero or more values over time.\n\n| | Promise | Observable |\n|---|---|---|\n| Values | Single | Multiple |\n| Lazy | No (executes immediately) | Yes (only on subscribe) |\n| Cancellable | No | Yes (unsubscribe) |\n| Operators | Limited (.then/.catch) | Huge library (map, filter, switchMap…) |\n\n```typescript\n// Observable\nthis.http.get('/api/data').pipe(\n  map(res => res.data),\n  catchError(err => of([]))\n).subscribe(data => this.items = data);\n```\nAngular's HttpClient returns Observables, enabling powerful composition with operators like `switchMap`, `debounceTime`, and `takeUntil`.",
    "category": "Angular", "difficulty": "Medium", "tags": ["rxjs", "observable", "promise"] },

  { "question": "What is lazy loading in Angular and how do you set it up?",
    "answer": "Lazy loading defers loading of a feature module until the route is first visited, reducing the initial bundle size.\n\n**app-routing.module.ts:**\n```typescript\nconst routes: Routes = [\n  {\n    path: 'admin',\n    loadChildren: () =>\n      import('./admin/admin.module').then(m => m.AdminModule)\n  }\n];\n```\nThe feature module has its own `RouterModule.forChild(routes)`.\n\n**Benefits:**\n- Smaller initial payload → faster first paint\n- Users who never visit a route never download its code\n\nUse **preloading strategies** (`PreloadAllModules`) to load lazy modules in the background after the app has started.",
    "category": "Angular", "difficulty": "Medium", "tags": ["lazy-loading", "routing", "modules"] },

  { "question": "What are Angular Directives? Explain structural vs attribute directives.",
    "answer": "Directives add behaviour to DOM elements.\n\n**Structural directives** change the DOM layout by adding/removing elements. They use `*` syntax:\n- `*ngIf` – conditionally renders an element\n- `*ngFor` – repeats an element for each item\n- `*ngSwitch` – switch-case rendering\n\n**Attribute directives** change the appearance or behaviour of an existing element:\n- `ngClass` – conditionally adds CSS classes\n- `ngStyle` – applies inline styles\n- Custom: `@Directive({ selector: '[highlight]' })`\n\n```typescript\n@Directive({ selector: '[appHighlight]' })\nexport class HighlightDirective {\n  @HostListener('mouseenter') onEnter() {\n    this.el.nativeElement.style.backgroundColor = 'yellow';\n  }\n  constructor(private el: ElementRef) {}\n}\n```",
    "category": "Angular", "difficulty": "Medium", "tags": ["directives", "structural", "attribute"] },

  { "question": "What is Angular's Dependency Injection (DI) system?",
    "answer": "Angular's DI system provides dependencies (services, values) to components and services automatically.\n\n**How it works:**\n1. Declare the service with `@Injectable({ providedIn: 'root' })` (singleton app-wide) or register in a module/component `providers[]`.\n2. Inject via the constructor: Angular's injector resolves the instance.\n\n```typescript\n@Injectable({ providedIn: 'root' })\nexport class DataService {\n  getData() { return this.http.get('/api'); }\n  constructor(private http: HttpClient) {}\n}\n\n@Component({ ... })\nexport class MyComponent {\n  constructor(private data: DataService) {}\n}\n```\n\n**Injection hierarchies:** root → module → component. A component-level provider creates a new instance scoped to that component subtree.",
    "category": "Angular", "difficulty": "Medium", "tags": ["dependency-injection", "services", "providers"] },

  { "question": "What is the difference between Subject, BehaviorSubject, and ReplaySubject in RxJS?",
    "answer": "All three are Observables **and** Observers (you can both subscribe and emit):\n\n| | Subject | BehaviorSubject | ReplaySubject |\n|---|---|---|---|\n| Initial value | ❌ required? No | ✅ must provide | ❌ |\n| Late subscriber gets | Nothing past | **Last emitted** value | **N past** values |\n| Common use | Events/bus | Current state | Cache last N |\n\n```typescript\nconst bs = new BehaviorSubject<number>(0);\nbs.next(1);\nbs.subscribe(v => console.log(v)); // immediately prints 1\n\nconst rs = new ReplaySubject<number>(3); // last 3 values\nrs.next(1); rs.next(2); rs.next(3); rs.next(4);\nrs.subscribe(v => console.log(v)); // prints 2, 3, 4\n```\n\n**BehaviorSubject** is ideal for storing and sharing state (e.g. current user, theme).",
    "category": "Angular", "difficulty": "Hard", "tags": ["rxjs", "subject", "behaviorsubject", "state"] },

  { "question": "What are Angular Pipes? How do you create a custom pipe?",
    "answer": "Pipes transform values in templates without modifying the original data.\n\n**Built-in:** `date`, `currency`, `uppercase`, `json`, `async`, `percent`\n\n```html\n{{ price | currency:'GBP' }}\n{{ user$ | async }}\n```\n\n**Custom pipe:**\n```typescript\n@Pipe({ name: 'truncate' })\nexport class TruncatePipe implements PipeTransform {\n  transform(value: string, limit = 50): string {\n    return value.length > limit ? value.slice(0, limit) + '…' : value;\n  }\n}\n```\n```html\n{{ longText | truncate:100 }}\n```\n\n**Pure vs impure:** Pure pipes (default) only re-run when input reference changes. Mark `pure: false` if you need to re-run on every CD cycle (expensive!).",
    "category": "Angular", "difficulty": "Easy", "tags": ["pipes", "template", "transform"] },

  { "question": "How does Angular Forms work — Template-driven vs Reactive Forms?",
    "answer": "**Template-Driven Forms** — declare logic in the template using `ngModel`. Simple forms, less boilerplate:\n```html\n<input [(ngModel)]=\"name\" name=\"name\" required />\n```\n\n**Reactive Forms** — define the form model in TypeScript; more control, easier to test:\n```typescript\nthis.form = this.fb.group({\n  email: ['', [Validators.required, Validators.email]],\n  password: ['', [Validators.minLength(8)]]\n});\n```\n```html\n<input [formControl]=\"form.get('email')\" />\n<div *ngIf=\"form.get('email').invalid\">Invalid email</div>\n```\n\n**When to use which:**\n- Template-driven → simple login/contact forms\n- Reactive → complex validation, dynamic fields, unit tests",
    "category": "Angular", "difficulty": "Medium", "tags": ["forms", "reactive", "template-driven"] },

  # ─── .NET Core ─────────────────────────────────────────────────
  { "question": "What is middleware in ASP.NET Core and how does the pipeline work?",
    "answer": "Middleware is software assembled into a pipeline to handle requests and responses. Each component can process the request, call the next middleware, and process the response on the way back.\n\n```csharp\napp.Use(async (context, next) => {\n    // before\n    await next.Invoke();\n    // after\n});\n\napp.UseAuthentication();\napp.UseAuthorization();\napp.MapControllers();\n```\n\n**Order matters** — authentication must come before authorisation, which must come before endpoint mapping.\n\nBuilt-in middleware: `UseStaticFiles`, `UseRouting`, `UseCors`, `UseExceptionHandler`. Custom middleware is ideal for logging, rate-limiting, and request tracing.",
    "category": ".NET Core", "difficulty": "Medium", "tags": ["middleware", "pipeline", "aspnetcore"] },

  { "question": "Explain async/await in C# and when to use ConfigureAwait(false).",
    "answer": "**async/await** allows non-blocking I/O without explicit threads:\n```csharp\npublic async Task<User> GetUserAsync(int id)\n{\n    var user = await _db.Users.FindAsync(id);\n    return user;\n}\n```\nUnder the hood, the compiler rewrites this as a state machine.\n\n**ConfigureAwait(false)** tells the awaiter not to capture the current synchronisation context, avoiding unnecessary context switches:\n```csharp\n// In library code (not ASP.NET controller)\nvar data = await httpClient.GetStringAsync(url).ConfigureAwait(false);\n```\n\n**Rule:** Use `ConfigureAwait(false)` in library/service code. Don't need it in ASP.NET Core controllers (there's no SynchronisationContext to capture anyway).",
    "category": ".NET Core", "difficulty": "Medium", "tags": ["async", "await", "csharp", "threading"] },

  { "question": "What is Dependency Injection in ASP.NET Core? Explain lifetime scopes.",
    "answer": "ASP.NET Core has DI built-in. Register services in `Program.cs` and inject via constructors.\n\n**Lifetimes:**\n| Lifetime | Instance created | Use for |\n|---|---|---|\n| **Transient** | Every injection | Lightweight stateless services |\n| **Scoped** | Once per HTTP request | DbContext, unit-of-work |\n| **Singleton** | Once for app lifetime | Config, caches, HttpClient |\n\n```csharp\nbuilder.Services.AddTransient<IEmailService, EmailService>();\nbuilder.Services.AddScoped<IRepository, MongoRepository>();\nbuilder.Services.AddSingleton<ICacheService, MemoryCacheService>();\n```\n\n⚠️ Never inject a **Scoped** service into a **Singleton** — the scoped service becomes a singleton (captive dependency bug).",
    "category": ".NET Core", "difficulty": "Medium", "tags": ["dependency-injection", "lifetime", "transient", "scoped"] },

  { "question": "What is the Repository Pattern and why use it with MongoDB in .NET?",
    "answer": "The Repository Pattern abstracts data access behind an interface, decoupling business logic from the database.\n\n```csharp\npublic interface IQuestionRepository {\n    Task<List<Question>> GetAllAsync();\n    Task<Question> GetByIdAsync(string id);\n    Task AddAsync(Question q);\n    Task UpdateAsync(string id, Question q);\n    Task DeleteAsync(string id);\n}\n\npublic class MongoQuestionRepository : IQuestionRepository {\n    private readonly IMongoCollection<Question> _col;\n    public MongoQuestionRepository(IMongoDatabase db) {\n        _col = db.GetCollection<Question>(\"questions\");\n    }\n    public async Task<List<Question>> GetAllAsync() =>\n        await _col.Find(_ => true).ToListAsync();\n}\n```\n\n**Benefits:** swap MongoDB for SQL without touching controllers; easy to mock in unit tests.",
    "category": ".NET Core", "difficulty": "Medium", "tags": ["repository-pattern", "mongodb", "dotnet"] },

  { "question": "What is Entity Framework Core? Explain Code-First vs Database-First.",
    "answer": "EF Core is an ORM that maps C# classes to database tables, handling SQL generation.\n\n**Code-First:** define models in C#, generate migrations to create/update the DB:\n```csharp\npublic class Product {\n    public int Id { get; set; }\n    public string Name { get; set; } = string.Empty;\n    public decimal Price { get; set; }\n}\n// dotnet ef migrations add InitialCreate\n// dotnet ef database update\n```\n\n**Database-First:** scaffold models from an existing DB:\n```\ndotnet ef dbcontext scaffold \"ConnectionString\" Microsoft.EntityFrameworkCore.SqlServer\n```\n\n**With MongoDB:** Use the official MongoDB.Driver directly — EF Core doesn't support MongoDB natively (use Repository Pattern instead).",
    "category": ".NET Core", "difficulty": "Medium", "tags": ["efcore", "orm", "code-first", "migrations"] },

  { "question": "What are the differences between IEnumerable, IQueryable, and IList in C#?",
    "answer": "| Interface | Execution | Where filtering runs | Use for |\n|---|---|---|---|\n| `IEnumerable<T>` | Deferred, in-memory | Client (C#) | In-memory lists, LINQ to Objects |\n| `IQueryable<T>` | Deferred, translated to query | Server (SQL/MongoDB) | DB queries via EF Core / MongoDB Driver |\n| `IList<T>` | Immediate | N/A | When you need index access & count |\n\n```csharp\n// BAD: loads ALL users into memory, then filters\nIEnumerable<User> users = _db.Users;\nvar admins = users.Where(u => u.IsAdmin); // runs in C#\n\n// GOOD: filter runs as SQL/MongoDB query\nIQueryable<User> users = _db.Users;\nvar admins = users.Where(u => u.IsAdmin); // translated to DB query\n```",
    "category": ".NET Core", "difficulty": "Hard", "tags": ["ienumerable", "iqueryable", "linq", "performance"] },

  { "question": "What is LINQ and how do you use it in C#?",
    "answer": "LINQ (Language Integrated Query) provides a unified query syntax for collections, XML, databases, and more.\n\n**Query syntax:**\n```csharp\nvar result = from u in users\n             where u.Age > 18\n             orderby u.Name\n             select u.Name;\n```\n\n**Method syntax (more common):**\n```csharp\nvar result = users\n    .Where(u => u.Age > 18)\n    .OrderBy(u => u.Name)\n    .Select(u => u.Name)\n    .ToList();\n```\n\n**Common operators:** `Where`, `Select`, `SelectMany`, `GroupBy`, `Join`, `FirstOrDefault`, `Any`, `All`, `Count`, `Sum`, `Distinct`, `OrderBy`, `Take`, `Skip`.\n\nLINQ is **deferred** — the query only executes when you call `ToList()`, `FirstOrDefault()`, or iterate with `foreach`.",
    "category": ".NET Core", "difficulty": "Easy", "tags": ["linq", "csharp", "collections"] },

  { "question": "What is the difference between abstract class and interface in C#?",
    "answer": "| Feature | Abstract Class | Interface |\n|---|---|---|\n| Multiple inheritance | ❌ (one base class) | ✅ (multiple interfaces) |\n| Fields / state | ✅ | ❌ (only properties) |\n| Constructors | ✅ | ❌ |\n| Default implementation | ✅ | ✅ (C# 8+ default interface methods) |\n| Access modifiers | Any | Public by default |\n\n```csharp\npublic abstract class Animal {\n    public string Name { get; set; }\n    public abstract void Speak(); // must override\n    public virtual void Move() => Console.WriteLine(\"Moving\"); // can override\n}\n\npublic interface ISwimmable {\n    void Swim();\n}\n\npublic class Duck : Animal, ISwimmable {\n    public override void Speak() => Console.WriteLine(\"Quack\");\n    public void Swim() => Console.WriteLine(\"Swimming\");\n}\n```\n**Rule of thumb:** Use interfaces for contracts/capabilities; abstract classes for shared base implementation.",
    "category": ".NET Core", "difficulty": "Medium", "tags": ["abstract", "interface", "oop", "csharp"] },

  { "question": "What is REST and how do you design a RESTful API in ASP.NET Core?",
    "answer": "REST (Representational State Transfer) is an architectural style using HTTP verbs and resource-based URLs.\n\n**HTTP verbs:**\n- `GET /api/questions` — list all\n- `GET /api/questions/{id}` — get one\n- `POST /api/questions` — create\n- `PUT /api/questions/{id}` — full update\n- `PATCH /api/questions/{id}` — partial update\n- `DELETE /api/questions/{id}` — delete\n\n**ASP.NET Core controller:**\n```csharp\n[ApiController]\n[Route(\"api/[controller]\")]\npublic class QuestionsController : ControllerBase {\n    [HttpGet]\n    public async Task<IActionResult> GetAll() =>\n        Ok(await _repo.GetAllAsync());\n\n    [HttpPost]\n    public async Task<IActionResult> Create(Question q) {\n        await _repo.AddAsync(q);\n        return CreatedAtAction(nameof(GetById), new { id = q.Id }, q);\n    }\n}\n```",
    "category": ".NET Core", "difficulty": "Easy", "tags": ["rest", "api", "aspnetcore", "controllers"] },

  { "question": "What is CORS and how do you configure it in ASP.NET Core?",
    "answer": "CORS (Cross-Origin Resource Sharing) is a browser security mechanism that blocks requests from a different origin (domain, port, protocol).\n\n**ASP.NET Core configuration:**\n```csharp\n// Program.cs\nbuilder.Services.AddCors(options => {\n    options.AddPolicy(\"AllowAngular\", policy => {\n        policy.WithOrigins(\"http://localhost:4200\", \"https://yourdomain.com\")\n              .AllowAnyHeader()\n              .AllowAnyMethod();\n    });\n});\n\napp.UseCors(\"AllowAngular\"); // must be before UseAuthorization\n```\n\n**Preflight:** browsers send an `OPTIONS` request before `POST/PUT/DELETE`. ASP.NET Core handles this automatically when CORS is configured.\n\n**In development** you can use `.AllowAnyOrigin()` but never in production — it's a security risk.",
    "category": ".NET Core", "difficulty": "Medium", "tags": ["cors", "security", "aspnetcore"] },

  { "question": "How does JWT authentication work in ASP.NET Core?",
    "answer": "JWT (JSON Web Token) is a compact, self-contained token for stateless authentication.\n\n**Structure:** `header.payload.signature`\n\n**Setup:**\n```csharp\n// Program.cs\nbuilder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)\n    .AddJwtBearer(opt => {\n        opt.TokenValidationParameters = new() {\n            ValidateIssuer = true,\n            ValidIssuer = config[\"Jwt:Issuer\"],\n            ValidateAudience = true,\n            ValidAudience = config[\"Jwt:Audience\"],\n            ValidateLifetime = true,\n            IssuerSigningKey = new SymmetricSecurityKey(\n                Encoding.UTF8.GetBytes(config[\"Jwt:Secret\"]))\n        };\n    });\n\napp.UseAuthentication();\napp.UseAuthorization();\n```\n\n**Generate token:**\n```csharp\nvar token = new JwtSecurityToken(\n    issuer: issuer, audience: audience,\n    claims: claims,\n    expires: DateTime.UtcNow.AddHours(1),\n    signingCredentials: creds);\n```",
    "category": ".NET Core", "difficulty": "Hard", "tags": ["jwt", "authentication", "security"] },

  # ─── Design Patterns ───────────────────────────────────────────
  { "question": "What is the Observer Pattern? Give a real-world example.",
    "answer": "The Observer Pattern defines a one-to-many dependency: when one object (Subject) changes state, all its dependents (Observers) are notified automatically.\n\n**Real world:** event systems, pub/sub, stock tickers.\n\n```csharp\npublic interface IObserver { void Update(string message); }\npublic interface ISubject {\n    void Subscribe(IObserver o);\n    void Unsubscribe(IObserver o);\n    void Notify();\n}\n\npublic class StockTicker : ISubject {\n    private List<IObserver> _observers = new();\n    private string _price;\n    public void Subscribe(IObserver o) => _observers.Add(o);\n    public void Unsubscribe(IObserver o) => _observers.Remove(o);\n    public void SetPrice(string p) { _price = p; Notify(); }\n    public void Notify() => _observers.ForEach(o => o.Update(_price));\n}\n```\n\nIn Angular/RxJS: `Subject` and `Observable` are implementations of the Observer pattern.",
    "category": "Design Patterns", "difficulty": "Medium", "tags": ["observer", "pubsub", "behavioral"] },

  { "question": "What is the Factory Pattern? When would you use it?",
    "answer": "The Factory Pattern provides an interface for creating objects without specifying their exact class — the subclass decides which class to instantiate.\n\n```csharp\npublic interface INotification { void Send(string msg); }\npublic class EmailNotification : INotification {\n    public void Send(string msg) => Console.WriteLine($\"Email: {msg}\");\n}\npublic class SmsNotification : INotification {\n    public void Send(string msg) => Console.WriteLine($\"SMS: {msg}\");\n}\n\npublic static class NotificationFactory {\n    public static INotification Create(string type) => type switch {\n        \"email\" => new EmailNotification(),\n        \"sms\"   => new SmsNotification(),\n        _ => throw new ArgumentException(\"Unknown type\")\n    };\n}\n\n// Usage\nvar n = NotificationFactory.Create(\"email\");\nn.Send(\"Hello!\");\n```\n\n**Use when** object creation logic is complex or you need to choose between implementations at runtime.",
    "category": "Design Patterns", "difficulty": "Medium", "tags": ["factory", "creational", "patterns"] },

  { "question": "What is the Decorator Pattern?",
    "answer": "The Decorator Pattern attaches additional responsibilities to an object dynamically, as an alternative to subclassing.\n\n```csharp\npublic interface ILogger { void Log(string msg); }\n\npublic class ConsoleLogger : ILogger {\n    public void Log(string msg) => Console.WriteLine(msg);\n}\n\npublic class TimestampLoggerDecorator : ILogger {\n    private readonly ILogger _inner;\n    public TimestampLoggerDecorator(ILogger inner) => _inner = inner;\n    public void Log(string msg) =>\n        _inner.Log($\"[{DateTime.Now:HH:mm:ss}] {msg}\");\n}\n\npublic class PrefixLoggerDecorator : ILogger {\n    private readonly ILogger _inner;\n    private readonly string _prefix;\n    public PrefixLoggerDecorator(ILogger inner, string prefix) {\n        _inner = inner; _prefix = prefix;\n    }\n    public void Log(string msg) => _inner.Log($\"{_prefix} {msg}\");\n}\n\n// Stack decorators\nILogger logger = new PrefixLoggerDecorator(\n    new TimestampLoggerDecorator(new ConsoleLogger()), \"[APP]\");\nlogger.Log(\"Started\"); // [APP] [12:00:00] Started\n```",
    "category": "Design Patterns", "difficulty": "Medium", "tags": ["decorator", "structural", "patterns"] },

  { "question": "What is the Strategy Pattern?",
    "answer": "The Strategy Pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. It lets the algorithm vary independently from the clients that use it.\n\n```csharp\npublic interface ISortStrategy {\n    void Sort(List<int> data);\n}\n\npublic class BubbleSort : ISortStrategy {\n    public void Sort(List<int> d) { /* bubble sort */ }\n}\npublic class QuickSort : ISortStrategy {\n    public void Sort(List<int> d) { /* quick sort */ }\n}\n\npublic class Sorter {\n    private ISortStrategy _strategy;\n    public Sorter(ISortStrategy strategy) => _strategy = strategy;\n    public void SetStrategy(ISortStrategy s) => _strategy = s;\n    public void Sort(List<int> d) => _strategy.Sort(d);\n}\n\n// Usage\nvar sorter = new Sorter(new QuickSort());\nsorter.Sort(data);\nsorter.SetStrategy(new BubbleSort()); // swap at runtime\n```\n\n**Common use cases:** payment processors, compression algorithms, sorting, authentication strategies.",
    "category": "Design Patterns", "difficulty": "Medium", "tags": ["strategy", "behavioral", "patterns"] },

  { "question": "What is the Command Pattern?",
    "answer": "The Command Pattern encapsulates a request as an object, allowing you to queue operations, support undo/redo, and log changes.\n\n```csharp\npublic interface ICommand { void Execute(); void Undo(); }\n\npublic class AddTextCommand : ICommand {\n    private readonly TextEditor _editor;\n    private readonly string _text;\n    public AddTextCommand(TextEditor e, string t) { _editor = e; _text = t; }\n    public void Execute() => _editor.Append(_text);\n    public void Undo() => _editor.Remove(_text.Length);\n}\n\npublic class CommandHistory {\n    private readonly Stack<ICommand> _history = new();\n    public void Execute(ICommand cmd) { cmd.Execute(); _history.Push(cmd); }\n    public void Undo() { if (_history.Count > 0) _history.Pop().Undo(); }\n}\n```\n\n**Real-world uses:** text editors (Ctrl+Z), transaction systems, task queues (e.g. message brokers), CQRS.",
    "category": "Design Patterns", "difficulty": "Medium", "tags": ["command", "behavioral", "undo-redo"] },

  { "question": "What is the Adapter Pattern?",
    "answer": "The Adapter Pattern converts the interface of a class into another interface the client expects — it makes incompatible interfaces work together.\n\n```csharp\n// 3rd-party library we can't change\npublic class LegacyPaymentSystem {\n    public void MakePayment(string accountNo, float amount) { ... }\n}\n\n// Our expected interface\npublic interface IPaymentProcessor {\n    void ProcessPayment(PaymentRequest request);\n}\n\n// Adapter\npublic class LegacyPaymentAdapter : IPaymentProcessor {\n    private readonly LegacyPaymentSystem _legacy;\n    public LegacyPaymentAdapter(LegacyPaymentSystem legacy) => _legacy = legacy;\n    public void ProcessPayment(PaymentRequest req) =>\n        _legacy.MakePayment(req.AccountNumber, (float)req.Amount);\n}\n```\n\n**Common in:** integrating legacy systems, third-party SDKs, or when wrapping an external API with your own interface.",
    "category": "Design Patterns", "difficulty": "Medium", "tags": ["adapter", "structural", "integration"] },

  { "question": "What is the Mediator Pattern and how does MediatR use it in .NET?",
    "answer": "The Mediator Pattern reduces coupling between components by having them communicate through a central mediator object rather than directly.\n\n**MediatR** is the popular .NET implementation:\n\n```csharp\n// Query (request)\npublic record GetQuestionsQuery : IRequest<List<QuestionDto>>;\n\n// Handler\npublic class GetQuestionsHandler\n    : IRequestHandler<GetQuestionsQuery, List<QuestionDto>> {\n    private readonly IRepository _repo;\n    public GetQuestionsHandler(IRepository repo) => _repo = repo;\n    public async Task<List<QuestionDto>> Handle(\n        GetQuestionsQuery req, CancellationToken ct) =>\n        await _repo.GetAllAsync();\n}\n\n// Controller — only knows about IMediator\n[HttpGet]\npublic async Task<IActionResult> Get() =>\n    Ok(await _mediator.Send(new GetQuestionsQuery()));\n```\n\n**Benefits:** decoupled handlers, easy to add cross-cutting concerns (logging, validation) via pipeline behaviours.",
    "category": "Design Patterns", "difficulty": "Hard", "tags": ["mediator", "mediatr", "cqrs", "dotnet"] },

  # ─── SOLID Principles ──────────────────────────────────────────
  { "question": "Explain the Single Responsibility Principle with a C# example.",
    "answer": "**SRP:** A class should have only one reason to change — it should do one thing.\n\n**❌ Bad — UserService does everything:**\n```csharp\npublic class UserService {\n    public User GetUser(int id) { ... }\n    public void SaveUser(User u) { ... }      // DB concern\n    public void SendWelcomeEmail(User u) { ... } // Email concern\n    public string GenerateReport(User u) { ... } // Report concern\n}\n```\n\n**✅ Good — separate concerns:**\n```csharp\npublic class UserRepository { public User Get(int id) {...} }\npublic class EmailService { public void SendWelcome(User u) {...} }\npublic class ReportService { public string Generate(User u) {...} }\n```\n\n**Why it matters:** when a requirement changes (e.g. switch email provider), you only touch `EmailService` — no risk of breaking database logic.",
    "category": "SOLID Principles", "difficulty": "Easy", "tags": ["solid", "srp", "single-responsibility"] },

  { "question": "Explain the Open/Closed Principle with an example.",
    "answer": "**OCP:** Software entities should be **open for extension** but **closed for modification**. Add new behaviour by adding new code, not editing existing code.\n\n**❌ Bad — adding a new shape requires modifying AreaCalculator:**\n```csharp\npublic class AreaCalculator {\n    public double Calculate(object shape) {\n        if (shape is Circle c) return Math.PI * c.Radius * c.Radius;\n        if (shape is Rectangle r) return r.Width * r.Height;\n        // Must edit this class to add Triangle!\n    }\n}\n```\n\n**✅ Good — use abstraction:**\n```csharp\npublic interface IShape { double Area(); }\npublic class Circle : IShape {\n    public double Radius { get; set; }\n    public double Area() => Math.PI * Radius * Radius;\n}\npublic class Triangle : IShape { // NEW shape — no existing code changes\n    public double Base { get; set; }\n    public double Height { get; set; }\n    public double Area() => 0.5 * Base * Height;\n}\npublic class AreaCalculator {\n    public double Calculate(IShape shape) => shape.Area();\n}\n```",
    "category": "SOLID Principles", "difficulty": "Medium", "tags": ["solid", "ocp", "open-closed"] },

  { "question": "What is the Liskov Substitution Principle?",
    "answer": "**LSP:** Objects of a subclass should be replaceable with objects of the base class without altering the correctness of the program.\n\n**❌ Violation — Square breaks Rectangle behaviour:**\n```csharp\npublic class Rectangle {\n    public virtual int Width { get; set; }\n    public virtual int Height { get; set; }\n    public int Area() => Width * Height;\n}\n\npublic class Square : Rectangle {\n    public override int Width { set { base.Width = base.Height = value; } }\n    public override int Height { set { base.Width = base.Height = value; } }\n}\n\n// This breaks with Square:\nRectangle r = new Square();\nr.Width = 4; r.Height = 5;\nConsole.WriteLine(r.Area()); // Expected 20, got 25!\n```\n\n**Fix:** don't inherit Square from Rectangle. Model them separately via a shared `IShape` interface.\n\n**Key test:** a subclass must honour the contracts (preconditions, postconditions, invariants) of its parent.",
    "category": "SOLID Principles", "difficulty": "Hard", "tags": ["solid", "lsp", "liskov"] },

  { "question": "What is the Interface Segregation Principle?",
    "answer": "**ISP:** Clients should not be forced to depend on interfaces they don't use. Prefer many small, specific interfaces over one large fat interface.\n\n**❌ Bad — fat interface:**\n```csharp\npublic interface IWorker {\n    void Work();\n    void Eat();    // robots don't eat!\n    void Sleep();  // robots don't sleep!\n}\n\npublic class Robot : IWorker {\n    public void Work() { /* ok */ }\n    public void Eat() => throw new NotImplementedException(); // forced!\n    public void Sleep() => throw new NotImplementedException();\n}\n```\n\n**✅ Good — segregated interfaces:**\n```csharp\npublic interface IWorkable { void Work(); }\npublic interface IFeedable { void Eat(); }\npublic interface ISleepable { void Sleep(); }\n\npublic class Human : IWorkable, IFeedable, ISleepable { ... }\npublic class Robot : IWorkable { public void Work() { ... } } // only what it needs\n```",
    "category": "SOLID Principles", "difficulty": "Medium", "tags": ["solid", "isp", "interface-segregation"] },

  { "question": "What is the Dependency Inversion Principle?",
    "answer": "**DIP:** High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details.\n\n**❌ Bad — high-level OrderService depends directly on concrete SqlRepository:**\n```csharp\npublic class OrderService {\n    private readonly SqlOrderRepository _repo = new SqlOrderRepository();\n    public void PlaceOrder(Order o) => _repo.Save(o);\n}\n```\nChanging to MongoDB requires editing `OrderService`.\n\n**✅ Good — both depend on the abstraction:**\n```csharp\npublic interface IOrderRepository { Task SaveAsync(Order o); }\n\npublic class MongoOrderRepository : IOrderRepository { ... }\npublic class SqlOrderRepository : IOrderRepository { ... }\n\npublic class OrderService {\n    private readonly IOrderRepository _repo;\n    public OrderService(IOrderRepository repo) => _repo = repo; // injected\n    public async Task PlaceOrder(Order o) => await _repo.SaveAsync(o);\n}\n```\nThis is why DI containers and the Repository Pattern work so well together.",
    "category": "SOLID Principles", "difficulty": "Medium", "tags": ["solid", "dip", "dependency-inversion"] },
]

print(f"Total new questions to insert: {len(new_questions)}")

def build_insert_js(questions, start_id):
    """Build mongosh JS to insert questions"""
    docs = []
    for i, q in enumerate(questions):
        q_id = start_id + i
        doc = {
            "id": q_id,
            "question": q["question"],
            "answer": q["answer"],
            "category": q["category"],
            "difficulty": q.get("difficulty", "Medium"),
            "tags": q.get("tags", []),
            "dateAdded": "__DATE__",
            "expanded": False
        }
        docs.append(doc)
    # Serialise to JSON then swap the date placeholder
    json_str = json.dumps(docs, ensure_ascii=False)
    json_str = json_str.replace('"__DATE__"', 'new Date()')
    return f'db.questions.insertMany({json_str});'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Connecting to {hostname}...")
client.connect(hostname, port=port, username=username, password=password, timeout=20)
print("Connected ✅\n")

# Step 1: get current max ID
get_max_cmd = f'mongosh {MONGO_URI} --quiet --eval "var max = db.questions.find({{}},{{\idField:1,id:1}}).sort({{id:-1}}).limit(1).toArray(); print(max.length > 0 ? max[0].id : 0)"'
_, out = run(client, get_max_cmd)
# parse the last numeric line
lines = [l.strip() for l in out.strip().splitlines() if l.strip().isdigit()]
current_max = int(lines[-1]) if lines else 4
print(f"Current max ID: {current_max}")

start_id = current_max + 1
print(f"Inserting {len(new_questions)} questions starting at ID {start_id}...\n")

# Step 2: insert in batches of 10 — write JS file to server, run with mongosh --file
batch_size = 10
inserted = 0
for i in range(0, len(new_questions), batch_size):
    batch = new_questions[i:i+batch_size]
    js = build_insert_js(batch, start_id + i)
    # Write JS to a temp file on the server
    sftp = client.open_sftp()
    remote_path = f'/tmp/insert_questions_{i}.js'
    with sftp.open(remote_path, 'w') as f:
        f.write(js)
    sftp.close()
    # Run it
    cmd = f'mongosh {MONGO_URI} --quiet --file {remote_path}'
    code, out = run(client, cmd)
    # Cleanup
    run(client, f'rm -f {remote_path}')
    if code == 0 or 'insertedIds' in out or 'insertedCount' in out:
        inserted += len(batch)
        print(f"  ✅ Batch {i//batch_size + 1}: inserted {len(batch)} questions")
    else:
        print(f"  ⚠️  Batch {i//batch_size + 1} output: {out[:200]}")

# Step 3: verify total
verify_cmd = f'mongosh {MONGO_URI} --quiet --eval "print(db.questions.countDocuments())"'
_, out2 = run(client, verify_cmd)
lines2 = [l.strip() for l in out2.strip().splitlines() if l.strip().isdigit()]
total = lines2[-1] if lines2 else "?"
print(f"\n✅ Done! Total questions in MongoDB: {total}")
print(f"   Added: {inserted} new questions")

client.close()
