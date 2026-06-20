using System.Text;
using AILearnAPI.Api.Models;
using AILearnAPI.Api.Services;
using AILearnAPI.Application.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace AILearnAPI.Api.Configuration;

public static class SecurityServiceCollectionExtensions
{
    public static IServiceCollection AddApiSecurity(
        this IServiceCollection services,
        IConfiguration configuration,
        ISecretProvider secrets)
    {
        services.Configure<ApiSettings>(configuration.GetSection("ApiSettings"));
        services.AddSingleton<ISecretProvider, ConfigurationSecretProvider>();
        services.AddSingleton<IStartupSecretValidator, StartupSecretValidator>();

        var jwtSettings = configuration.GetSection("JwtSettings");
        var secretKey = secrets.GetRequired("JwtSettings:SecretKey");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    if (string.IsNullOrWhiteSpace(context.Token) &&
                        context.Request.Cookies.TryGetValue("ailearn_auth", out var cookieToken))
                    {
                        context.Token = cookieToken;
                    }

                    return Task.CompletedTask;
                }
            };

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

        return services;
    }
}
