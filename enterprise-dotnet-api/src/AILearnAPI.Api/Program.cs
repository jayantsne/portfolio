using AILearnAPI.Api.Configuration;
using AILearnAPI.Api.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services
    .AddApiPresentation()
    .AddApiSecurity(builder.Configuration, startupSecrets)
    .AddPersistence(builder.Configuration, startupSecrets)
    .AddCaching(builder.Configuration)
    .AddApplicationServices(builder.Configuration);

var app = builder.Build();

if (StartupTasks.HasAdminPasswordResetRequest(args))
{
    await StartupTasks.ResetAdminPasswordAsync(app.Services, args, startupSecrets);
    return;
}

await StartupTasks.InitializeDefaultUserAsync(app.Services);

app.UseApiPipeline();

Log.Information("Starting AILearn API...");

app.Run();
