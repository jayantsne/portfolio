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

    First classify the topic:
    - Use learningMode = "flow" only when the topic is a real sequence over time, such as lifecycle, login, request pipeline, event loop, build pipeline, state transition, or how a request travels.
    - Use learningMode = "concept" when the topic is a principle, pattern, architecture idea, OOP concept, SOLID, DI lifetime, design pattern, or comparison. Do not force these into a fake timeline.

    Return only valid JSON. No markdown. No comments.

    JSON schema:
    {
      "title": "string",
      "summary": "one sentence under 30 words",
      "learningMode": "flow or concept",
      "mentalModel": "simple analogy or mental model under 35 words",
      "codeLanguage": "string",
      "code": ["small practical code lines"],
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
          "codeLine": 0
        }
      ],
      "edges": [
        {
          "source": "step-id",
          "target": "step-id"
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
