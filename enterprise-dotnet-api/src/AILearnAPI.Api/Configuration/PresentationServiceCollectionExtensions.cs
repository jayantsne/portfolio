namespace AILearnAPI.Api.Configuration;

public static class PresentationServiceCollectionExtensions
{
    public static IServiceCollection AddApiPresentation(this IServiceCollection services)
    {
        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new()
            {
                Title = "AILearn API",
                Version = "v1",
                Description = "Unified API for AI-powered learning, interview questions, and Azure exam preparation"
            });

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
                        Reference = new()
                        {
                            Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                            Id = "ApiKey"
                        }
                    },
                    Array.Empty<string>()
                }
            });

            var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
            {
                c.IncludeXmlComments(xmlPath);
            }

            c.EnableAnnotations();
        });

        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", policy =>
            {
                var allowedOrigins = new[]
                {
                    "http://localhost:4200",
                    "https://localhost",
                    "https://learnwithai.tech",
                    "https://www.learnwithai.tech"
                };

                policy.WithOrigins(allowedOrigins)
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            });
        });

        services.AddHealthChecks();
        return services;
    }
}
