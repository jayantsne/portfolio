# Backend Secrets Setup

The backend does not store sensitive values in `appsettings.json`.

Configuration order is the normal ASP.NET Core order: JSON files, user-secrets in development, then environment variables. Environment variables win.

## Required Secrets

These must exist before the API starts:

| Config key | Environment variable |
| --- | --- |
| `ConnectionStrings:MongoDB` | `ConnectionStrings__MongoDB` |
| `ApiSettings:ApiKey` | `ApiSettings__ApiKey` |
| `JwtSettings:SecretKey` | `JwtSettings__SecretKey` |
| `LlmProvider:EncryptionKey` | `LlmProvider__EncryptionKey` |

Optional feature secrets:

| Config key | Environment variable |
| --- | --- |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` |
| `Razorpay:KeyId` | `Razorpay__KeyId` |
| `Razorpay:KeySecret` | `Razorpay__KeySecret` |

## Local Development

Use .NET user-secrets:

```powershell
cd D:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Api
dotnet user-secrets set "ConnectionStrings:MongoDB" "<your-mongodb-connection-string>"
dotnet user-secrets set "ApiSettings:ApiKey" "your-local-api-key"
dotnet user-secrets set "JwtSettings:SecretKey" "your-strong-local-jwt-secret-at-least-32-chars"
dotnet user-secrets set "LlmProvider:EncryptionKey" "your-strong-local-encryption-key"
dotnet user-secrets set "OPENAI_API_KEY" "your-openai-key"
```

Or use Windows user environment variables:

```powershell
[Environment]::SetEnvironmentVariable("ConnectionStrings__MongoDB", "<your-mongodb-connection-string>", "User")
[Environment]::SetEnvironmentVariable("ApiSettings__ApiKey", "your-local-api-key", "User")
[Environment]::SetEnvironmentVariable("JwtSettings__SecretKey", "your-strong-local-jwt-secret-at-least-32-chars", "User")
[Environment]::SetEnvironmentVariable("LlmProvider__EncryptionKey", "your-strong-local-encryption-key", "User")
```

Open a new terminal after setting Windows environment variables.

## Production

The GitHub Actions deployment writes `/etc/ailearnapi.env` on the server and the systemd service loads it with:

```ini
EnvironmentFile=/etc/ailearnapi.env
```

Do not commit production secrets. Add them to GitHub Actions secrets or directly to the server environment.
