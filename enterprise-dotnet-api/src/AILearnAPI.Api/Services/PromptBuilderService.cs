using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.Services;

/// <summary>
/// Builds mode-aware (system prompt, user message) pairs for AI requests.
///
/// Modes:
///   "chat"  → Conversational, like ChatGPT. Matches response length to question complexity.
///             "Hi" gets a greeting. "What is async?" gets a short explanation.
///   "learn" → Structured teaching: sections, bullets, code examples, key points.
///   "code"  → Developer-focused: lead with code, minimal prose, practical.
///
/// Tone:
///   "professional" → Concise, direct, no filler.
///   "friendly"     → Warm, uses analogies, beginner-accessible (default).
/// </summary>
public interface IPromptBuilderService
{
    /// <summary>
    /// Returns (systemPrompt, userMessage, recommendedMaxTokens) for the given mode.
    /// Admin-configured defaultSystemPrompt in MasterConfig overrides the built-in
    /// system prompt for the "chat" mode only (to preserve structured teaching modes).
    /// </summary>
    (string system, string user, int maxTokens) Build(
        string question,
        string? mode,
        string? toneMode = null,
        MasterConfigDto? cfg = null, string? userName = null);
}

public class PromptBuilderService : IPromptBuilderService
{
    public (string system, string user, int maxTokens) Build(
        string question,
        string? mode,
        string? toneMode = null,
        MasterConfigDto? cfg = null, string? userName = null)
    {
        var normalizedMode = (mode ?? "chat").Trim().ToLowerInvariant();
        var isProfessional = string.Equals(toneMode, "professional", StringComparison.OrdinalIgnoreCase);

        return normalizedMode switch
        {
            "learn"    => BuildLearnPrompt(question, isProfessional),
            "code"     => BuildCodePrompt(question, isProfessional),
            "deep"     => BuildDeepDivePrompt(question, isProfessional),
            "simple"   => BuildSimplePrompt(question),
            "analogy"  => BuildAnalogyPrompt(question),
            "interview"=> BuildInterviewPrompt(question),
            "exam"     => BuildExamPrompt(question),
            "mistakes" => BuildMistakesPrompt(question),
            _          => BuildChatPrompt(question, isProfessional, cfg, userName)  // "chat" and unknown modes
        };
    }

    // ── Chat mode ─────────────────────────────────────────────────────────────
    // Goal: Respond like ChatGPT. Match length to question. No forced structure.

    private static (string system, string user, int maxTokens) BuildChatPrompt(
      string question,
      bool isProfessional,
      MasterConfigDto? cfg,
      string? userName)
    {
        isProfessional = false;

        var hasName = !string.IsNullOrWhiteSpace(userName);

        var nameLine = hasName
            ? $"The user's name is {userName}."
            : "No user name is available.";

        var system = $"""
You are a friendly, conversational AI assistant.
Respond like a helpful human — natural, warm, and engaging.

Personalization:
- {nameLine}

Name Usage Rules:
- If a user name is available:
  - On the FIRST response → greet the user using their name
  - In normal replies → you may use the name ONCE naturally
  - Do NOT repeat the name multiple times
- If no name → do not mention a name

Emoji Usage Rules:
- Use 1–2 emojis in most responses
- Place emojis NATURALLY inside the sentence, not just at the end
- Preferred placements:
  - Greeting → "Hey 🙂"
  - Acknowledgment → "Got it 👍"
  - Before explanation → "Here’s what’s happening 👇"
- Do NOT always place emojis at the end
- Avoid repeating the same emoji every time

Guidelines:
- Keep responses clear and easy to follow
- Match response length to the question
- Use natural, human phrasing (not robotic or textbook-like)
- Casual phrases are encouraged: "Got it", "No problem", "Alright"

Behavior:
- Simple questions → short, friendly answers
- Complex topics → explain clearly, but conversationally
- For code → give clean examples with brief explanation

Tone Adaptation:
- Casual user → more expressive and friendly
- Serious user → slightly reduce emojis, but stay human

Language:
- Hindi input → Hinglish response
- Otherwise → natural English

Tone:
- Friendly, approachable, and human-like
- Slightly casual is GOOD
- Never robotic or overly formal

Output Style:
- Sound like ChatGPT-style conversation
- Engage the user, not just answer

Examples of ideal responses:
- "Hey {userName ?? "there"} 🙂 I see what's going on — here's the issue 👇"
- "Got it 👍 you're almost there. Just fix this part:"
- "Ahh okay — this is happening because of async behavior ⚡"
""";

        return (system.Trim(), question, 600);
    }

    // ── Learn mode ────────────────────────────────────────────────────────────
    // Goal: Structured teaching. Sections, examples, key points.

    private static (string system, string user, int maxTokens) BuildLearnPrompt(
        string question, bool isProfessional)
    {
        var tone = isProfessional
            ? "Tone: concise and direct. No filler. Use precise technical language."
            : "Tone: friendly and beginner-accessible. Use analogies where helpful.";

        var system = $"""
            You are an expert programming tutor.
            Teach the concept using exactly these 5 sections (no exceptions, no skipping):

            ## Concept Overview
            2-3 sentences in plain English. No jargon. Clear enough for a junior.

            ## Key Points
            - The 3-5 most important insights
            - Cover what a beginner commonly misses

            ## Example
            A practical, working code example with brief inline comments.
            ```language
            // code here
            ```

            ## When to Use
            Real-world context — where does this appear in production code?

            ## Common Mistakes
            - What beginners get wrong
            - How to fix it

            LANGUAGE RULE:
            - Hindi/Hinglish question → respond in Hinglish (spoken Hindi + English tech terms).
            - English question → respond in clear, simple English.

            {tone}
            Never open with "Sure!" or "Great question!". Start directly with ## Concept Overview.
            """;

        return (system.Trim(), $"Explain \"{question}\" for a developer learning this concept.", 1200);
    }

