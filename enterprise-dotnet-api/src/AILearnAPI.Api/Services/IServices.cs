using AILearnAPI.Api.Models.DTOs;

namespace AILearnAPI.Api.Services;

public interface IOllamaService
{
    Task<OllamaResponseDto> GenerateAsync(string prompt, CancellationToken cancellationToken = default);
}

public interface ILearningService
{
    Task<LearnResponseDto> GenerateLearningContentAsync(LearnRequestDto request, CancellationToken cancellationToken = default);
}
