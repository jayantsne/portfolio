using MongoDB.Driver;
using StackExchange.Redis;
using AILearnAPI.Infrastructure.Persistence;
using AILearnAPI.Infrastructure.Repositories;
using AILearnAPI.Infrastructure.Services;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Application.Services;
using AILearnAPI.Api.Services;
using AILearnAPI.Api.StreamProvider;
using AILearnAPI.Api.Repositories;
using AILearnAPI.Api.Middleware;
using AILearnAPI.Api.Models;
using Polly;
using Polly.Extensions.Http;
using Serilog;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/api-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();
builder.Configuration.AddEnvironmentVariables();

var startupSecrets = new ConfigurationSecretProvider(builder.Configuration);
new StartupSecretValidator(startupSecrets, builder.Environment).Validate();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "AILearn API", 
        Version = "v1",
        Description = "Unified API for AI-powered learning, interview questions, and Azure exam preparation"
    });
    
    // API Key authentication
    c.AddSecurityDefinition("ApiKey", new()
    {
        Name = "X-API-Key",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "API Key required for authentication. Add your key in the input below.",
        Scheme = "ApiKeyScheme"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "ApiKey" }
            },
            Array.Empty<string>()
        }
    });
    
    // Include XML comments if exists
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
    
    c.EnableAnnotations(); // For Swagger annotations
});

// Configure MongoDB
var mongoConnectionString = startupSecrets.GetRequired("ConnectionStrings:MongoDB");
var mongoDatabaseName = builder.Configuration["MongoDB:DatabaseName"] ?? "jayant-portfolio";

builder.Services.Configure<MongoDbSettings>(options =>
{
    options.ConnectionString = mongoConnectionString;
    options.DatabaseName = mongoDatabaseName;
});

// Register MongoDB client and database
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    return new MongoClient(mongoConnectionString);
});

builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(mongoDatabaseName);
});

// Configure Redis (optional - graceful degradation if Redis unavailable)
var redisEnabled = builder.Configuration.GetValue<bool>("Redis:Enabled", true);
if (redisEnabled)
{
    try
    {
        var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
        builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
        {
            var configuration = ConfigurationOptions.Parse(redisConnectionString);
            configuration.AbortOnConnectFail = false; // Graceful degradation
            return ConnectionMultiplexer.Connect(configuration);
        });
        builder.Services.AddSingleton<ICacheService, RedisCacheService>();
        Log.Information("Redis caching enabled with connection: {Redis}", redisConnectionString);
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Redis connection failed - caching disabled. Application will continue without cache.");
        builder.Services.AddSingleton<ICacheService, NullCacheService>(); // Fallback to no-op cache
    }
}
else
{
    Log.Information("Redis caching disabled in configuration");
    builder.Services.AddSingleton<ICacheService, NullCacheService>();
}

// Register repositories
builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();
builder.Services.AddScoped<IUserProgressRepository, UserProgressRepository>();
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IAIQARepository, AIQARepository>();
builder.Services.AddScoped<IAiTopicPromptRepository, AiTopicPromptRepository>();
builder.Services.AddScoped<IUserConfigRepository, UserConfigRepository>();
builder.Services.AddScoped<IMasterConfigRepository, MasterConfigRepository>();
builder.Services.AddScoped<INoteRepository, NoteRepository>();
builder.Services.AddScoped<ILlmProviderRepository, LlmProviderRepository>();
builder.Services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
builder.Services.AddScoped<IInterviewRoadmapRepository, InterviewRoadmapRepository>();
// Chat repositories (clean architecture — no MongoDB in controllers)
builder.Services.AddScoped<IConversationRepository, ConversationRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
// Deployment service — no repository layer needed (uses IMongoDatabase directly)
builder.Services.AddScoped<IDeploymentService, DeploymentService>();
// Analytics service — tracks visits + clicks, serves admin dashboard
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.Configure<OllamaSettings>(builder.Configuration.GetSection("OllamaSettings"));
builder.Services.Configure<ApiSettings>(builder.Configuration.GetSection("ApiSettings"));
builder.Services.AddSingleton<ISecretProvider, ConfigurationSecretProvider>();
builder.Services.AddSingleton<IStartupSecretValidator, StartupSecretValidator>();

// In-memory cache for AI responses (instant repeat-question delivery)
builder.Services.AddMemoryCache();

// Configure HttpClient for Ollama
builder.Services.AddHttpClient<IOllamaService, OllamaService>();