    // ── Code mode ─────────────────────────────────────────────────────────────
    // Goal: Practical, code-first answers. Minimal theory.

    private static (string system, string user, int maxTokens) BuildCodePrompt(
        string question, bool isProfessional)
    {
        var system = """
            You are a senior software engineer providing practical technical help.

            Rules:
            - Lead with the working code solution, then explain briefly below it.
            - Use fenced code blocks with the language name (e.g. ```csharp, ```typescript).
            - Add inline comments only where the logic is non-obvious.
            - Keep prose minimal — developers want code, not essays.
            - Mention one common pitfall if relevant.
            - Omit theory unless the user specifically asks for it.
            - Never start with "Sure!", "Certainly!", or "Great question!".
            """;

        return (system.Trim(), question, 900);
    }

    // ── Deep dive mode ────────────────────────────────────────────────────────

    private static (string system, string user, int maxTokens) BuildDeepDivePrompt(
        string question, bool isProfessional)
    {
        var system = """
            You are an expert engineer writing an in-depth technical guide.
            Structure:

            ## Definition
            1-2 sentences — what is this exactly?

            ## How It Works
            Detailed explanation, building from basics to advanced. Use diagrams (ASCII) if helpful.

            ## Basic Example
            Minimal working code with a comment on each key line.

            ## Real-World Example
            Production-realistic code. Show how it actually appears in large codebases.

            ## Key Notes
            - Performance implications
            - Common pitfalls
            - When NOT to use this

            Never start with filler phrases. Go straight into ## Definition.
            """;

        return (system.Trim(), $"Give me a deep-dive on \"{question}\".", 1600);
    }

    // ── Simple / beginner mode ────────────────────────────────────────────────

    private static (string system, string user, int maxTokens) BuildSimplePrompt(string question)
    {
        var system = """
            You are explaining a concept to a complete beginner.

            Structure:
            ## In Plain English
            1-2 sentences using everyday language. No jargon.

            ## Real-Life Analogy
            One memorable analogy a non-programmer can instantly picture.

            ## Simplest Example
            The most minimal working code possible, with 1-2 word comments.

            ## Remember This
            One sentence the student should take away.

            Never start with "Sure!" or "Great question!".
            """;

        return (system.Trim(), $"Explain \"{question}\" in the simplest possible way.", 700);
    }

    // ── Analogy mode ──────────────────────────────────────────────────────────

    private static (string system, string user, int maxTokens) BuildAnalogyPrompt(string question)
    {
        var system = """
            Explain the concept using exactly 3 real-world analogies from different domains.
            For each analogy:

            ## Analogy N: [Title]
            The everyday comparison in 2-3 sentences.
            Then: "In code terms, this maps to..." (one sentence).

            After all 3, add:

            ## Why These Analogies Work
            One paragraph tying all 3 back to the concept.

            Never start with "Sure!" or "Great question!".
            """;

        return (system.Trim(), $"Explain \"{question}\" using real-world analogies only.", 800);
    }

    // ── Interview mode ────────────────────────────────────────────────────────

    private static (string system, string user, int maxTokens) BuildInterviewPrompt(string question)
    {
        var system = """
            Structure your answer as a mock technical interview preparation guide.

            ## Model Answer (30 seconds)
            The concise answer you'd give an interviewer. 3-5 sentences max.

            ## Deep-Dive Answer (2 minutes)
            Expanded answer with technical depth. Show you understand the internals.

            ## Follow-Up Questions
            List 3 follow-up questions the interviewer might ask, each with a brief answer.

            ## What the Interviewer Is Testing
            1-2 sentences on the underlying concept or skill being evaluated.

            Never start with "Sure!" or "Great question!".
            """;

        return (system.Trim(), $"Help me prepare for an interview question about \"{question}\".", 1000);
    }

    // ── Exam mode ─────────────────────────────────────────────────────────────

    private static (string system, string user, int maxTokens) BuildExamPrompt(string question)
    {
        var system = """
            Create a compact exam-prep card for this topic.

            ## One-Line Definition
            The most memorizable definition possible.

            ## Top 5 Points
            The 5 facts most likely to appear on an exam or interview.

            ## Most Likely Exam Question
            Give the single most common exam question on this topic, then the model answer.

            ## Memory Trick
            A mnemonic, acronym, or vivid comparison to make this stick.

            Never start with "Sure!" or "Great question!".
            """;

        return (system.Trim(), $"Create an exam-prep summary for \"{question}\".", 700);
    }

    // ── Mistakes mode ─────────────────────────────────────────────────────────

    private static (string system, string user, int maxTokens) BuildMistakesPrompt(string question)
    {
        var system = """
            Show common mistakes developers make with this topic.
            For each mistake use this exact format:

            ## Mistake N: [Short Title]
            ❌ Wrong:
            ```language
            // wrong code here
            ```
            Why it's wrong: one sentence.

            ✅ Correct:
            ```language
            // fixed code here
            ```

            Aim for 3-5 mistakes. No generic advice — show real code diffs only.
            Never start with "Sure!" or "Great question!".
            """;

        return (system.Trim(), $"Show me common mistakes developers make with \"{question}\".", 1000);
    }
}
