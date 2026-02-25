import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { filter } from 'rxjs/operators';

interface QAPair {
  _id?: string;
  id: number;
  question: string;
  answer: string;
  timestamp: Date;
  category?: string;
  saved: boolean;
}

@Component({
  selector: 'app-ai-qa',
  templateUrl: './ai-qa.component.html',
  styleUrls: ['./ai-qa.component.css']
})
export class AiQaComponent implements OnInit {
  currentQuestion = '';
  generatedAnswer = '';
  isGenerating = false;
  savedQAs: QAPair[] = [];
  showSaved = false;
  isChildRoute = false;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    // Detect if we're on a child route
    this.checkIfChildRoute();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkIfChildRoute();
    });
  }

  private checkIfChildRoute(): void {
    const url = this.router.url;
    // Check if URL has child routes (not just /ai-learn)
    this.isChildRoute = url !== '/ai-learn' && url.startsWith('/ai-learn/');
  }

  ngOnInit(): void {
    this.loadSavedQAs();
    console.log('AiQaComponent initialized');
    console.log('Saved Q&As loaded:', this.savedQAs.length, 'items');
  }

  // Generate AI answer based on question
  getAnswer(): void {
    if (!this.currentQuestion.trim()) {
      return;
    }

    this.isGenerating = true;
    this.generatedAnswer = '';

    // Simulate AI processing with delay
    setTimeout(() => {
      this.generatedAnswer = this.generateSimpleAnswer(this.currentQuestion);
      this.isGenerating = false;
    }, 1500);
  }

  // AI-powered simple answer generation
  generateSimpleAnswer(question: string): string {
    const q = question.toLowerCase();
    
    // Programming concepts
    if (q.includes('angular')) {
      return `🅰️ **Angular - Complete Technical Overview**

**What is Angular?**
Angular is a TypeScript-based, open-source web application framework developed and maintained by Google. It's a complete rewrite of AngularJS and provides a platform for building scalable, enterprise-level single-page applications (SPAs).

**Core Architecture:**
• **Component-Based:** UI is broken into reusable components
• **Dependency Injection:** Services are injected where needed
• **RxJS Integration:** Reactive programming with observables
• **TypeScript:** Strong typing for better code quality
• **Two-Way Data Binding:** Automatic UI-model synchronization

**Real Code Example:**
\`\`\`typescript
// app.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: \`
    <h1>{{ title }}</h1>
    <input [(ngModel)]="name" placeholder="Enter name">
    <p>Hello, {{ name }}!</p>
    <button (click)="greet()">Greet</button>
  \`
})
export class AppComponent {
  title = 'My Angular App';
  name = '';
  
  greet() {
    alert(\`Welcome, \${this.name}!\`);
  }
}
\`\`\`

**Real-World Use Cases:**
✅ **Google Cloud Console** - Infrastructure management
✅ **Microsoft Office Online** - Web-based productivity
✅ **Forbes** - Content management and delivery
✅ **PayPal** - Payment processing interfaces
✅ **Upwork** - Freelancing platform

**Key Features:**
• **CLI Tool:** \`ng generate component\` scaffolds components instantly
• **Routing:** Built-in router for navigation
• **Forms:** Template-driven and Reactive forms
• **HTTP Client:** Easy API integration
• **Testing:** Jasmine/Karma for unit tests

**When to Use Angular:**
✅ Large enterprise applications
✅ Complex UI with many features
✅ Need strong structure and conventions
✅ TypeScript preference
✅ Long-term maintainability is priority

**Getting Started:**
\`\`\`bash
npm install -g @angular/cli
ng new my-app
cd my-app
ng serve
\`\`\`

Visit http://localhost:4200 to see your app! 🚀`;
    }
    
    if (q.includes('typescript')) {
      return `📘 **TypeScript - Complete Technical Guide**

**What is TypeScript?**
TypeScript is a strongly-typed superset of JavaScript developed by Microsoft. It adds optional static typing, classes, interfaces, and modern ECMAScript features to JavaScript. TypeScript compiles to plain JavaScript that runs in any browser or Node.js.

**Why TypeScript Exists:**
JavaScript's dynamic typing can lead to runtime errors. TypeScript catches these errors at compile-time, making code more reliable and maintainable.

**Core Features:**
• **Static Typing:** Variables have defined types
• **Type Inference:** Automatic type detection
• **Interfaces:** Define object structures
• **Generics:** Reusable, type-safe code
• **Advanced OOP:** Classes, inheritance, decorators
• **Modern JS Features:** Async/await, spread operators, etc.

**Real Code Examples:**

**1. Basic Types:**
\`\`\`typescript
// Primitive types
let name: string = "John";
let age: number = 30;
let isActive: boolean = true;
let scores: number[] = [90, 85, 92];

// Object type
interface User {
  id: number;
  name: string;
  email: string;
  role?: string; // Optional property
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com"
};
\`\`\`

**2. Functions with Types:**
\`\`\`typescript
// Function with typed parameters and return
function calculateTotal(price: number, tax: number): number {
  return price + (price * tax);
}

// Arrow function with types
const greet = (name: string): string => \`Hello, \${name}!\`;

// Optional and default parameters
function createUser(name: string, age: number = 18): User {
  return { id: Date.now(), name, email: \`\${name}@example.com\` };
}
\`\`\`

**3. Interfaces and Classes:**
\`\`\`typescript
// Interface
interface Product {
  id: number;
  name: string;
  price: number;
  getDiscount(percent: number): number;
}

// Class implementing interface
class Book implements Product {
  constructor(
    public id: number,
    public name: string,
    public price: number,
    public author: string
  ) {}
  
  getDiscount(percent: number): number {
    return this.price * (1 - percent / 100);
  }
}

const book = new Book(1, "TypeScript Guide", 49.99, "John Doe");
console.log(book.getDiscount(10)); // 44.991
\`\`\`

**4. Generics (Reusable Types):**
\`\`\`typescript
// Generic function
function getFirstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

const firstNum = getFirstElement([1, 2, 3]); // number
const firstName = getFirstElement(["Alice", "Bob"]); // string

// Generic interface
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const userResponse: ApiResponse<User> = {
  data: { id: 1, name: "Alice", email: "alice@example.com" },
  status: 200,
  message: "Success"
};
\`\`\`

**5. Union Types and Type Guards:**
\`\`\`typescript
// Union types
function formatInput(input: string | number): string {
  if (typeof input === "string") {
    return input.toUpperCase();
  }
  return input.toFixed(2);
}

// Type aliases
type Status = "pending" | "approved" | "rejected";
type ID = string | number;
\`\`\`

**Real-World Benefits:**
✅ **Catch errors before runtime** - Save debugging time
✅ **Better IDE support** - Autocomplete, refactoring
✅ **Self-documenting code** - Types explain intent
✅ **Easier refactoring** - Compiler catches broken code
✅ **Team collaboration** - Clear contracts between modules

**Companies Using TypeScript:**
• Microsoft (Azure, VS Code)
• Google (Angular, Google Cloud)
• Airbnb
• Slack
• Spotify
• Asana

**Configuration (tsconfig.json):**
\`\`\`json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
\`\`\`

**Quick Start:**
\`\`\`bash
npm install -g typescript
tsc --init
tsc yourfile.ts
node yourfile.js
\`\`\``;
    }
    
    if (q.includes('component')) {
      return `🧩 **Components** are the building blocks of modern web apps.

**What they are:**
• Small, reusable pieces of UI
• Each has its own logic and design
• Like puzzle pieces that fit together

**Simple Explanation:**
Think of a website like a house:
• Header = Roof
• Sidebar = Wall
• Button = Door
Each part (component) can be reused in different houses (pages)!

**Structure:**
📄 HTML → What it looks like
🎨 CSS → How it's styled
⚙️ TypeScript → What it does

**Benefits:**
✅ Reusable everywhere
✅ Easy to test
✅ Simple to update
✅ Team-friendly

**Real Example:** A "Like Button" component can be used on every post without rewriting code! 💖`;
    }
    
    if (q.includes('api') || q.includes('rest')) {
      return `🌐 **REST API - Complete Technical Guide**

**What is a REST API?**
REST (Representational State Transfer) is an architectural style for designing networked applications. A REST API uses HTTP requests to GET, POST, PUT, PATCH, and DELETE data.

**HTTP Methods (CRUD Operations):**
\`\`\`
GET    → Read/Retrieve data
POST   → Create new data
PUT    → Update entire resource
PATCH  → Partially update
DELETE → Remove data
\`\`\`

**Real Angular HTTP Client Example:**

\`\`\`typescript
// user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface User {
  id?: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'https://api.example.com/api/users';
  
  constructor(private http: HttpClient) {}
  
  // GET all users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }
  
  // GET single user
  getUser(id: number): Observable<User> {
    return this.http.get<User>(\`\${this.apiUrl}/\${id}\`);
  }
  
  // POST create user
  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }
  
  // PUT update user
  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(\`\${this.apiUrl}/\${id}\`, user);
  }
  
  // DELETE user
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(\`\${this.apiUrl}/\${id}\`);
  }
}
\`\`\`

**Using in Component:**

\`\`\`typescript
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = false;
  
  constructor(private userService: UserService) {}
  
  ngOnInit() {
    this.loadUsers();
  }
  
  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.loading = false;
      }
    });
  }
  
  addUser() {
    const newUser = { name: 'John', email: 'john@example.com' };
    this.userService.createUser(newUser).subscribe({
      next: (user) => this.users.push(user),
      error: (error) => console.error(error)
    });
  }
}
\`\`\`

**HTTP Status Codes:**
\`\`\`
200 OK           → Successful GET/PUT/PATCH
201 Created      → Successful POST
204 No Content   → Successful DELETE
400 Bad Request  → Invalid data
401 Unauthorized → Need authentication
404 Not Found    → Resource doesn't exist
500 Server Error → Server problem
\`\`\`

**Real-World Examples:**
✅ **GitHub API** - Repository data
✅ **Twitter API** - Tweets and user data
✅ **Google Maps API** - Location services
✅ **Stripe API** - Payment processing
✅ **OpenWeatherMap API** - Weather data`;
    }
    
    if (q.includes('promise') || q.includes('async')) {
      return `⏳ **Promises & Async/Await - Complete Guide**

**What are Promises?**
A Promise is a JavaScript object representing the eventual completion (or failure) of an asynchronous operation. It's a placeholder for a value that will be available in the future.

**Promise States:**
\`\`\`
Pending   → Initial state, operation in progress
Fulfilled → Operation completed successfully
Rejected  → Operation failed
\`\`\`

**Creating a Promise:**

\`\`\`typescript
// Basic Promise
const fetchData = new Promise((resolve, reject) => {
  setTimeout(() => {
    const data = { id: 1, name: 'John' };
    const success = true;
    
    if (success) {
      resolve(data);  // Success
    } else {
      reject(new Error('Failed to fetch'));  // Failure
    }
  }, 2000);
});

// Using the Promise
fetchData
  .then(data => {
    console.log('Success:', data);
    return data.id;  // Chain to next then
  })
  .then(id => {
    console.log('User ID:', id);
  })
  .catch(error => {
    console.error('Error:', error);
  })
  .finally(() => {
    console.log('Operation complete');
  });
\`\`\`

**Real API Example:**

\`\`\`typescript
// Fetch API returns a Promise
function getUser(id: number): Promise<User> {
  return fetch(\`https://api.example.com/users/\${id}\`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network error');
      }
      return response.json();
    })
    .then(data => data as User);
}

// Usage
getUser(1)
  .then(user => console.log(user))
  .catch(error => console.error(error));
\`\`\`

**Async/Await (Modern Syntax):**

\`\`\`typescript
// Same code with async/await
async function getUserAsync(id: number): Promise<User> {
  try {
    const response = await fetch(\`https://api.example.com/users/\${id}\`);
    
    if (!response.ok) {
      throw new Error('Network error');
    }
    
    const data = await response.json();
    return data as User;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Usage - looks synchronous!
async function loadUser() {
  try {
    const user = await getUserAsync(1);
    console.log('User:', user);
    
    // Can do more async operations
    const posts = await getUserPosts(user.id);
    console.log('Posts:', posts);
  } catch (error) {
    console.error('Failed:', error);
  }
}

loadUser();
\`\`\`

**Angular Service Example:**

\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private http: HttpClient) {}
  
  // Returns Observable (similar to Promise)
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
  
  // Convert Observable to Promise
  async getUsersAsPromise(): Promise<User[]> {
    return this.http.get<User[]>('/api/users').toPromise();
  }
  
  // Multiple async operations
  async loadAllData(): Promise<void> {
    try {
      const users = await this.getUsersAsPromise();
      console.log('Users loaded:', users.length);
      
      // Load posts for first user
      if (users.length > 0) {
        const posts = await this.getUserPosts(users[0].id).toPromise();
        console.log('Posts:', posts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
}
\`\`\`

**Promise.all (Parallel Execution):**

\`\`\`typescript
async function loadMultipleUsers() {
  try {
    // Run all requests in parallel
    const [user1, user2, user3] = await Promise.all([
      getUserAsync(1),
      getUserAsync(2),
      getUserAsync(3)
    ]);
    
    console.log('All users loaded:', user1, user2, user3);
  } catch (error) {
    console.error('One or more requests failed:', error);
  }
}

// Real example: Load user profile data
async function loadUserProfile(userId: number) {
  const [user, posts, comments, followers] = await Promise.all([
    fetchUser(userId),
    fetchUserPosts(userId),
    fetchUserComments(userId),
    fetchUserFollowers(userId)
  ]);
  
  return { user, posts, comments, followers };
}
\`\`\`

**Promise.race (First to Complete):**

\`\`\`typescript
// Timeout implementation
function fetchWithTimeout(url: string, timeout: number): Promise<any> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeout);
  });
  
  const fetchPromise = fetch(url).then(r => r.json());
  
  // Return whichever finishes first
  return Promise.race([fetchPromise, timeoutPromise]);
}

// Usage
try {
  const data = await fetchWithTimeout('https://api.example.com/data', 5000);
  console.log(data);
} catch (error) {
  console.error('Request timed out or failed');
}
\`\`\`

**Error Handling Patterns:**

\`\`\`typescript
// Try-Catch with async/await
async function safeApiCall() {
  try {
    const data = await fetchData();
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}

// Promise chain error handling
fetchData()
  .then(data => processData(data))
  .then(result => saveResult(result))
  .catch(error => {
    // Catches errors from any step
    console.error('Pipeline failed:', error);
  });
\`\`\`

**Real-World Use Cases:**
✅ **API Calls** - Fetch data from servers
✅ **File Operations** - Read/write files
✅ **Database Queries** - Query operations
✅ **Image Loading** - Load images asynchronously
✅ **Timer Operations** - Delayed execution
✅ **Animation Sequences** - Wait for animations

**Key Benefits:**
✅ Avoid callback hell
✅ Better error handling
✅ Cleaner, readable code
✅ Easy to compose async operations
✅ Better debugging support

**Common Mistake:**

\`\`\`typescript
// ❌ Wrong - not waiting for promise
function getData() {
  let result;
  fetchData().then(data => {
    result = data;  // This runs later!
  });
  return result;  // undefined!
}

// ✅ Correct - using async/await
async function getData() {
  const result = await fetchData();
  return result;  // Has actual data
}
\`\`\``;
    }

    if (q.includes('css') || q.includes('style')) {
      return `🎨 **CSS (Cascading Style Sheets) - Complete Styling Guide**

**What is CSS?**
CSS is a stylesheet language used to describe the presentation of HTML documents. It controls layout, colors, fonts, spacing, animations, and responsive design.

**CSS Syntax:**
\`\`\`css
selector {
  property: value;
}
\`\`\`

**Selectors:**

\`\`\`css
/* Element selector */
p { color: blue; }

/* Class selector */
.button { background: red; }

/* ID selector */
#header { height: 100px; }

/* Attribute selector */
input[type="text"] { border: 1px solid gray; }

/* Pseudo-class */
button:hover { background: darkblue; }
a:visited { color: purple; }

/* Pseudo-element */
p::first-line { font-weight: bold; }
h1::before { content: "→ "; }

/* Combinators */
div p { }  /* Descendant */
div > p { }  /* Direct child */
div + p { }  /* Adjacent sibling */
div ~ p { }  /* General sibling */
\`\`\`

**Box Model:**

\`\`\`css
.box {
  /* Content area */
  width: 300px;
  height: 200px;
  
  /* Padding (inside border) */
  padding: 20px;
  
  /* Border */
  border: 2px solid black;
  
  /* Margin (outside border) */
  margin: 10px;
  
  /* Box sizing */
  box-sizing: border-box;  /* Include padding & border in width */
}
\`\`\`

**Flexbox (1D Layout):**

\`\`\`css
.container {
  display: flex;
  flex-direction: row;  /* or column */
  justify-content: center;  /* Main axis: flex-start, flex-end, space-between, space-around */
  align-items: center;  /* Cross axis: flex-start, flex-end, stretch */
  gap: 20px;
}

.item {
  flex: 1;  /* Grow to fill space */
  flex-shrink: 0;  /* Don't shrink */
  flex-basis: 200px;  /* Base size */
}
\`\`\`

**CSS Grid (2D Layout):**

\`\`\`css
.grid-container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;  /* 3 columns */
  grid-template-rows: auto 1fr auto;  /* 3 rows */
  gap: 20px;
  
  /* Or shorthand */
  grid-template-columns: repeat(3, 1fr);
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));  /* Responsive */
}

.grid-item {
  grid-column: 1 / 3;  /* Span 2 columns */
  grid-row: 1 / 2;
}
\`\`\`

**Responsive Design:**

\`\`\`css
/* Mobile first approach */
.container {
  width: 100%;
  padding: 10px;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    width: 750px;
    padding: 20px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    width: 1000px;
    padding: 30px;
  }
}
\`\`\`

**Animations:**

\`\`\`css
/* Transition (simple) */
.button {
  background: blue;
  transition: all 0.3s ease;
}

.button:hover {
  background: darkblue;
  transform: scale(1.1);
}

/* Keyframe Animation (complex) */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.element {
  animation: slideIn 0.5s ease forwards;
}
\`\`\`

**CSS Variables (Custom Properties):**

\`\`\`css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --spacing: 16px;
  --border-radius: 8px;
}

.button {
  background: var(--primary-color);
  padding: var(--spacing);
  border-radius: var(--border-radius);
}

/* Change theme */
.dark-theme {
  --primary-color: #1a1a2e;
  --secondary-color: #16213e;
}
\`\`\`

**Modern CSS Features:**

\`\`\`css
/* Gradient */
.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Shadow */
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Backdrop filter */
.glassmorphism {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

/* Clip path */
.triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

/* Grid auto-fit */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
\`\`\`

**Angular Component Styling:**

\`\`\`typescript
@Component({
  selector: 'app-card',
  template: \`
    <div class="card">
      <h3>{{ title }}</h3>
      <p>{{ content }}</p>
    </div>
  \`,
  styles: [\`
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    h3 {
      color: #667eea;
      margin: 0 0 10px 0;
    }
  \`],
  // Or external file:
  styleUrls: ['./card.component.css']
})
export class CardComponent {}
\`\`\`

**CSS Specificity (Priority):**
\`\`\`
!important      → Highest priority
Inline styles   → <div style="...">
IDs             → #header
Classes         → .button
Elements        → div, p
\`\`\`

**Real-World Example (Card Component):**

\`\`\`css
.card {
  /* Layout */
  display: flex;
  flex-direction: column;
  width: 350px;
  
  /* Spacing */
  padding: 24px;
  margin: 16px;
  gap: 16px;
  
  /* Visual */
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  /* Transition */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.card-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.card-content {
  color: #666;
  line-height: 1.6;
}

.card-footer {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}
\`\`\`

**Performance Tips:**
✅ Use CSS transforms (not top/left) for animations
✅ Minimize repaints and reflows
✅ Use will-change for animated properties
✅ Avoid universal selectors (*)
✅ Use class selectors over IDs
✅ Minify CSS for production`;
    }


    // Add more specific topics
    if (q.includes('rxjs') || q.includes('observable')) {
      return `🔄 **RxJS & Observables - Reactive Programming**

**What is RxJS?**
RxJS (Reactive Extensions for JavaScript) is a library for reactive programming using Observables. It's heavily used in Angular for handling asynchronous data streams.

**Observable vs Promise:**
\`\`\`
Promise:      Single value, not cancellable
Observable:   Multiple values over time, cancellable, composable
\`\`\`

**Creating Observables:**

\`\`\`typescript
import { Observable, of, from, interval } from 'rxjs';

// Simple observable
const simple$ = of(1, 2, 3);

// From array
const fromArray$ = from([1, 2, 3, 4, 5]);

// From promise
const fromPromise$ = from(fetch('/api/data'));

// Timer (emits every second)
const timer$ = interval(1000);

// Custom observable
const custom$ = new Observable(subscriber => {
  subscriber.next('Hello');
  subscriber.next('World');
  subscriber.complete();
});
\`\`\`

**Subscribing to Observables:**

\`\`\`typescript
const subscription = myObservable$.subscribe({
  next: (value) => console.log('Got value:', value),
  error: (err) => console.error('Error:', err),
  complete: () => console.log('Complete!')
});

// Clean up
subscription.unsubscribe();
\`\`\`

**Common Operators:**

\`\`\`typescript
import { map, filter, tap, catchError, switchMap, debounceTime } from 'rxjs/operators';

// Map (transform data)
numbers$.pipe(
  map(x => x * 2)
).subscribe(console.log);

// Filter
numbers$.pipe(
  filter(x => x % 2 === 0)
).subscribe(console.log);

// Multiple operators
searchInput$.pipe(
  debounceTime(300),        // Wait 300ms after last keystroke
  map(text => text.trim()),
  filter(text => text.length > 2),
  switchMap(text => this.apiService.search(text))
).subscribe(results => console.log(results));
\`\`\`

**Real Angular Example:**

\`\`\`typescript
@Component({
  selector: 'app-search',
  template: \`
    <input [formControl]="searchControl" placeholder="Search...">
    <div *ngFor="let result of results">{{ result.name }}</div>
  \`
})
export class SearchComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  results: any[] = [];
  subscription: Subscription;
  
  constructor(private apiService: ApiService) {}
  
  ngOnInit() {
    this.subscription = this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.apiService.search(query))
    ).subscribe(results => {
      this.results = results;
    });
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
\`\`\`

**Key Benefits:**
✅ Handle multiple values over time
✅ Powerful operators for data transformation
✅ Easy error handling
✅ Cancellable subscriptions
✅ Built into Angular`;
    }
    
    if (q.includes('directive') || q.includes('structural directive')) {
      return `📋 **Angular Directives - Extend HTML Behavior**

**What are Directives?**
Directives are classes that add behavior to elements in Angular applications. There are three types:

**1. Component Directives (with template)**
**2. Structural Directives (change DOM structure)**
**3. Attribute Directives (change appearance/behavior)**

**Structural Directives:**

\`\`\`typescript
// *ngIf - Conditional rendering
<div *ngIf="isLoggedIn">Welcome!</div>
<div *ngIf="user; else loading">{{ user.name }}</div>
<ng-template #loading>Loading...</ng-template>

// *ngFor - Loop through items
<div *ngFor="let item of items; let i = index">
  {{ i }}: {{ item.name }}
</div>

// *ngSwitch - Multiple conditions
<div [ngSwitch]="status">
  <p *ngSwitchCase="'active'">Active</p>
  <p *ngSwitchCase="'pending'">Pending</p>
  <p *ngSwitchDefault>Unknown</p>
</div>
\`\`\`

**Custom Structural Directive:**

\`\`\`typescript
@Directive({
  selector: '[appUnless]'
})
export class UnlessDirective {
  @Input() set appUnless(condition: boolean) {
    if (!condition) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
  
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}
}

// Usage: <div *appUnless="isHidden">Show this</div>
\`\`\`

**Attribute Directives:**

\`\`\`typescript
@Directive({
  selector: '[appHighlight]'
})
export class HighlightDirective {
  @Input() appHighlight = 'yellow';
  
  constructor(private el: ElementRef) {}
  
  @HostListener('mouseenter') onMouseEnter() {
    this.highlight(this.appHighlight);
  }
  
  @HostListener('mouseleave') onMouseLeave() {
    this.highlight('');
  }
  
  private highlight(color: string) {
    this.el.nativeElement.style.backgroundColor = color;
  }
}

// Usage: <p appHighlight="lightblue">Hover me!</p>
\`\`\``;
    }

    if (q.includes('service') || q.includes('dependency injection')) {
      return `💉 **Angular Services & Dependency Injection**

**What is a Service?**
A service is a class that encapsulates business logic, data access, or utilities that can be shared across components. Services promote code reusability and separation of concerns.

**Creating a Service:**

\`\`\`typescript
@Injectable({
  providedIn: 'root'  // Singleton service
})
export class UserService {
  private users: User[] = [];
  private apiUrl = '/api/users';
  
  constructor(private http: HttpClient) {}
  
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }
  
  getUser(id: number): Observable<User> {
    return this.http.get<User>(\`\${this.apiUrl}/\${id}\`);
  }
  
  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }
}
\`\`\`

**Dependency Injection:**

\`\`\`typescript
// Inject service into component
@Component({
  selector: 'app-users',
  template: \`
    <div *ngFor="let user of users">
      {{ user.name }}
    </div>
  \`
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  
  // Service injected via constructor
  constructor(private userService: UserService) {}
  
  ngOnInit() {
    this.userService.getUsers().subscribe(
      users => this.users = users
    );
  }
}
\`\`\`

**Real-World Service Example:**

\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  
  constructor(private http: HttpClient) {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }
  
  login(credentials: LoginData): Observable<User> {
    return this.http.post<User>('/api/login', credentials).pipe(
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }
  
  logout() {
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }
  
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }
}
\`\`\``;
    }

    // Default general answer
    return `💡 **Technical Explanation**

I can provide detailed technical answers for many topics. Try asking about:

**Popular Topics:**
• Angular - Framework basics, components, services
• TypeScript - Types, interfaces, generics
• RxJS - Observables, operators
• REST API - HTTP methods, Angular HttpClient
• Promises/Async - Asynchronous programming
• CSS - Styling, Flexbox, Grid
• Directives - Structural and attribute directives
• Services - Dependency injection
• Components - Component architecture

**Your Question:** "${question}"

For the most accurate answer, try to be specific about:
✅ What technology/concept you're asking about
✅ Whether you want code examples
✅ If you need real-world use cases
✅ Level of detail needed (beginner/advanced)

**Example Questions:**
"How do I create an Angular service?"
"Explain TypeScript generics with examples"
"Show me how to use RxJS switchMap"
"What is dependency injection in Angular?"
"How do async/await work in JavaScript?"

Ask a specific question and I'll provide detailed technical explanations with real code examples! 🚀`;
  }

  // Save current Q&A pair
  saveQA(): void {
    if (!this.currentQuestion.trim() || !this.generatedAnswer.trim()) {
      console.log('⚠️ Save cancelled: empty question or answer');
      return;
    }

    const newQA: QAPair = {
      id: Date.now(),
      question: this.currentQuestion,
      answer: this.generatedAnswer,
      timestamp: new Date(),
      category: this.detectCategory(this.currentQuestion),
      saved: true
    };

    // Save to MongoDB
    this.apiService.addAIQA(newQA).subscribe(
      (savedQA) => {
        this.savedQAs.unshift(savedQA as any);
        console.log('✅ Saved to MongoDB, total Q&As:', this.savedQAs.length);
      },
      (error) => {
        console.error('Error saving Q&A to MongoDB:', error);
      }
    );

    // Show success feedback
    this.showSaved = true;
    setTimeout(() => {
      this.showSaved = false;
    }, 2000);

    // Clear form
    this.clearForm();
  }

  // Detect category from question
  detectCategory(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('angular') || q.includes('component')) return 'Angular';
    if (q.includes('typescript') || q.includes('type')) return 'TypeScript';
    if (q.includes('css') || q.includes('style')) return 'CSS';
    if (q.includes('api') || q.includes('rest')) return 'API';
    if (q.includes('promise') || q.includes('async')) return 'JavaScript';
    return 'General';
  }

  // Clear form
  clearForm(): void {
    this.currentQuestion = '';
    this.generatedAnswer = '';
  }

  // Delete saved Q&A
  deleteQA(id: number): void {
    const qa = this.savedQAs.find(q => q.id === id);
    if (qa && qa._id) {
      this.apiService.deleteAIQA(qa._id).subscribe(
        () => {
          this.savedQAs = this.savedQAs.filter(qa => qa.id !== id);
          console.log('✅ Deleted Q&A from MongoDB');
        },
        (error) => {
          console.error('Error deleting Q&A from MongoDB:', error);
        }
      );
    }
  }

  // Load from MongoDB
  loadSavedQAs(): void {
    this.apiService.getAIQAs().subscribe(
      (qas) => {
        this.savedQAs = qas as any;
        console.log('📚 Loaded saved Q&As from MongoDB:', this.savedQAs.length);
      },
      (error) => {
        console.error('Error loading Q&As from MongoDB:', error);
        console.log('📭 No saved Q&As found');
      }
    );
  }

  // Export as JSON
  exportToJSON(): void {
    const dataStr = JSON.stringify(this.savedQAs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `ai-qa-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  // Get formatted date
  getFormattedDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Set question (for quick question buttons)
  setQuestion(question: string): void {
    this.currentQuestion = question;
  }

  // Scroll to Ask AI section
  scrollToAskAI(): void {
    const askAISection = document.querySelector('.main-section');
    if (askAISection) {
      askAISection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Expand card (placeholder for future modal)
  expandCard(id: number): void {
    // TODO: Implement modal view
    console.log('Expanding card:', id);
  }
}
