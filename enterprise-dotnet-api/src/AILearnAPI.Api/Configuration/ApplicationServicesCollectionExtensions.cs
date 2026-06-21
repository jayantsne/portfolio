using AILearnAPI.Api.Models;
using AILearnAPI.Api.Services;
using AILearnAPI.Api.StreamProvider;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Application.Services;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Infrastructure.Services;

namespace AILearnAPI.Api.Configuration;

public static class ApplicationServicesCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<OllamaSettings>(configuration.GetSection("OllamaSettings"));

        services.AddHttpClient<IOllamaService, OllamaService>();
        services.AddHttpClient("Judge0", c => c.Timeout = TimeSpan.FromSeconds(55));
        services.AddHttpClient("Razorpay", c =>
        {
            c.Timeout = TimeSpan.FromSeconds(15);
            c.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        });
        services.AddHttpClient("OpenAI", c => c.Timeout = TimeSpan.FromMinutes(5));
        services.AddHttpClient("GoogleOAuth", c => c.Timeout = TimeSpan.FromSeconds(15));

        services.AddScoped<IQuestionService, QuestionService>();
        services.AddScoped<IUserProgressService, UserProgressService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IGoogleOAuthService, GoogleOAuthService>();
        services.AddScoped<IAIQAService, AIQAService>();
        services.AddScoped<ILearningService, LearningService>();
        services.AddScoped<IAiUnderstandService, AiUnderstandService>();
        services.AddScoped<IUserConfigService, UserConfigService>();
        services.AddScoped<IMasterConfigService, MasterConfigService>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<ILlmProviderService, LlmProviderService>();
        services.AddScoped<ISubscriptionService, SubscriptionService>();
        services.AddScoped<IInterviewRoadmapService, InterviewRoadmapService>();
        services.AddScoped<IRevisionAiGenerator, RevisionAiGeneratorAdapter>();
        services.AddScoped<IRevisionService, RevisionService>();
        services.AddScoped<IChatStreamProvider, OpenAiChatStreamProvider>();
        services.AddScoped<IChatStreamProvider, OllamaChatStreamProvider>();
        services.AddScoped<IChatAiStreamingService, ChatAiStreamingService>();
        services.AddScoped<IChatService, ChatService>();
        services.AddScoped<IEmbeddingService, OpenAIEmbeddingService>();
        services.AddScoped<ISemanticMemoryService, SemanticMemoryService>();
        services.AddScoped<ICodeExecutionService, CodeExecutionService>();
        services.AddScoped<IOpenAIStreamingService, OpenAIStreamingService>();
        services.AddScoped<IDeploymentService, DeploymentService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IFlowGeneratorService, FlowGeneratorService>();
        services.AddScoped<IFlowPromptBuilder, FlowPromptBuilder>();
        services.AddScoped<IFlowResponseValidator, FlowResponseValidator>();
        services.AddHttpClient<IFlowAiProvider, FlowOpenAiProvider>(c =>
        {
            c.Timeout = TimeSpan.FromMinutes(2);
            c.DefaultRequestHeaders.Accept.Add(
                new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        });

        services.AddSingleton<PlaygroundExecutionService>();
        services.AddSingleton<IPromptBuilderService, PromptBuilderService>();
        services.AddSingleton<IDeviceDetectionService, DeviceDetectionService>();

        return services;
    }
}
