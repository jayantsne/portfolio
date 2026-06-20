using AILearnAPI.Api.Services;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.StreamProvider
{
    public interface IChatStreamProvider
    {
        string Name { get; }

        IAsyncEnumerable<string> StreamAsync(
            ChatAiStreamRequest request,
            MasterConfigDto cfg,
            CancellationToken ct);
    }
}
