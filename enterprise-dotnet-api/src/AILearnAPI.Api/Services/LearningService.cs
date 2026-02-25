using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using AILearnAPI.Api.Models.DTOs;

namespace AILearnAPI.Api.Services;

public class LearningService : ILearningService
{
    private readonly IOllamaService _ollamaService;
    private readonly ILogger<LearningService> _logger;

    public LearningService(IOllamaService ollamaService, ILogger<LearningService> logger)
    {
        _ollamaService = ollamaService;
        _logger = logger;
    }

    public async Task<LearnResponseDto> GenerateLearningContentAsync(
        LearnRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var prompt = BuildPrompt(request);

            _logger.LogInformation("Generating learning content for topic: {Topic}", request.Topic);

            var ollamaResponse = await _ollamaService.GenerateAsync(prompt, cancellationToken);

            var parsedResponse = ParseResponse(ollamaResponse.Response, request);

            parsedResponse.Topic = request.Topic;
            parsedResponse.ExamCode = request.ExamCode;
            parsedResponse.TokensUsed = ollamaResponse.Eval_count;
            parsedResponse.GenerationTimeSeconds = stopwatch.Elapsed.TotalSeconds;

            _logger.LogInformation(
                "Learning content generated successfully. Tokens: {Tokens}, Time: {Time}s",
                parsedResponse.TokensUsed,
                parsedResponse.GenerationTimeSeconds);

            return parsedResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating learning content for topic: {Topic}", request.Topic);
            throw;
        }
        finally
        {
            stopwatch.Stop();
        }
    }

    private string BuildPrompt(LearnRequestDto request)
    {
        var promptBuilder = new System.Text.StringBuilder();

        promptBuilder.AppendLine($"You are an expert Azure certification instructor preparing students for the {request.ExamCode} exam.");
        promptBuilder.AppendLine($"\nTopic: {request.Topic}");
        promptBuilder.AppendLine("\nProvide a comprehensive learning module with the following structure:");
        promptBuilder.AppendLine("\n## EXPLANATION");
        promptBuilder.AppendLine("Provide a clear, detailed explanation of this topic as it relates to the Azure certification exam.");
        promptBuilder.AppendLine("\n## KEY POINTS");
        promptBuilder.AppendLine("List 5-7 key points that students must remember for the exam. Format as bullet points starting with '-'.");

        if (request.IncludeExamples)
        {
            promptBuilder.AppendLine($"\n## EXAMPLES ({request.MaxExamples ?? 3} examples)");
            promptBuilder.AppendLine("Provide practical examples with Azure-specific code or configurations.");
            promptBuilder.AppendLine("Format each example as:");
            promptBuilder.AppendLine("### Example N: [Title]");
            promptBuilder.AppendLine("[Description]");
            promptBuilder.AppendLine("```");
            promptBuilder.AppendLine("[Code or configuration]");
            promptBuilder.AppendLine("```");
        }

        if (request.IncludePracticeQuestions)
        {
            promptBuilder.AppendLine($"\n## PRACTICE QUESTIONS ({request.MaxQuestions ?? 5} questions)");
            promptBuilder.AppendLine("Create exam-style multiple-choice questions.");
            promptBuilder.AppendLine("Format each question as:");
            promptBuilder.AppendLine("Q[N]: [Question text]");
            promptBuilder.AppendLine("A) [Option 1]");
            promptBuilder.AppendLine("B) [Option 2]");
            promptBuilder.AppendLine("C) [Option 3]");
            promptBuilder.AppendLine("D) [Option 4]");
            promptBuilder.AppendLine("Answer: [A/B/C/D]");
            promptBuilder.AppendLine("Explanation: [Why this is correct]");
        }

        promptBuilder.AppendLine("\nMake the content exam-focused, practical, and Azure-specific.");

        return promptBuilder.ToString();
    }

    private LearnResponseDto ParseResponse(string response, LearnRequestDto request)
    {
        var result = new LearnResponseDto();

        try
        {
            // Extract explanation
            var explanationMatch = Regex.Match(response, @"## EXPLANATION\s+(.*?)(?=## |$)", RegexOptions.Singleline);
            if (explanationMatch.Success)
            {
                result.Explanation = explanationMatch.Groups[1].Value.Trim();
            }

            // Extract key points
            var keyPointsMatch = Regex.Match(response, @"## KEY POINTS\s+(.*?)(?=## |$)", RegexOptions.Singleline);
            if (keyPointsMatch.Success)
            {
                var keyPointsText = keyPointsMatch.Groups[1].Value;
                var points = Regex.Matches(keyPointsText, @"[-•]\s*(.+?)(?=\n[-•]|\n\n|$)", RegexOptions.Singleline);
                result.KeyPoints = points.Select(m => m.Groups[1].Value.Trim()).ToList();
            }

            // Extract examples
            if (request.IncludeExamples)
            {
                var examplesSection = Regex.Match(response, @"## EXAMPLES.*?\n(.*?)(?=## |$)", RegexOptions.Singleline);
                if (examplesSection.Success)
                {
                    var examplesText = examplesSection.Groups[1].Value;
                    var exampleMatches = Regex.Matches(examplesText, @"### Example \d+:\s*(.+?)\n(.*?)```(.*?)```", RegexOptions.Singleline);
                    
                    foreach (Match match in exampleMatches)
                    {
                        result.Examples.Add(new ExampleDto
                        {
                            Title = match.Groups[1].Value.Trim(),
                            Description = match.Groups[2].Value.Trim(),
                            Code = match.Groups[3].Value.Trim()
                        });
                    }
                }
            }

            // Extract practice questions
            if (request.IncludePracticeQuestions)
            {
                var questionsSection = Regex.Match(response, @"## PRACTICE QUESTIONS.*?\n(.*?)$", RegexOptions.Singleline);
                if (questionsSection.Success)
                {
                    var questionsText = questionsSection.Groups[1].Value;
                    var questionBlocks = Regex.Split(questionsText, @"Q\d+:");

                    foreach (var block in questionBlocks.Skip(1))
                    {
                        var questionMatch = Regex.Match(block, @"^(.*?)(?=A\))", RegexOptions.Singleline);
                        var optionsMatches = Regex.Matches(block, @"([A-D])\)\s*(.+?)(?=[A-D]\)|Answer:|$)", RegexOptions.Singleline);
                        var answerMatch = Regex.Match(block, @"Answer:\s*([A-D])");
                        var questionExplanationMatch = Regex.Match(block, @"Explanation:\s*(.+?)(?=Q\d+:|$)", RegexOptions.Singleline);

                        if (questionMatch.Success && optionsMatches.Count > 0)
                        {
                            var question = new PracticeQuestionDto
                            {
                                Question = questionMatch.Groups[1].Value.Trim(),
                                Options = optionsMatches.Select(m => m.Groups[2].Value.Trim()).ToList(),
                                CorrectAnswerIndex = answerMatch.Success ? answerMatch.Groups[1].Value[0] - 'A' : 0,
                                Explanation = questionExplanationMatch.Success ? questionExplanationMatch.Groups[1].Value.Trim() : ""
                            };

                            result.PracticeQuestions.Add(question);
                        }
                    }
                }
            }

            // Fallback if parsing failed
            if (string.IsNullOrEmpty(result.Explanation))
            {
                result.Explanation = response;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error parsing response, returning raw content");
            result.Explanation = response;
        }

        return result;
    }
}
