const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB Connection - Server
const MONGODB_URI = 'mongodb://jbadmin:1ZC7Lts7%2Csaeb%29Y0H4%40n@76.13.244.113:27017/jayant-portfolio?authSource=admin';

// Question Schema with Prompts
const questionSchema = new mongoose.Schema({
  id: Number,
  question: String,
  answer: String,
  category: String,
  tags: [String],
  difficulty: String,
  dateAdded: Date,
  expanded: Boolean,
  prompts: [{
    id: String,
    title: String,
    description: String,
    systemPrompt: String,
    userPromptTemplate: String,
    icon: String
  }]
});

const Question = mongoose.model('Question', questionSchema);

/**
 * Generate contextual prompts based on question category and difficulty
 * These prompts guide Claude to generate responses in a specific style
 */
function generatePromptsForQuestion(question) {
  const { category, difficulty, question: questionText, tags } = question;
  
  // Base system prompt that defines Claude's teaching style
  const baseSystemPrompt = `You are an expert technical interviewer and educator. Your goal is to help candidates deeply understand concepts in a way that's memorable, practical, and interview-ready.

YOUR TEACHING STYLE:
- Start with crystal-clear definitions
- Use creative analogies (🏗️, 🌱, 🔧, 🎯, etc.) that make complex concepts click instantly
- Break down into digestible steps
- Include real-world code examples that professionals actually use
- Highlight common mistakes with ⚠️ warnings
- Provide best practices with ✅ tips
- Make it conversational and engaging

FORMATTING:
- Use emojis to make sections memorable
- Bold key terms and concepts
- Include code blocks with syntax highlighting
- Structure with clear headers (KEY CONCEPTS:, REAL-WORLD EXAMPLE:, etc.)
- End with practical takeaways

Think of yourself as a senior developer mentoring a junior colleague - friendly, clear, and focused on real-world application.`;

  const prompts = [
    // Prompt 1: Explain Like I'm Five (ELI5)
    {
      id: 'eli5',
      title: 'Explain Simply',
      description: 'Break it down with analogies and simple examples',
      icon: '🎓',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Explain this concept using the ELI5 (Explain Like I'm Five) approach:

1. Start with a creative real-world analogy (use emojis!)
2. Explain the core concept in simple language
3. Show a beginner-friendly code example
4. List 3-4 key takeaways
5. Include one common mistake to avoid

Make it so simple that even someone with no ${category} experience can understand it!`
    },

    // Prompt 2: Interview Focused
    {
      id: 'interview',
      title: 'Interview Answer',
      description: 'Perfect answer for technical interviews',
      icon: '💼',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Provide a comprehensive interview answer that will impress any interviewer:

STRUCTURE:
1. **Definition** (15 seconds): Clear, confident opening
2. **Key Points** (30 seconds): 3-4 main concepts with emojis
3. **Real-World Example** (45 seconds): Production-level code example
4. **Best Practices** (30 seconds): What senior developers do
5. **Common Pitfalls** (20 seconds): What to avoid

Tone: Professional, confident, showing deep understanding
Length: 2-3 minutes when spoken aloud
Include: Code example that demonstrates mastery`
    },

    // Prompt 3: Deep Dive
    {
      id: 'deep-dive',
      title: 'Deep Dive',
      description: 'Comprehensive explanation with advanced details',
      icon: '🔬',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Provide an in-depth technical deep dive:

COVER:
1. **Fundamentals**: Core concepts and theory
2. **How It Works**: Under-the-hood mechanics
3. **Advanced Patterns**: Professional techniques
4. **Multiple Examples**: Beginner → Intermediate → Advanced
5. **Performance**: Optimization considerations
6. **Ecosystem**: Related concepts and tools
7. **Industry Practice**: How companies like Google/Netflix use this

Include:
- Architecture diagrams (in text/ASCII)
- Multiple code examples
- Performance benchmarks
- Links to further reading

Target: Senior developers who want complete mastery`
    },

    // Prompt 4: Compare & Contrast
    {
      id: 'compare',
      title: 'Compare Options',
      description: 'Show alternatives, pros/cons, and when to use each',
      icon: '⚖️',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Provide a comparative analysis:

FORMAT:
1. **Main Concept**: Quick overview
2. **Alternatives**: List 3-4 similar approaches/tools/patterns
3. **Comparison Table**: 
   - Pros of each
   - Cons of each
   - Performance
   - Use cases
4. **Decision Matrix**: When to choose what
5. **Real-World Scenarios**: 3 examples with recommendations
6. **Migration Path**: How to switch between options

Include code examples for each alternative.
Help readers make informed technical decisions!`
    },

    // Prompt 5: Quick Reference
    {
      id: 'quick-ref',
      title: 'Quick Reference',
      description: 'Concise cheat sheet with key points',
      icon: '⚡',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Create a quick reference guide:

1. **One-Line Summary** (tweet-length)
2. **Key Syntax** (code snippets only)
3. **Common Patterns** (3-4 most used)
4. **Quick Dos & Don'ts** (✅ vs ❌)
5. **Related Concepts** (breadcrumb trail)

Format: Bullet points, code blocks, tables
Style: Scannable, high-density information
Length: 1-2 minutes to read
Goal: Can be quickly reviewed before interviews`
    },

    // Prompt 6: Step-by-Step Tutorial
    {
      id: 'tutorial',
      title: 'Step-by-Step Guide',
      description: 'Learn by building a practical example',
      icon: '📝',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Create a hands-on tutorial:

STRUCTURE:
1. **What We'll Build**: Define the mini-project
2. **Prerequisites**: What you need to know
3. **Step-by-Step**:
   - Step 1: Setup (with code)
   - Step 2: Basic implementation (with code)
   - Step 3: Add features (with code)
   - Step 4: Handle edge cases (with code)
   - Step 5: Optimize & finalize (with code)
4. **Testing**: How to verify it works
5. **Exercises**: 3 challenges to extend it
6. **Solution Review**: Explain the final result

Each step: Explain → Code → Result
Include: Full working example users can copy-paste and run`
    },

    // Prompt 7: Visual Explanation
    {
      id: 'visual',
      title: 'Visual Explanation',
      description: 'Understand through diagrams and flow charts',
      icon: '🎨',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Provide a visual explanation:

CREATE:
1. **Architecture Diagram** (ASCII art/text):
   - Show components and relationships
   - Use boxes, arrows, flow
2. **Flow Chart**: Process step-by-step
3. **Timeline**: Order of operations
4. **State Diagram**: Different states/modes
5. **Memory Layout**: How data is structured

For each diagram:
- Draw using ASCII art (┌─┐│└┘├┤┬┴┼ ← → ↓ ↑)
- Explain what's happening
- Show code that maps to the diagram

Example Format:
┌──────────────┐
│   Component  │───→ Explanation
└──────────────┘

Goal: Make abstract concepts concrete and visible!`
    },

    // Prompt 8: Real-World Examples
    {
      id: 'real-world',
      title: 'Real-World Use Cases',
      description: 'See how companies actually use this',
      icon: '🏢',
      systemPrompt: baseSystemPrompt,
      userPromptTemplate: `Question: "${questionText}"

Category: ${category} | Difficulty: ${difficulty}

Show real-world applications:

PROVIDE:
1. **Industry Examples**:
   - How Netflix/Uber/Airbnb use this
   - Scale they operate at
   - Problems they solved
2. **3 Complete Scenarios**:
   Scenario A: E-commerce (Amazon-style)
   Scenario B: Social Media (Twitter-style)
   Scenario C: Analytics (Google Analytics-style)
   
   For each:
   - Problem statement
   - Solution with code
   - Results/benefits
3. **Production Patterns**: Battle-tested approaches
4. **Lessons Learned**: Mistakes companies made
5. **Your Chance**: How to apply this in your projects

Include: Production-quality code, not toy examples
Show: The business impact, not just technical details`
    }
  ];

  return prompts;
}

async function addPromptsToAllQuestions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📥 Fetching all questions...');
    const questions = await Question.find({}).lean();
    console.log(`📊 Found ${questions.length} questions\n`);

    let updated = 0;
    let failed = 0;

    console.log('🔄 Adding prompts to each question...\n');

    for (const question of questions) {
      try {
        const prompts = generatePromptsForQuestion(question);
        
        await Question.updateOne(
          { id: question.id },
          { $set: { prompts: prompts } }
        );

        updated++;
        if (updated % 50 === 0) {
          console.log(`   Progress: ${updated}/${questions.length} questions updated`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to update question ${question.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Update Complete!`);
    console.log(`   ✓ Updated: ${updated} questions`);
    console.log(`   ✗ Failed: ${failed} questions`);
    console.log(`   📦 Each question now has 8 specialized prompts`);

    // Show sample
    console.log('\n📝 Sample prompts for first question:');
    const sampleQuestion = await Question.findOne({ id: 1 });
    if (sampleQuestion && sampleQuestion.prompts) {
      sampleQuestion.prompts.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.icon} ${p.title}: ${p.description}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addPromptsToAllQuestions();
