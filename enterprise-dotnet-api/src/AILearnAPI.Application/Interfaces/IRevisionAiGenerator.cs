namespace AILearnAPI.Application.Interfaces
{
    /// <summary>
    /// Thin abstraction over the underlying LLM provider.
    /// Keeps the Application layer decoupled from infrastructure-level Ollama details.
    /// Implemented in the API project using IOllamaService.
    /// </summary>
    public interface IRevisionAiGenerator
    {
        /// <summary>
        /// Sends a prompt to the configured LLM at low temperature for structured output.
        /// Returns the raw response text.
        /// </summary>
        Task<string> GenerateAsync(string prompt, CancellationToken ct = default);
    }
}
