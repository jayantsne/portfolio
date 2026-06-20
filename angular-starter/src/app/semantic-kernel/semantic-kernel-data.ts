/**
 * Static content for the Semantic Kernel learning module.
 * Topics, modules, lab starter code and SK-specific mentor chips.
 */
import { LwModule, LwTopic } from '../shared/learning-workspace/learning-workspace.models';

// ── Topic definitions ───────────────────────────────────────────────────────

const introTopics: LwTopic[] = [
  {
    id: 'sk-intro-1',
    title: 'What is Semantic Kernel?',
    icon: '🔮',
    status: 'active',
    estMinutes: 10,
    description: 'Learn what Semantic Kernel is and what problems it solves',
    order: 1,
    tag: 'Start Here',
  },
  {
    id: 'sk-intro-2',
    title: 'Why Use Semantic Kernel?',
    icon: '🎯',
    status: 'locked',
    estMinutes: 10,
    description: 'Understand SK motivations vs rolling your own AI integration',
    order: 2,
  },
  {
    id: 'sk-intro-3',
    title: 'Core Architecture Overview',
    icon: '🏗️',
    status: 'locked',
    estMinutes: 15,
    description: 'Kernel, Plugins, Memory, Connectors — the big picture',
    order: 3,
  },
];

const coreTopics: LwTopic[] = [
  {
    id: 'sk-core-1',
    title: 'Plugins & Skills',
    icon: '🧩',
    status: 'locked',
    estMinutes: 15,
    description: 'Package reusable logic as SK plugins (formerly called "skills")',
    order: 4,
    tag: 'Core',
  },
  {
    id: 'sk-core-2',
    title: 'Native Functions',
    icon: '⚙️',
    status: 'locked',
    estMinutes: 15,
    description: 'Write C# methods decorated with [KernelFunction] for deterministic logic',
    order: 5,
  },
  {
    id: 'sk-core-3',
    title: 'Semantic (Prompt) Functions',
    icon: '💬',
    status: 'locked',
    estMinutes: 15,
    description: 'Define AI behaviors as prompt templates with typed inputs',
    order: 6,
  },
  {
    id: 'sk-core-4',
    title: 'Memory & Embeddings',
    icon: '🧠',
    status: 'locked',
    estMinutes: 20,
    description: 'Store and retrieve information using vector memory stores',
    order: 7,
  },
  {
    id: 'sk-core-5',
    title: 'Planner & Auto Function Calling',
    icon: '📋',
    status: 'locked',
    estMinutes: 20,
    description: 'Let AI chain functions together to solve complex goals automatically',
    order: 8,
  },
];

const labTopics: LwTopic[] = [
  {
    id: 'sk-lab-1',
    title: 'Lab 1: Setup the Kernel',
    icon: '🔧',
    status: 'locked',
    estMinutes: 20,
    description: 'Install SK NuGet packages and configure the kernel builder',
    order: 9,
    tag: 'Lab',
  },
  {
    id: 'sk-lab-2',
    title: 'Lab 2: Create a Prompt Function',
    icon: '✏️',
    status: 'locked',
    estMinutes: 20,
    description: 'Write your first semantic function from a prompt template',
    order: 10,
    tag: 'Lab',
  },
  {
    id: 'sk-lab-3',
    title: 'Lab 3: Invoke & Compose',
    icon: '▶️',
    status: 'locked',
    estMinutes: 20,
    description: 'Invoke functions and chain outputs between SK functions',
    order: 11,
    tag: 'Lab',
  },
  {
    id: 'sk-lab-4',
    title: 'Lab 4: Add Memory',
    icon: '💾',
    status: 'locked',
    estMinutes: 25,
    description: 'Use in-memory or vector-store backed memory in a kernel',
    order: 12,
    tag: 'Lab',
  },
  {
    id: 'sk-lab-5',
    title: 'Lab 5: Build an AI Assistant',
    icon: '🤖',
    status: 'locked',
    estMinutes: 30,
    description: 'Combine plugins, memory and planner to build a working assistant',
    order: 13,
    tag: 'Lab',
  },
];

const advancedTopics: LwTopic[] = [
  {
    id: 'sk-adv-1',
    title: 'Real-world Use Cases',
    icon: '🌐',
    status: 'locked',
    estMinutes: 15,
    description: 'Enterprise patterns: RAG, agents, copilots and workflow automation',
    order: 14,
  },
  {
    id: 'sk-adv-2',
    title: 'SK vs LangChain',
    icon: '⚖️',
    status: 'locked',
    estMinutes: 15,
    description: 'Side-by-side comparison — when to pick SK over LangChain/LlamaIndex',
    order: 15,
  },
  {
    id: 'sk-adv-3',
    title: 'SK vs Plain OpenAI SDK',
    icon: '🔬',
    status: 'locked',
    estMinutes: 10,
    description: 'What SK adds on top of the raw OpenAI / Azure OpenAI client',
    order: 16,
  },
];

// ── Module definitions ──────────────────────────────────────────────────────

export const SK_MODULES: LwModule[] = [
  {
    id: 'mod-intro',
    title: 'Introduction',
    icon: '🚀',
    topics: introTopics,
  },
  {
    id: 'mod-core',
    title: 'Core Concepts',
    icon: '💡',
    topics: coreTopics,
  },
  {
    id: 'mod-lab',
    title: 'Practical Lab',
    icon: '🔬',
    topics: labTopics,
  },
  {
    id: 'mod-advanced',
    title: 'Advanced Topics',
    icon: '🏆',
    topics: advancedTopics,
  },
];

// ── Lab starter code for the playground ────────────────────────────────────