// Configure HttpClient for Judge0 (code execution sandbox)
// 55-second timeout keeps us safely under nginx's default 60s proxy_read_timeout.
builder.Services.AddHttpClient("Judge0", c =>
{
    c.Timeout = TimeSpan.FromSeconds(55);
});
builder.Services.AddScoped<ICodeExecutionService, CodeExecutionService>();

// Roslyn-based C# execution for the AI Playground (no external dependency)
builder.Services.AddSingleton<PlaygroundExecutionService>();

// Register services
builder.Services.AddScoped<IQuestionService, QuestionService>();
builder.Services.AddScoped<IUserProgressService, UserProgressService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IFirebaseTokenValidator, FirebaseTokenValidator>();
builder.Services.AddScoped<IAIQAService, AIQAService>();
builder.Services.AddScoped<ILearningService, LearningService>();
builder.Services.AddScoped<IAiUnderstandService, AiUnderstandService>();
builder.Services.AddScoped<IUserConfigService, UserConfigService>();
builder.Services.AddScoped<IMasterConfigService, MasterConfigService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<ILlmProviderService, LlmProviderService>();

// Spaced-repetition revision system
builder.Services.AddScoped<IRevisionRepository, RevisionRepository>();
builder.Services.AddScoped<IRevisionAiGenerator, RevisionAiGeneratorAdapter>();
builder.Services.AddScoped<IRevisionService, RevisionService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IInterviewRoadmapService, InterviewRoadmapService>();
// Chat services — controllers keep HTTP concerns, ChatService owns conversation state, streaming owns AI providers
builder.Services.AddScoped<IChatStreamProvider, OpenAiChatStreamProvider>();
builder.Services.AddScoped<IChatStreamProvider, OllamaChatStreamProvider>();
builder.Services.AddScoped<IChatAiStreamingService, ChatAiStreamingService>();
builder.Services.AddScoped<IChatService, ChatService>();

// ── Semantic Memory (RAG pipeline) ───────────────────────────────────────────
// IEmbeddingService calls OpenAI text-embedding-3-small
builder.Services.AddScoped<IEmbeddingService, OpenAIEmbeddingService>();
// IUserMemoryRepository persists vectors in MongoDB "user_memories" collection
builder.Services.AddScoped<IUserMemoryRepository, UserMemoryRepository>();
// ISemanticMemoryService orchestrates store + cosine-similarity retrieval
builder.Services.AddScoped<ISemanticMemoryService, SemanticMemoryService>();

// Razorpay HttpClient (short timeout — REST call to payment gateway)
builder.Services.AddHttpClient("Razorpay", c =>
{
    c.Timeout = TimeSpan.FromSeconds(15);
    c.DefaultRequestHeaders.Accept.Add(
        new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
});

// OpenAI streaming — dedicated HttpClient with 5-minute timeout for long completions
builder.Services.AddHttpClient("OpenAI", c =>
{
    c.Timeout = TimeSpan.FromMinutes(5);
});
builder.Services.AddHttpClient("FirebaseAuth", c =>
{
    c.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddScoped<IOpenAIStreamingService, OpenAIStreamingService>();
// Stateless prompt builder — singleton (pure functions, no DB or HTTP dependencies)
builder.Services.AddSingleton<IPromptBuilderService, PromptBuilderService>();

// Stateless UA classifier — registered as singleton (no state, no DB dependency)
builder.Services.AddSingleton<IDeviceDetectionService, DeviceDetectionService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = startupSecrets.GetRequired("JwtSettings:SecretKey");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

// Add Health Checks (MongoDB check commented out - not running locally)
builder.Services.AddHealthChecks();
    // .AddMongoDb(sp => new MongoClient(mongoConnectionString), name: "mongodb", tags: new[] { "db", "mongodb" });

var app = builder.Build();

// Initialize default admin user on first startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        await authService.InitializeDefaultUserAsync();
        Log.Information("Default user initialization complete.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Default user initialization skipped — MongoDB may not be ready.");
    }
}

// Configure the HTTP request pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "AILearn API v1");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "AILearn API Documentation";
    c.DisplayRequestDuration();
    c.EnableDeepLinking();
    c.EnableFilter();
});

app.UseCors("AllowAll");

app.UseAuthentication(); // ← required for JWT Bearer

// Custom middleware from LearnQuest
app.UseMiddleware<ApiKeyAuthenticationMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SubscriptionAccessMiddleware>();

app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health");

Log.Information("Starting AILearn API...");

app.Run();
