using AILearnAPI.Api.Middleware;

namespace AILearnAPI.Api.Configuration;

public static class ApplicationBuilderExtensions
{
    public static WebApplication UseApiPipeline(this WebApplication app)
    {
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
        app.UseAuthentication();
        app.UseMiddleware<ExceptionHandlingMiddleware>();
        app.UseMiddleware<SubscriptionAccessMiddleware>();
        app.UseAuthorization();
        app.MapControllers();
        app.MapHealthChecks("/health");

        return app;
    }
}
