using AILearnAPI.Api.Repositories;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Infrastructure.Persistence;
using AILearnAPI.Infrastructure.Repositories;
using MongoDB.Driver;

namespace AILearnAPI.Api.Configuration;

public static class PersistenceServiceCollectionExtensions
{
    public static IServiceCollection AddPersistence(
        this IServiceCollection services,
        IConfiguration configuration,
        ISecretProvider secrets)
    {
        var mongoSettings = new MongoDbSettings
        {
            ConnectionString = secrets.GetRequired("ConnectionStrings:MongoDB"),
            DatabaseName = configuration["MongoDB:DatabaseName"] ?? "jayant-portfolio",
            RequireTls = configuration.GetValue("MongoDB:RequireTls", true),
            AllowInvalidCertificates = configuration.GetValue("MongoDB:AllowInvalidCertificates", false),
            AllowInvalidHostnames = configuration.GetValue("MongoDB:AllowInvalidHostnames", false)
        };

        services.Configure<MongoDbSettings>(options =>
        {
            options.ConnectionString = mongoSettings.ConnectionString;
            options.DatabaseName = mongoSettings.DatabaseName;
            options.RequireTls = mongoSettings.RequireTls;
            options.AllowInvalidCertificates = mongoSettings.AllowInvalidCertificates;
            options.AllowInvalidHostnames = mongoSettings.AllowInvalidHostnames;
        });

        services.AddSingleton<IMongoClient>(_ => MongoDbContext.CreateClient(mongoSettings));
        services.AddSingleton(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(mongoSettings.DatabaseName));

        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<IUserProgressRepository, UserProgressRepository>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IAIQARepository, AIQARepository>();
        services.AddScoped<IAiTopicPromptRepository, AiTopicPromptRepository>();
        services.AddScoped<IUserConfigRepository, UserConfigRepository>();
        services.AddScoped<IMasterConfigRepository, MasterConfigRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<ILlmProviderRepository, LlmProviderRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IInterviewRoadmapRepository, InterviewRoadmapRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddScoped<IRevisionRepository, RevisionRepository>();
        services.AddScoped<IUserMemoryRepository, UserMemoryRepository>();

        return services;
    }
}
