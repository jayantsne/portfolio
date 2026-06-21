namespace AILearnAPI.Application.Interfaces;

public interface IFlowAiProvider
{
    Task<string> GenerateAsync(string prompt, CancellationToken cancellationToken);
}