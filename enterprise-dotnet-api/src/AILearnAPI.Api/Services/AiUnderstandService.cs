using System.Diagnostics;
using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Api.Repositories;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.Services;

/// <summary>
/// Service implementation for AI understanding feature
/// Orchestrates prompt retrieval from DB and AI generation via Ollama
/// </summary>
public class AiUnderstandService : IAiUnderstandService
{
    private readonly IAiTopicPromptRepository _promptRepository;
    private readonly IOllamaService _ollamaService;
    private readonly IMasterConfigService _masterConfig;
    private readonly ILogger<AiUnderstandService> _logger;

    public AiUnderstandService(
        IAiTopicPromptRepository promptRepository,
        IOllamaService ollamaService,
        IMasterConfigService masterConfig,
        ILogger<AiUnderstandService> logger)
    {
        _promptRepository = promptRepository;
        _ollamaService    = ollamaService;
        _masterConfig     = masterConfig;
        _logger           = logger;
    }

    public async Task<UnderstandResponseDto> GenerateUnderstandingAsync(
        UnderstandRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Fetch AI config from DB (model, temperature, max tokens, system prompt)
            var cfg = await _masterConfig.GetAsync();

            _logger.LogInformation(
                "Generating understanding for topic '{TopicName}' and exam '{ExamCode}'",
                request.TopicName, request.ExamCode);

            // 1. Fetch prompt template from database
            var promptTemplate = await _promptRepository.GetByTopicAndExamAsync(
                request.TopicName,
                request.ExamCode);

            if (promptTemplate == null)
            {
                // Fallback to generic prompt if no DB record found
                _logger.LogWarning(
                    "No prompt template found for '{TopicName}' and '{ExamCode}'. Using fallback.",
                    request.TopicName, request.ExamCode);

                return new UnderstandResponseDto
                {
                    TopicName = request.TopicName,
                    ExamCode = request.ExamCode,
                    Explanation = await GenerateFallbackExplanationAsync(request, cfg, cancellationToken),
                    PromptFound = false,
                    ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                    Timestamp = DateTime.UtcNow
                };
            }

            // 2. Replace {TopicName} placeholder in template
            var finalPrompt = promptTemplate.PromptTemplate.Replace("{TopicName}", request.TopicName);

            _logger.LogInformation(
                "Using prompt template ID {PromptId} for topic '{TopicName}'",
                promptTemplate.Id, request.TopicName);

            // 3. Call Ollama using DB-driven settings (model, temperature, max tokens)
            var ollamaResponse = await _ollamaService.GenerateAsync(
                finalPrompt,
                model:       cfg.modelOllamaStream,
                temperature: (float)cfg.defaultTemperature,
                maxTokens:   cfg.maxOutputTokens > 0 ? cfg.maxOutputTokens : 1500,
                cancellationToken);

            stopwatch.Stop();

            _logger.LogInformation(
                "Successfully generated understanding for '{TopicName}' in {ElapsedMs}ms",
                request.TopicName, stopwatch.ElapsedMilliseconds);

            // 4. Return structured response
            return new UnderstandResponseDto
            {
                TopicName = request.TopicName,
                ExamCode = request.ExamCode,
                Explanation = ollamaResponse.Response,
                PromptFound = true,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                TokensUsed = ollamaResponse.Eval_count,
                Timestamp = DateTime.UtcNow
            };
        }
        catch (TimeoutException ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Timeout generating understanding for '{TopicName}'", request.TopicName);
            throw new InvalidOperationException(
                $"AI service timed out while generating explanation. Please try again.", ex);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error generating understanding for '{TopicName}'", request.TopicName);
            throw new InvalidOperationException(
                $"Failed to generate understanding: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Generates a fallback explanation when no prompt template exists in database
    /// </summary>
    private async Task<string> GenerateFallbackExplanationAsync(
        UnderstandRequestDto request,
        MasterConfigDto cfg,
        CancellationToken cancellationToken)
    {
        // Build fallback prompt using DB system prompt + format instruction
        var systemInstruction = !string.IsNullOrWhiteSpace(cfg.defaultSystemPrompt)
            ? cfg.defaultSystemPrompt
            : $"You are an Azure {request.ExamCode} expert trainer.";

        var formatGuidance = !string.IsNullOrWhiteSpace(cfg.formatInstruction)
            ? cfg.formatInstruction
            : string.Empty;

        var fallbackPrompt = $"""
            {systemInstruction}
            Explain "{request.TopicName}" in a clear, beginner-friendly way suitable for {request.ExamCode} certification exam preparation.

            ## 📚 Simple Explanation
            [Provide a concise 2-3 sentence explanation using analogies]

            ## 🏗️ Key Concepts
            [List 5-7 important concepts or components]

            ## ☁️ Real-World Azure Example
            [Provide a practical implementation scenario with steps]

            ## 🎯 Exam Tips
            [List critical points that appear in {request.ExamCode} exam]

            ## ⚠️ Common Mistakes
            [List 3-4 common mistakes to avoid]

            ## 📝 Practice Questions
            [Provide 3 scenario-based multiple choice questions with answers and explanations]

            Keep it focused, clear, and exam-oriented.{formatGuidance}
            """;

        try
        {
            var response = await _ollamaService.GenerateAsync(
                fallbackPrompt,
                model:       cfg.modelOllamaStream,
                temperature: (float)cfg.defaultTemperature,
                maxTokens:   cfg.maxOutputTokens > 0 ? cfg.maxOutputTokens : 1500,
                cancellationToken);
            return response.Response;
        }
        catch
        {
            // Ultimate fallback if even generic prompt fails
            return $@"# {request.TopicName}

## Overview
{request.TopicName} is an important topic for the {request.ExamCode} certification exam.

To get detailed AI-generated explanations, please ensure:
1. The Ollama service is running
2. The database connection is configured
3. Prompt templates are seeded in the database

You can add a prompt template for this topic in the AiTopicPrompts table.

For immediate help, please refer to Microsoft Learn documentation for {request.ExamCode}.";
        }
    }
}