export const SK_LAB_CODE: Record<string, string> = {
  'sk-lab-1': `// Lab 1: Setup the Semantic Kernel
// NuGet packages needed:
//   dotnet add package Microsoft.SemanticKernel

using Microsoft.SemanticKernel;

// 1. Create the kernel builder
var builder = Kernel.CreateBuilder();

// 2. Add an AI chat completion service
//    Replace with your actual API key and model
builder.AddOpenAIChatCompletion(
    modelId: "gpt-4o-mini",
    apiKey: "YOUR_OPENAI_API_KEY");

// 3. Build the kernel
Kernel kernel = builder.Build();

Console.WriteLine("Semantic Kernel initialized successfully!");
Console.WriteLine($"Services registered: {kernel.Services.GetType().Name}");
`,

  'sk-lab-2': `// Lab 2: Create a Prompt Function
// A semantic function is a prompt template with typed arguments.

using Microsoft.SemanticKernel;

var builder = Kernel.CreateBuilder();
builder.AddOpenAIChatCompletion("gpt-4o-mini", "YOUR_OPENAI_API_KEY");
var kernel = builder.Build();

// Define a prompt template with a {{$input}} variable
string promptTemplate = """
    Summarize the following text in 2-3 sentences.
    Be concise and capture the key points.

    Text: {{$input}}

    Summary:
    """;

// Create a kernel function from the prompt
var summarizeFunction = kernel.CreateFunctionFromPrompt(promptTemplate);

// Invoke the function
string textToSummarize = "Semantic Kernel is an open-source SDK from Microsoft " +
    "that integrates LLMs like GPT-4 into your applications. It provides a " +
    "unified interface to call AI models, manage memory, and compose complex " +
    "AI workflows using plugins and planners.";

var result = await kernel.InvokeAsync(summarizeFunction, new() {
    ["input"] = textToSummarize
});

Console.WriteLine("Summary:");
Console.WriteLine(result);
`,

  'sk-lab-3': `// Lab 3: Invoke & Compose Functions
// Chain multiple prompt functions together using the kernel.

using Microsoft.SemanticKernel;

var builder = Kernel.CreateBuilder();
builder.AddOpenAIChatCompletion("gpt-4o-mini", "YOUR_OPENAI_API_KEY");
var kernel = builder.Build();

// Function 1: Summarize
var summarize = kernel.CreateFunctionFromPrompt(
    "Summarize this in one sentence: {{$input}}");

// Function 2: Translate
var translate = kernel.CreateFunctionFromPrompt(
    "Translate this English text to Spanish: {{$input}}");

// Function 3: Add emoji
var addEmoji = kernel.CreateFunctionFromPrompt(
    "Add a relevant emoji at the start of this sentence: {{$input}}");

string originalText = "Microsoft Semantic Kernel is a powerful SDK " +
    "that helps developers build AI-powered applications by " +
    "orchestrating large language models with custom plugins and memory.";

// Step 1: Summarize
var summary = await kernel.InvokeAsync(summarize, new() { ["input"] = originalText });
Console.WriteLine($"Summary: {summary}");

// Step 2: Translate the summary
var translated = await kernel.InvokeAsync(translate, new() { ["input"] = summary.ToString() });
Console.WriteLine($"Spanish: {translated}");

// Step 3: Add emoji
var withEmoji = await kernel.InvokeAsync(addEmoji, new() { ["input"] = translated.ToString() });
Console.WriteLine($"With emoji: {withEmoji}");
`,

  'sk-lab-4': `// Lab 4: Add Memory to the Kernel
// Use SK's memory abstractions to store and retrieve information.

using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Memory;
using Microsoft.SemanticKernel.Connectors.OpenAI;

// Build the kernel with an embedding model for memory
var builder = Kernel.CreateBuilder();
builder.AddOpenAIChatCompletion("gpt-4o-mini", "YOUR_OPENAI_API_KEY");
builder.AddOpenAITextEmbeddingGeneration("text-embedding-ada-002", "YOUR_OPENAI_API_KEY");
var kernel = builder.Build();

// Create the memory store (volatile = in-memory, no persistence)
var memory = new SemanticTextMemory(
    new VolatileMemoryStore(),
    kernel.GetRequiredService<ITextEmbeddingGenerationService>());

// Save facts into memory
const string COLLECTION = "sk-facts";

await memory.SaveInformationAsync(COLLECTION, id: "sk-1",
    text: "Semantic Kernel is an open-source SDK from Microsoft for building AI apps.");

await memory.SaveInformationAsync(COLLECTION, id: "sk-2",
    text: "SK supports OpenAI, Azure OpenAI, Hugging Face and other AI providers.");

await memory.SaveInformationAsync(COLLECTION, id: "sk-3",
    text: "SK Plugins are collections of functions that can be called by the AI.");

// Search memory
string query = "What AI providers does SK support?";
var results = memory.SearchAsync(COLLECTION, query, limit: 2);

Console.WriteLine($"Query: {query}");
Console.WriteLine("Relevant memories found:");
await foreach (var result in results)
{
    Console.WriteLine($"  [{result.Relevance:P0}] {result.Metadata.Text}");
}
`,

  'sk-lab-5': `// Lab 5: Build an AI Assistant with SK
// Combine a plugin, memory and chat history for a smart assistant.

using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

// ── 1. Define a Plugin ───────────────────────────────────────────────────
public class WeatherPlugin
{
    [KernelFunction("get_weather")]
    [Description("Get the current weather for a city")]
    public string GetWeather(string city) =>
        city.ToLower() switch {
            "london"   => "Cloudy, 14°C",
            "new york" => "Sunny, 22°C",
            "tokyo"    => "Partly cloudy, 18°C",
            _          => $"Weather data unavailable for {city}",
        };
}

// ── 2. Build the kernel with auto function calling ───────────────────────
var builder = Kernel.CreateBuilder();
builder.AddOpenAIChatCompletion("gpt-4o-mini", "YOUR_OPENAI_API_KEY");
builder.Plugins.AddFromType<WeatherPlugin>();
var kernel = builder.Build();

// Enable auto function calling
var settings = new OpenAIPromptExecutionSettings {
    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
};

// ── 3. Run a multi-turn conversation ────────────────────────────────────
var chat = kernel.GetRequiredService<IChatCompletionService>();
var history = new ChatHistory("You are a helpful travel assistant.");

async Task AskAsync(string userMessage) {
    history.AddUserMessage(userMessage);
    var response = await chat.GetChatMessageContentAsync(history, settings, kernel);
    history.AddAssistantMessage(response.Content!);
    Console.WriteLine($"User: {userMessage}");
    Console.WriteLine($"Assistant: {response.Content}\\n");
}

await AskAsync("What's the weather like in London today?");
await AskAsync("How about in Tokyo?");
await AskAsync("Which city should I visit for warmer weather?");
`,
};

