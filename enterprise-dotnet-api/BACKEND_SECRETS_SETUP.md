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
| `DefaultAdmin:Password` | `DefaultAdmin__Password` |
| `AdminReset:Password` | `AdminReset__Password` |
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
dotnet user-secrets set "DefaultAdmin:Password" "your-initial-admin-password"
dotnet user-secrets set "OPENAI_API_KEY" "your-openai-key"
```

Or use Windows user environment variables:

```powershell
[Environment]::SetEnvironmentVariable("ConnectionStrings__MongoDB", "<your-mongodb-connection-string>", "User")
[Environment]::SetEnvironmentVariable("ApiSettings__ApiKey", "your-local-api-key", "User")
[Environment]::SetEnvironmentVariable("JwtSettings__SecretKey", "your-strong-local-jwt-secret-at-least-32-chars", "User")
[Environment]::SetEnvironmentVariable("LlmProvider__EncryptionKey", "your-strong-local-encryption-key", "User")
[Environment]::SetEnvironmentVariable("DefaultAdmin__Password", "your-initial-admin-password", "User")
```

Open a new terminal after setting Windows environment variables.

## MongoDB TLS

MongoDB TLS is required by default:

```json
"MongoDB": {
  "RequireTls": true,
  "AllowInvalidCertificates": false,
  "AllowInvalidHostnames": false
}
```

Keep `AllowInvalidCertificates` set to `false` outside temporary local diagnostics. If the MongoDB server certificate does not include the configured host/IP in its SAN list, fix the certificate or DNS name. `AllowInvalidHostnames` exists only as a temporary migration switch and should stay `false` in production. The MongoDB connection string should be stored only as `ConnectionStrings:MongoDB` / `ConnectionStrings__MongoDB`, never in frontend files.

## Reset Admin Password

Set the new password as a backend secret, then run the one-shot reset command:

```powershell
cd D:\folio\jayant-angular-ui\enterprise-dotnet-api\src\AILearnAPI.Api
dotnet user-secrets set "AdminReset:Password" "new-admin-password"
dotnet run -- --reset-admin-password admin@learnwithai.tech
dotnet user-secrets remove "AdminReset:Password"
```

For production, set `AdminReset__Password` in the server environment only for the reset operation, run the same command against the deployed backend, then remove the variable and restart the service. Do not send the password through the frontend, an API request body, or a committed config file.

## Production

The GitHub Actions deployment writes `/etc/ailearnapi.env` on the server and the systemd service loads it with:

```ini
EnvironmentFile=/etc/ailearnapi.env
```

Do not commit production secrets. Add them to GitHub Actions secrets or directly to the server environment.
