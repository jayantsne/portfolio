using MongoDB.Driver;
using StackExchange.Redis;
using AILearnAPI.Infrastructure.Persistence;
using AILearnAPI.Infrastructure.Repositories;
using AILearnAPI.Infrastructure.Services;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Application.Services;
using AILearnAPI.Api.Services;
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
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDB") 
    ?? "mongodb://localhost:27017";
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
// Deployment service — no repository layer needed (uses IMongoDatabase directly)
builder.Services.AddScoped<IDeploymentService, DeploymentService>();
builder.Services.Configure<OllamaSettings>(builder.Configuration.GetSection("OllamaSettings"));
builder.Services.Configure<ApiSettings>(builder.Configuration.GetSection("ApiSettings"));

// In-memory cache for AI responses (instant repeat-question delivery)
builder.Services.AddMemoryCache();

// Configure HttpClient for Ollama
builder.Services.AddHttpClient<IOllamaService, OllamaService>();

// Register services
builder.Services.AddScoped<IQuestionService, QuestionService>();
builder.Services.AddScoped<IUserProgressService, UserProgressService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAIQAService, AIQAService>();
builder.Services.AddScoped<ILearningService, LearningService>();
builder.Services.AddScoped<IAiUnderstandService, AiUnderstandService>();
builder.Services.AddScoped<IUserConfigService, UserConfigService>();
builder.Services.AddScoped<IMasterConfigService, MasterConfigService>();
builder.Services.AddScoped<INoteService, NoteService>();

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
var secretKey = jwtSettings["SecretKey"] ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong123456";

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

// Initialize default admin user (commented out temporarily to allow startup)
// TODO: Fix MongoDB connection and re-enable
/*
using (var scope = app.Services.CreateScope())
{
    var autentication();
app.UseAuthhService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    await authService.InitializeDefaultUserAsync();
}
*/

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

app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health");

Log.Information("Starting AILearn API...");

app.Run();