// ── Default playground code (shown before any lab topic is selected) ────────

export const SK_DEFAULT_CODE = `// Welcome to Semantic Kernel Playground!
// Select a Lab topic from the sidebar to load starter code.
// Or try this quick example:

using Microsoft.SemanticKernel;

// The Kernel is the central orchestrator in Semantic Kernel.
// It manages AI services, plugins, and memory.

// Quick example: Creating a kernel
var builder = Kernel.CreateBuilder();

// Add your AI service here:
// builder.AddOpenAIChatCompletion("gpt-4o-mini", apiKey: "...");
// builder.AddAzureOpenAIChatCompletion("deployment", endpoint, apiKey);

var kernel = builder.Build();
Console.WriteLine("Kernel ready! Select a Lab topic to start coding.");
`;

// ── SK-specific mentor chips ────────────────────────────────────────────────

export const SK_MENTOR_CHIPS: { label: string; icon: string; prompt: string }[] = [
  {
    icon: '🔮',
    label: 'Explain SK Flow',
    prompt: 'Show me step-by-step how Semantic Kernel orchestrates an AI call from user input to final response, including the plugin, kernel, and AI service layers.',
  },
  {
    icon: '💡',
    label: 'Improve Prompt',
    prompt: 'Look at the SK prompt template in my code and suggest improvements for clarity, consistency, and token efficiency. Show me a better version.',
  },
  {
    icon: '🧠',
    label: 'Add Memory',
    prompt: 'Show me how to add semantic memory (vector store) to a Semantic Kernel application so it can remember context across conversations.',
  },
  {
    icon: '🧩',
    label: 'Convert to Plugin',
    prompt: 'Show me how to convert this code into a proper Semantic Kernel plugin class with [KernelFunction] attributes and dependency injection.',
  },
  {
    icon: '🐛',
    label: 'Debug Kernel',
    prompt: 'Help me debug this Semantic Kernel code. Explain common SK errors and how to use kernel event hooks for tracing AI calls.',
  },
  {
    icon: '⚖️',
    label: 'SK vs LangChain',
    prompt: 'Compare Semantic Kernel (C#/.NET) with LangChain (Python). When would I choose SK? What are the tradeoffs in architecture, features and ecosystem?',
  },
  {
    icon: '🗂️',
    label: 'Structured Notes',
    prompt: 'Generate a structured visual breakdown of this topic with sections, step-by-step explanation, and a visual flow or comparison.',
  },
];

// ── Rich static fallback content (shown when AI is unavailable) ─────────────
// Written in Markdown — rendered by MarkdownPipe with full syntax highlighting.

