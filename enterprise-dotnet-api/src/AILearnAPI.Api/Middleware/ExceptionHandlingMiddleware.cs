using System.Net;
using System.Text.Json;
using AILearnAPI.Api.Models.DTOs;

namespace AILearnAPI.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var code = HttpStatusCode.InternalServerError;
        var result = string.Empty;

        switch (exception)
        {
            case TimeoutException:
                code = HttpStatusCode.RequestTimeout;
                result = JsonSerializer.Serialize(new ErrorResponseDto
                {
                    Error = "Request timed out",
                    Details = "The AI model took too long to respond"
                });
                break;

            case InvalidOperationException:
                code = HttpStatusCode.ServiceUnavailable;
                result = JsonSerializer.Serialize(new ErrorResponseDto
                {
                    Error = "Service unavailable",
                    Details = exception.Message
                });
                break;

            default:
                result = JsonSerializer.Serialize(new ErrorResponseDto
                {
                    Error = "Internal server error",
                    Details = "An unexpected error occurred"
                });
                break;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)code;
        return context.Response.WriteAsync(result);
    }
}
