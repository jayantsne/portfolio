using AILearnAPI.Api.Models.DTOs;

namespace AILearnAPI.Api.Services;

/// <summary>
/// Service interface for AI understanding feature
/// </summary>
public interface IAiUnderstandService
{
    /// <summary>
    /// Generate structured AI explanation for a specific exam topic
    /// </summary>
    /// <param name="request">Understanding request with topic and exam code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Structured explanation response</returns>
    Task<UnderstandResponseDto> GenerateUnderstandingAsync(
        UnderstandRequestDto request,
        CancellationToken cancellationToken = default);
}