export const SK_STATIC_CONTENT: Record<string, string> = {

  'sk-intro-1': `## What is Semantic Kernel?

**Semantic Kernel (SK)** is Microsoft's open-source SDK for building AI-powered applications in C#, Python, and Java. It acts as the **orchestration layer** between your application code and Large Language Models (LLMs) like GPT-4, Claude, or Gemini.

Think of SK as the glue that connects your business logic to AI — without you managing raw HTTP calls, prompt strings, or response parsing.

---

## The Four Core Building Blocks

| Building Block | What it Does |
|----------------|-------------|
| **Kernel** | Central hub — holds all AI services and plugins |
| **Plugins** | Packages of reusable functions (AI prompts or C# code) |
| **Memory** | Semantic vector store for context and document retrieval |
| **Planner** | AI-driven orchestration — chains functions automatically |

---

## Hello, Semantic Kernel

\`\`\`csharp
using Microsoft.SemanticKernel;

var kernel = Kernel.CreateBuilder()
    .AddOpenAIChatCompletion("gpt-4o-mini", "YOUR_API_KEY")
    .Build();

// Ask AI — just 2 lines of real code!
var result = await kernel.InvokePromptAsync(
    "Explain what an API is in one clear sentence.");
Console.WriteLine(result);
\`\`\`

---

## Where SK Fits in Your Architecture

\`\`\`
Your Application Code
         ↓
   Semantic Kernel        ← you configure this
  ↙        ↓       ↘
Plugins  Memory  Planner
         ↓
  AI Service (OpenAI / Azure / Local)
         ↓
  Final AI Response → back to your app
\`\`\`

> 💡 **Start here:** Click **Explain Simply** in the right panel for plain-English overview, or **Code Example** for hands-on C# snippets.`,

  'sk-intro-2': `## Why Use Semantic Kernel?

Building AI apps without an orchestration layer means writing custom glue code for every feature — raw HTTP calls, manual prompt management, DIY memory, and brittle provider-specific code.

**Semantic Kernel eliminates that complexity.**

---

## Without SK vs With SK

| Task | Without SK | With Semantic Kernel |
|------|-----------|---------------------|
| Call AI model | Raw HTTP + JSON parsing | \`kernel.InvokePromptAsync("...")\` |
| Pass variables to prompt | String interpolation (fragile) | Typed \`{{$variable}}\` templates |
| Remember context | Custom database code | Built-in semantic memory |
| Use tools / functions | Manual function dispatch | Auto function calling via Planner |
| Switch AI providers | Rewrite your integration | Change 1 line in the Kernel builder |

---

## Top Reasons Developers Choose SK

**1. Provider-Agnostic** — OpenAI, Azure OpenAI, Hugging Face, Ollama — swap with a single config change.

**2. Plugin Architecture** — Package AI behaviors + native code as self-contained, testable plugins.

**3. Enterprise-Grade** — Microsoft-backed, production-ready, native Azure integration.

**4. AI Planners** — The AI decides *which* functions to call and in what order. No hard-coded workflows.

**5. Type-Safe C#** — First-class .NET support with \`[KernelFunction]\` attributes and dependency injection.

---

## Real Production Use Cases

- **Copilot apps** — add AI assistance to any .NET application in hours
- **RAG systems** — AI that answers questions from *your* documents
- **AI agents** — autonomous systems that plan and execute multi-step tasks
- **Workflow automation** — replace rigid branching logic with AI-driven decisions

> 💡 Try clicking **Analogy** in the right panel for a memorable mental model!`,

  'sk-intro-3': `## Core Architecture Overview

Semantic Kernel has four main components. You don't need all four in every app — start with the Kernel and add the others as your needs grow.

---

## 1. The Kernel — Central Hub

The \`Kernel\` is your entry point. It's a dependency-injection container that holds AI service connections, registered plugins, and configuration.

\`\`\`csharp
var kernel = Kernel.CreateBuilder()
    .AddOpenAIChatCompletion("gpt-4o-mini", apiKey)
    .Build();
\`\`\`

---

## 2. Plugins — Reusable Capabilities

Plugins bundle related functions. Functions can be **native** (C# code) or **semantic** (AI prompt templates).

\`\`\`csharp
public class DatePlugin {
    [KernelFunction("get_date")]
    [Description("Returns today's date")]
    public string GetDate() => DateTime.Now.ToString("MMMM d, yyyy");
}
kernel.Plugins.AddFromType<DatePlugin>();
\`\`\`

---

## 3. Memory — Semantic Context Store

Memory saves information as vector embeddings, enabling retrieval by *meaning* — not just keyword match.

\`\`\`csharp
// Save text
await memory.SaveInformationAsync("docs", id: "p1",
    text: "SK was created by Microsoft in 2023.");
// Find by meaning
var results = memory.SearchAsync("docs", "Who made Semantic Kernel?");
\`\`\`

---

## 4. Planners — AI Orchestration

Planners let the AI decide which functions to call (and in what order) to fulfill a user's goal — automatically.

\`\`\`csharp
var settings = new OpenAIPromptExecutionSettings {
    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
};
\`\`\`

---

## How a Request Flows

\`\`\`
1. User request enters the Kernel
2. Planner analyzes registered plugins
3. Planner picks which functions to call
4. Kernel executes functions (code + AI)
5. Memory is queried for relevant context
6. AI synthesizes final response
7. Result returned to your application
\`\`\`

> 💡 Beginner tip: Start with Kernel + one prompt function. Add plugins when you need reusability and Planner when you need automation.`,

  'sk-core-1': `## Plugins & Skills

Plugins are Semantic Kernel's fundamental extension mechanism. They package related functions into reusable, testable units that both *your code* and *the AI* can call.

---

## Anatomy of a Plugin

\`\`\`csharp
using Microsoft.SemanticKernel;
using System.ComponentModel;

public class WeatherPlugin {

    [KernelFunction("get_weather")]
    [Description("Gets current weather for a city. Returns temperature and conditions.")]
    public string GetWeather(
        [Description("The city name, e.g. London")] string city
    ) {
        // Call a real weather API in production
        return $"It's 20°C and sunny in {city}";
    }

    [KernelFunction("get_forecast")]
    [Description("Gets 3-day weather forecast for a city")]
    public string GetForecast(string city) {
        return $"Forecast for {city}: Sunny all week";
    }
}
\`\`\`

---

## Register the Plugin

\`\`\`csharp
var kernel = Kernel.CreateBuilder()
    .AddOpenAIChatCompletion("gpt-4o-mini", apiKey)
    .Build();

kernel.Plugins.AddFromType<WeatherPlugin>();
\`\`\`

---

## AI Calls Your Plugin Automatically

\`\`\`csharp
var settings = new OpenAIPromptExecutionSettings {
    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
};

var result = await kernel.InvokePromptAsync(
    "What's the weather in Tokyo? Should I bring an umbrella?",
    new(settings));
// → "It's 20°C and sunny in Tokyo — no umbrella needed!"
\`\`\`

---

## Key Attributes

| Attribute | Purpose |
|-----------|---------|
| \`[KernelFunction]\` | Marks method as callable by SK / AI |
| \`[Description]\` | Tells the AI *what this function does* — critical for auto-calling |
| Parameter \`[Description]\` | Helps AI pass the right argument values |

> ⚠️ **Always add \`[Description]\`** — without it, the AI doesn't know when or how to call your function.`,

  'sk-core-2': `## Native Functions

Native functions are regular C# methods that perform **deterministic, reliable operations**, wired into SK's AI orchestration pipeline via the \`[KernelFunction]\` attribute.

---

## The Pattern

\`\`\`csharp
using Microsoft.SemanticKernel;
using System.ComponentModel;

public class MathPlugin {

    [KernelFunction("add")]
    [Description("Adds two numbers and returns the result")]
    public int Add(int a, int b) => a + b;

    [KernelFunction("format_currency")]
    [Description("Formats a decimal as currency")]
    public string FormatCurrency(
        [Description("Amount to format")] double amount,
        [Description("Currency code, e.g. USD")] string currency = "USD"
    ) => $"{currency} {amount:F2}";
}
\`\`\`

---

## Dependency Injection Support

Constructor injection works naturally — use your existing services inside plugins:

\`\`\`csharp
public class OrderPlugin {
    private readonly OrderRepository _repo;

    public OrderPlugin(OrderRepository repo) { _repo = repo; }

    [KernelFunction("get_order")]
    [Description("Look up an order by its ID")]
    public async Task<string> GetOrder(int orderId) {
        var order = await _repo.GetByIdAsync(orderId);
        return order != null ? $"Order {orderId}: {order.Status}" : "Not found";
    }
}

// Register with .NET DI — SK resolves it automatically
builder.Services.AddScoped<OrderPlugin>();
kernel.Plugins.AddFromType<OrderPlugin>();
\`\`\`

---

## Best Practices

| Do | Why |
|----|-----|
| Write great \`[Description]\` text | AI uses this to decide when to call your function |
| Return \`string\` or simple types | Easiest for the AI to work with |
| Keep functions focused | One function, one responsibility |
| Validate inputs defensively | AI may pass unexpected values |
| Support \`async\` / \`Task<T>\` | I/O-bound operations (DB, HTTP) need async |`,

  'sk-core-3': `## Semantic (Prompt) Functions

Semantic functions turn AI prompt templates into **typed, reusable, testable functions** — bringing software engineering discipline to prompt management.

---

## Create a Function from a Prompt

\`\`\`csharp
string promptTemplate = """
    You are a code reviewer with deep C# expertise.

    Review this code and rate it 1-10 for:
    1. Readability
    2. Efficiency
    3. Best practices

    Code: {{$code}}
    Language: {{$language}}

    Give a brief score and one concrete improvement.
    """;

var reviewFunc = kernel.CreateFunctionFromPrompt(promptTemplate);
\`\`\`

---

## Invoke with Typed Arguments

\`\`\`csharp
var result = await kernel.InvokeAsync(reviewFunc, new KernelArguments {
    ["code"]     = "for(int i=0;i<list.Count;i++){Console.WriteLine(list[i]);}",
    ["language"] = "C#"
});
Console.WriteLine(result);
\`\`\`

---

## Configure Execution Settings

\`\`\`csharp
var settings = new OpenAIPromptExecutionSettings {
    Temperature = 0.1,   // Low = consistent, factual output
    MaxTokens   = 400,
};

var func = kernel.CreateFunctionFromPrompt(
    promptTemplate,
    new PromptTemplateConfig {
        ExecutionSettings = { ["default"] = settings }
    }
);
\`\`\`

---

## File-Based Plugin Organization

For teams and large projects, save prompts as files:

\`\`\`
/Plugins/WritingPlugin/
    Summarize/
        skprompt.txt    ← the prompt template
        config.json     ← temperature, max tokens
    Rewrite/
        skprompt.txt
        config.json
\`\`\`

\`\`\`csharp
var plugin = kernel.CreatePluginFromPromptDirectory("./Plugins/WritingPlugin");
kernel.Plugins.Add(plugin);
\`\`\`

> 💡 Temperature guide: 0.1–0.3 for factual/code tasks, 0.7–0.9 for creative writing.`,

  'sk-core-4': `## Memory & Embeddings

Semantic memory lets SK store and retrieve information by **meaning** — not just keyword matching. This powers RAG (Retrieval-Augmented Generation) and context-aware AI features.

---

## How Embeddings Work

An **embedding** is a list of numbers representing the *meaning* of text. Similar meanings → similar vectors → found together in semantic search.

\`\`\`
"I love dogs"     → [0.12, -0.45, 0.88, ...]   ← similar
"I adore puppies" → [0.14, -0.42, 0.85, ...]   ← similar
"Stock market"    → [-0.71, 0.23, -0.12, ...]  ← very different
\`\`\`

---

## Setup Memory

\`\`\`csharp
using Microsoft.SemanticKernel.Memory;

var builder = Kernel.CreateBuilder();
builder.AddOpenAIChatCompletion("gpt-4o-mini", apiKey);
builder.AddOpenAITextEmbeddingGeneration("text-embedding-ada-002", apiKey);
var kernel = builder.Build();

var memory = new SemanticTextMemory(
    new VolatileMemoryStore(),   // In-memory; use Qdrant for production
    kernel.GetRequiredService<ITextEmbeddingGenerationService>()
);
\`\`\`

---

## Save & Search

\`\`\`csharp
// Save documents/facts
await memory.SaveInformationAsync("company", id: "p1",
    text: "Remote work is allowed 3 days per week.");
await memory.SaveInformationAsync("company", id: "p2",
    text: "Health insurance covers dental from day one.");

// Semantic search — finds policy even without exact words
var results = memory.SearchAsync("company", "Can I work from home?", limit: 2);
await foreach (var r in results) {
    Console.WriteLine($"[{r.Relevance:P0}] {r.Metadata.Text}");
}
// → [94%] Remote work is allowed 3 days per week.
\`\`\`

---

## Production Memory Stores

| Store | Best For |
|-------|---------|
| **VolatileMemoryStore** | Dev / demos (in-memory, no persistence) |
| **Qdrant** | High-performance production (self-hosted) |
| **Azure AI Search** | Azure-native apps (fully managed) |
| **PostgreSQL pgvector** | Teams already using Postgres |`,

  'sk-core-5': `## Planner & Auto Function Calling

The Planner bridges "user states what they want" and "application does what's needed" — automatically, without you writing orchestration logic.

---

## The Problem Planners Solve

Without a planner, you write orchestration manually:

\`\`\`csharp
// Manual approach — you decide every step
var weather  = await weatherPlugin.GetWeather("London");
var rain     = await weatherPlugin.GetRainChance("London");
var forecast = await kernel.InvokePromptAsync(
    $"Umbrella needed? Weather: {weather}, Rain: {rain}");
\`\`\`

With SK Auto Function Calling:

\`\`\`csharp
// AI decides what to call — you just ask
var result = await kernel.InvokePromptAsync(
    "What's the weather in London? Should I bring an umbrella?",
    new(new OpenAIPromptExecutionSettings {
        ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
    }));
\`\`\`

---

## How It Works Internally

\`\`\`
1. Kernel sends user prompt + list of available function descriptions to LLM
2. LLM responds: "I need to call get_weather('London')"
3. Kernel executes your function, sends result back to LLM
4. LLM may call more functions (iterative until done)
5. LLM synthesizes final natural-language answer
6. Result returned to your application
\`\`\`

---

## Full Setup Example

\`\`\`csharp
kernel.Plugins.AddFromType<WeatherPlugin>();
kernel.Plugins.AddFromType<CalendarPlugin>();
kernel.Plugins.AddFromType<EmailPlugin>();

var settings = new OpenAIPromptExecutionSettings {
    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
};

// AI calls whichever plugins it needs, in the right order
var response = await kernel.InvokePromptAsync(
    "Schedule a meeting with John for tomorrow and email him the invite.",
    new(settings));
\`\`\`

| Behavior | When to Use |
|----------|------------|
| \`AutoInvokeKernelFunctions\` | Normal production use — AI calls functions automatically |
| \`Required\` | Force the AI to always call a specific function |
| \`None\` | Debug mode — see the plan without executing |`,

  'sk-lab-1': `## Lab 1: Setup the Semantic Kernel

In this lab you'll install the NuGet package, initialize the Kernel, and make your first AI call.

---

## Install the Package

\`\`\`bash
dotnet add package Microsoft.SemanticKernel
\`\`\`

---

## Build the Kernel

\`\`\`csharp
using Microsoft.SemanticKernel;

var builder = Kernel.CreateBuilder();

// Option A: OpenAI directly
builder.AddOpenAIChatCompletion(
    modelId: "gpt-4o-mini",
    apiKey:  Environment.GetEnvironmentVariable("OPENAI_API_KEY")!);

// Option B: Azure OpenAI
// builder.AddAzureOpenAIChatCompletion(
//     deploymentName: "my-gpt4",
//     endpoint:       "https://your-resource.openai.azure.com/",
//     apiKey:         Environment.GetEnvironmentVariable("AZURE_KEY")!);

var kernel = builder.Build();
Console.WriteLine("Kernel ready!");
\`\`\`

---

## Test It Works

\`\`\`csharp
var result = await kernel.InvokePromptAsync(
    "Say hello in exactly 5 words.");
Console.WriteLine(result);
// → "Hello, how are you today?"
\`\`\`

---

## Secure Your API Keys

Never hard-code keys. Use environment variables or .NET User Secrets:

\`\`\`bash
# Store key securely (never in source code)
dotnet user-secrets set "OpenAI:ApiKey" "sk-..."
\`\`\`

\`\`\`csharp
var config = new ConfigurationBuilder()
    .AddUserSecrets<Program>()
    .Build();
builder.AddOpenAIChatCompletion("gpt-4o-mini", config["OpenAI:ApiKey"]!);
\`\`\`

> ⚡ **Try it now:** The Code Lab below has runnable starter code. Click **Run** (or press **AI: Run**) to simulate execution.`,

  'sk-lab-2': `## Lab 2: Create a Prompt Function

Prompt functions are the AI brain of your SK app — prompt templates promoted to first-class, typed, reusable functions.

---

## Define the Template

\`\`\`csharp
string prompt = """
    You are a helpful code reviewer.

    Review this code and give:
    1. A score out of 10 for readability
    2. One concrete improvement suggestion

    Code: {{$code}}
    Language: {{$language}}
    """;

var reviewFunc = kernel.CreateFunctionFromPrompt(prompt);
\`\`\`

---

## Invoke It

\`\`\`csharp
var result = await kernel.InvokeAsync(reviewFunc, new KernelArguments {
    ["code"]     = "for(int i=0;i<list.Count;i++){Console.WriteLine(list[i]);}",
    ["language"] = "C#"
});
Console.WriteLine(result);
\`\`\`

---

## Control Quality with Execution Settings

\`\`\`csharp
var settings = new OpenAIPromptExecutionSettings {
    Temperature = 0.1,   // Low = consistent, factual
    MaxTokens   = 400,
};

var func = kernel.CreateFunctionFromPrompt(
    prompt,
    new PromptTemplateConfig {
        ExecutionSettings = { ["default"] = settings }
    }
);
\`\`\`

---

## Temperature Quick Reference

| Task Type | Recommended Temperature |
|-----------|------------------------|
| Code review, summaries | 0.1 – 0.3 |
| Explanations, Q&A | 0.4 – 0.6 |
| Creative writing, brainstorming | 0.7 – 0.9 |

> 💡 The Code Lab has a full working Lab 2 example ready to run. Click the **Code Lab** below!`,

  'sk-lab-3': `## Lab 3: Invoke & Compose Functions

Function composition is one of SK's superpowers — chaining function outputs as inputs to other functions creates sophisticated AI pipelines.

---

## Single Function Invocation

\`\`\`csharp
var result = await kernel.InvokeAsync(myFunction, new KernelArguments {
    ["input"] = "Hello, world!"
});
Console.WriteLine(result.GetValue<string>());
\`\`\`

---

## Multi-Step Pipeline (Manual Composition)

\`\`\`csharp
var summarize  = kernel.CreateFunctionFromPrompt("Summarize in one sentence: {{$input}}");
var translate  = kernel.CreateFunctionFromPrompt("Translate to French: {{$input}}");
var addEmoji   = kernel.CreateFunctionFromPrompt("Add a relevant emoji at the start: {{$input}}");

string original = "Semantic Kernel simplifies AI application development for .NET developers.";

// Step 1: Summarize
var summary    = await kernel.InvokeAsync(summarize, new() { ["input"] = original });
// Step 2: Translate
var french     = await kernel.InvokeAsync(translate, new() { ["input"] = summary.ToString() });
// Step 3: Add emoji
var withEmoji  = await kernel.InvokeAsync(addEmoji,  new() { ["input"] = french.ToString() });

Console.WriteLine(withEmoji);
// → 🤖 Semantic Kernel simplifie le développement d'applications IA.
\`\`\`

---

## Inline Prompt (Quickest Option)

\`\`\`csharp
// No need to create a function first — invoke directly
var result = await kernel.InvokePromptAsync(
    "List 3 benefits of microservices architecture");
\`\`\`

> 💡 For complex auto-chaining (AI decides the order), use Planner with \`AutoInvokeKernelFunctions\` — covered in Core Concepts.`,

  'sk-lab-4': `## Lab 4: Add Memory to the Kernel

Memory transforms your SK app from **stateless** to **context-aware** — the foundation of RAG (Retrieval-Augmented Generation).

---

## Setup Memory

\`\`\`csharp
using Microsoft.SemanticKernel.Memory;

var builder = Kernel.CreateBuilder();
builder.AddOpenAIChatCompletion("gpt-4o-mini", apiKey);
builder.AddOpenAITextEmbeddingGeneration("text-embedding-ada-002", apiKey);
var kernel = builder.Build();

// VolatileMemoryStore = in-memory (replace with Qdrant for production)
var memory = new SemanticTextMemory(
    new VolatileMemoryStore(),
    kernel.GetRequiredService<ITextEmbeddingGenerationService>()
);
\`\`\`

---

## Save Facts

\`\`\`csharp
const string COLLECTION = "company-faq";

await memory.SaveInformationAsync(COLLECTION, id: "q1",
    text: "Our product supports Windows, Mac, and Linux.");
await memory.SaveInformationAsync(COLLECTION, id: "q2",
    text: "The free tier allows 3 projects and 1 GB storage.");
await memory.SaveInformationAsync(COLLECTION, id: "q3",
    text: "24/7 support is available on Pro and Enterprise plans.");
\`\`\`

---

## RAG Pattern — Search Then Generate

\`\`\`csharp
string question = "Do you support Linux?";

// 1. Find relevant facts via semantic search
var memories = memory.SearchAsync(COLLECTION, question, limit: 2);
var context  = "";
await foreach (var m in memories) { context += $"- {m.Metadata.Text}\n"; }

// 2. Generate grounded answer using retrieved context
var answer = await kernel.InvokePromptAsync($"""
    Answer using ONLY this information. Say "I don't know" if it's not covered.
    Information: {context}
    Question: {question}
    """);
Console.WriteLine(answer);
// → "Yes, our product supports Linux along with Windows and Mac."
\`\`\`

> 💡 This **RAG pattern** is the foundation of AI apps that answer from your own data — documents, databases, policies, anything.`,

  'sk-lab-5': `## Lab 5: Build an AI Assistant

This final lab combines plugins, memory, and auto function calling into a complete, working AI assistant.

---

## Define Plugins

\`\`\`csharp
public class WeatherPlugin {
    [KernelFunction("get_weather")]
    [Description("Returns current weather for a city")]
    public string GetWeather(string city) => $"Sunny, 22°C in {city}";
}

public class GreetingPlugin {
    [KernelFunction("greet")]
    [Description("Returns a time-appropriate greeting")]
    public string GetGreeting() {
        var h = DateTime.Now.Hour;
        return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    }
}
\`\`\`

---

## Build the Assistant

\`\`\`csharp
var kernel = Kernel.CreateBuilder()
    .AddOpenAIChatCompletion("gpt-4o-mini", apiKey)
    .Build();

kernel.Plugins.AddFromType<WeatherPlugin>();
kernel.Plugins.AddFromType<GreetingPlugin>();

var settings = new OpenAIPromptExecutionSettings {
    ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
};
\`\`\`

---

## Multi-Turn Conversation

\`\`\`csharp
var history = new ChatHistory("You are a friendly travel assistant.");
var chat    = kernel.GetRequiredService<IChatCompletionService>();

async Task TalkAsync(string msg) {
    history.AddUserMessage(msg);
    var reply = await chat.GetChatMessageContentAsync(history, settings, kernel);
    history.AddAssistantMessage(reply.Content!);
    Console.WriteLine($"Assistant: {reply.Content}");
}

await TalkAsync("Good morning! What's the weather in Paris?");
await TalkAsync("Should I pack light clothes for Paris?");
// AI calls WeatherPlugin automatically, remembers Paris context
\`\`\`

> 🎉 **Congratulations!** You've built a complete SK AI assistant with plugins, auto function calling, and multi-turn conversation history.`,

  'sk-adv-1': `## Real-World Use Cases

Semantic Kernel powers production AI applications at Microsoft and across enterprise customers worldwide.

---

## Pattern 1: RAG — Question Answering from Your Data

Give AI grounded knowledge from *your* documents, policies, databases.

\`\`\`
User asks → Search vector DB for relevant docs → AI answers using those docs
\`\`\`

**Used in:** Customer support bots, legal Q&A, internal knowledge bases, HR policy assistants

---

## Pattern 2: AI Copilot

Add AI assistance to an existing .NET application — code completion, email drafting, data analysis.

\`\`\`csharp
// E.g: "Analyse this sales data and recommend 3 actions"
var result = await kernel.InvokePromptAsync(
    $"Analyse Q1 revenue and give 3 specific recommendations:\n{csvData}");
\`\`\`

**Used in:** Developer tools, CRM systems, finance dashboards, legal document review

---

## Pattern 3: AI Agent

Autonomous agent that plans and executes multi-step tasks without step-by-step instructions.

\`\`\`
User: "Research competitor pricing and draft a comparison report"
Agent: Search web → Extract data → Analyse → Write report → Done
\`\`\`

**Used in:** Market research automation, DevOps bots, procurement systems

---

## Microsoft Products Built with SK

- **Microsoft 365 Copilot** — powered by SK orchestration
- **GitHub Copilot** — architecture strongly influenced by SK patterns
- **Azure AI Studio** — uses SK under the hood
- **Bing Chat** (early versions)

---

## Production Checklist

- [ ] Replace \`VolatileMemoryStore\` with Qdrant / pgvector / Azure AI Search
- [ ] Add SK telemetry hooks (\`ILogger\` + \`DiagnosticSource\`)
- [ ] Implement Azure Content Safety filters
- [ ] Set up API key rotation and cost monitoring`,

  'sk-adv-2': `## SK vs LangChain

Both are AI orchestration frameworks. The right choice depends on your language ecosystem and design priorities.

---

## Side-by-Side Comparison

| Dimension | Semantic Kernel | LangChain |
|-----------|----------------|-----------|
| **Primary Language** | **C#**, Python, Java | **Python** (primary), TypeScript |
| **Backed By** | Microsoft | Open-source community |
| **Design Philosophy** | Enterprise-first, type-safe | Rapid prototyping, flexible |
| **Azure Integration** | Native, first-class | Good, but 3rd-party |
| **Type Safety** | Strong (C# generics, DI) | Moderate (Python typing) |
| **Plugin/Tool Ecosystem** | Growing fast | Largest ecosystem |
| **Production Readiness** | ✅ Enterprise-grade | ✅ Production-ready |
| **Learning Curve** | Moderate (.NET devs familiar) | Moderate (Python devs familiar) |

---

## Choose Semantic Kernel When

- You are in a **C# / .NET** codebase
- You need **native Azure OpenAI** integration
- Building **enterprise apps** where type safety and DI matter
- Your team knows .NET better than Python
- You want **Microsoft support and roadmap**

---

## Choose LangChain When

- You are in a **Python** ecosystem
- Rapid prototyping speed matters over strict typing
- You need the **widest third-party tool ecosystem** right now
- Your team comes from the Python data science / ML world

---

## They Can Coexist

Many teams use SK for the .NET backend service and LangChain for Python ML pipelines — both integrating with the same vector DB and AI APIs.

> 💡 For .NET developers: SK is the natural choice. For Python-first teams: start with LangChain. Both are production-ready and actively maintained.`,

  'sk-adv-3': `## SK vs Plain OpenAI SDK

When does the extra orchestration layer from SK pay off vs using the raw SDK?

---

## What the Raw OpenAI SDK Gives You

\`\`\`csharp
// Azure.AI.OpenAI — direct SDK call
var client = new OpenAIClient(new Uri(endpoint), new AzureKeyCredential(key));
var response = await client.GetChatCompletionsAsync(
    new ChatCompletionsOptions("gpt-4", new[] {
        new ChatRequestSystemMessage("You are helpful."),
        new ChatRequestUserMessage("What is C#?")
    }));
Console.WriteLine(response.Value.Choices[0].Message.Content);
\`\`\`

Direct, minimal, no extra abstractions.

---

## What You Build Yourself Without SK

When your app grows beyond simple prompts, you'll need to write custom code for:

- Prompt template management and versioning
- Response parsing (different format per model/provider)
- Retry logic and automatic provider failover
- Memory / context management
- Function/tool calling orchestration
- Streaming response handling
- Rate limiting and cost tracking

---

## What SK Adds

| Feature | Raw SDK | Semantic Kernel |
|---------|---------|----------------|
| Prompt templates | Manual string formatting | Typed \`{{$variable}}\` templates |
| Plugins / Tools | Custom dispatch code | \`[KernelFunction]\` + auto-calling |
| Memory / RAG | Build it yourself | Built-in semantic memory |
| Provider swap | Rewrite integration | Change 1 builder line |
| Filters / hooks | Manual middleware | Built-in pipeline hooks |

---

## Decision Guide

| Use Raw SDK | Use Semantic Kernel |
|-------------|---------------------|
| Simple, one-shot AI calls | Multiple AI features in one app |
| Exploring new model capabilities | Production app with team and maintenance |
| ns-level performance critical | Developer productivity matters more |
| Minimal abstraction preferred | Need plugins, memory, or auto-planning |

> **Rule of thumb:** Start with raw SDK for experiments. Reach for SK the moment you need the second AI feature — usually memory or tool use.`,
};
