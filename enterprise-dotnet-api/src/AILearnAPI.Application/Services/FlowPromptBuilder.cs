using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.FlowGenerator;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AILearnAPI.Application.Services
{
    public class FlowPromptBuilder : IFlowPromptBuilder
    {
        public string BuildPrompt(GenerateFlowRequest request)
        {
            return $$"""
    You are an expert technical mentor designing a product-quality visual learning artifact.

    Topic: {{request.Concept}}
    Audience: {{request.Audience}}
    Requested shape hint: {{request.FlowType}}
    Animation style: {{request.AnimationStyle}}

    First reason privately about the topic, then classify its learning mode and best visual grammar. Do not expose chain-of-thought; return only the resulting visual plan.
    - visualization.type must be one of: tree, cycle, pipeline, network, layers, timeline, comparison, journey.
    - Choose tree for hierarchical structures such as B-tree/B+ tree indexes, DOM trees, inheritance trees, tries, file systems, and organization hierarchies.
    - Choose cycle for genuinely recurring behavior such as lifecycle checks, event loops, retry loops, or feedback cycles.
    - Choose pipeline for ordered transformation of data or requests.
    - Choose network for architecture, services, dependencies, protocols, and many-to-many relationships.
    - Choose layers for anatomy, stacks, memory, encapsulation, and concepts best understood by zooming inward.
    - Choose comparison for versus/trade-off questions and timeline for chronological topics. Otherwise choose journey.
    - The selected visual must explain the real structure, not decorate a list of steps.

    Then classify the learning mode:
    - Use learningMode = "flow" only when the topic is a real sequence over time, such as lifecycle, login, request pipeline, event loop, build pipeline, state transition, or how a request travels.
    - Use learningMode = "concept" when the topic is a principle, pattern, architecture idea, OOP concept, SOLID, DI lifetime, design pattern, or comparison. Do not force these into a fake timeline.

    Return only valid JSON. No markdown. No comments.

    JSON schema:
    {
      "title": "string",
      "summary": "one sentence under 30 words",
      "learningMode": "flow or concept",
      "mentalModel": "simple analogy or mental model under 35 words",
      "visualization": {
        "type": "tree | cycle | pipeline | network | layers | timeline | comparison | journey",
        "rationale": "why this visual grammar best explains this topic",
        "primaryMetaphor": "short learner-friendly visual metaphor",
        "direction": "horizontal | vertical | radial",
        "animationNarrative": "what moves, expands, splits, merges, or changes during play",
        "phases": ["2 to 5 topic-specific phase names"]
      },
      "codeLanguage": "",
      "code": [],
      "steps": [
        {
          "id": "kebab-case-id",
          "label": "short readable label",
          "description": "what it means or what happens",
          "whyItMatters": "why this matters in real projects",
          "trigger": "what starts this step",
          "input": "what data/state enters this step",
          "internalWork": "what work happens inside this step",
          "output": "what changes after this step",
          "example": "concrete .NET/Angular/interview example",
          "antiPattern": "common mistake or wrong mental model",
          "interviewAnswer": "answer this point in interview language",
          "nodeKind": "root | branch | leaf | stage | actor | layer | option | event | step",
          "parentId": "parent step id for trees/layers, otherwise empty",
          "group": "meaningful visual group or phase",
          "depth": 0,
          "visualItems": ["short values or objects visibly contained in this node"],
          "codeLine": null
        }
      ],
      "edges": [
        {
          "source": "step-id",
          "target": "step-id",
          "relationship": "contains | flows-to | calls | depends-on | compares-with | transitions-to",
          "label": "short relationship label when useful"
        }
      ],
      "revisionTips": [
        {
          "title": "short title",
          "detail": "interview-focused revision point"
        }
      ]
    }

    Content rules:
    - This feature teaches visually. Do not return source code or turn the answer into a written code explanation. Keep codeLanguage empty, code empty, and every codeLine null.
    - Do not represent a concept as a collection of explanation cards. The steps are visual objects in the chosen diagram: pages in a tree, actors in a network, layers in an anatomy, options in a comparison, or stages in a pipeline.
    - For design patterns, nodes MUST be pattern participants or runtime objects, never definition cards. Strategy: Context -> Strategy interface -> concrete strategies. Observer: Subject -> multiple observers. Decorator: client -> nested decorators -> component. Factory: creator -> multiple concrete products. State: context -> states and transitions. Animate messages, object creation, delegation, state change, or wrapping—whichever is intrinsic to that pattern.
    - For a B-tree/B+ tree or clustered-index topic, steps MUST be physical tree pages, never actions or explanations. Do not create nodes named Searching, Finding, Page Split Occurrence, Data Retrieval, or similar verbs.
    - A tree MUST visibly branch. Return at least 7 page nodes: exactly one root page, at least two intermediate/branch pages, and at least four leaf pages. At least one parent must have two or more children.
    - Use page labels such as Root page, Branch page < 50, Branch page >= 50, Leaf page 1-20. Put realistic ordered separator keys in root/branch visualItems and ordered clustered rows or key ranges in leaf visualItems.
    - Set parentId and depth on every non-root page and add parent-to-child edges. The searched-key path is expressed through descriptions and animationNarrative, not by creating action nodes.
    - For clustered indexes, leaf visualItems represent actual ordered data rows/pages. Show the result of a page split as two sibling leaf pages under the same parent, and explain why nonclustered indexes point to the clustering key.
    - Make node labels and visualItems specific to the topic. Never return generic labels such as Step 1, Process, Box, or Item.
    - animationNarrative must describe a concept-specific animation, not generic node highlighting.
    - For learningMode "flow": create 5 to 9 ordered steps, include edges, and explain exactly how the thing works internally.
    - For architecture, authentication, request/response, controller-service-provider, or system design workflows, prefer a directed graph shape with branches when the real system branches. Example: UI -> API controller -> service -> prompt builder / AI provider / validator -> response -> UI.
    - Do not force every flow into a single straight line if the real workflow has fan-out, fan-in, callbacks, or a return path.
    - Keep edges as a directed acyclic graph for rendering. Represent the return path as a final response step instead of a cycle back to the first node.
    - For each flow step, trigger/input/internalWork/output must be specific and non-empty. Avoid generic text like "the process continues".
    - For learningMode "concept": create 4 to 7 concept cards, use edges only when a real dependency exists, and explain meaning, usage, example, mistake, and interview answer for each card.
    - For SOLID specifically, each card must be one principle: SRP, OCP, LSP, ISP, DIP. Do not call it a flow.
    - Step ids must be unique.
    - Every edge source and target must match a step id.
    - codeLine is zero-based and may be null.
    - Each revision tip must help with interview preparation.
    - Prefer practical .NET examples when the topic mentions .NET, C#, ASP.NET, SOLID, or dependency injection.
    """;
        }

        public string BuildStepExplanationPrompt(ExplainFlowStepRequest request)
        {
            return $$"""
    You are an expert technical mentor. Explain one selected item from a visual learning artifact.

    Topic: {{request.Concept}}
    Learning mode: {{request.LearningMode}}
    Selected item: {{request.StepLabel}}
    Existing description: {{request.StepDescription}}
    Audience: {{request.Audience}}
    Code language: {{request.CodeLanguage}}
    Related code line: {{request.CodeLine}}

    Return only valid JSON. No markdown. No comments.

    JSON schema:
    {
      "plainEnglish": "explain this like a strong mentor in 2-3 sentences",
      "howItWorks": "deep technical explanation of what happens internally",
      "realExample": "concrete practical example from Angular, .NET, auth, or system design depending on topic",
      "commonMistake": "common misunderstanding or bug related to this item",
      "interviewAnswer": "polished answer the user can say in an interview"
    }

    Rules:
    - Be specific to the selected item. Do not repeat generic topic definitions.
    - If learningMode is "flow", explain trigger, state/data movement, internal work, and next effect.
    - If learningMode is "concept", explain meaning, design tradeoff, when to apply it, and when not to overuse it.
    - Keep each field useful and concise, but deep enough for interview revision.
    """;
        }
    }
}
