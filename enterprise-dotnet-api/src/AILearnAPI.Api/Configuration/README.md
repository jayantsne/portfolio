# API startup structure

`Program.cs` should stay small. It only creates the host, validates startup secrets, registers feature groups, runs startup tasks, and starts the HTTP pipeline.

The startup code is split by responsibility:

- `PresentationServiceCollectionExtensions.cs` registers controllers, Swagger, CORS, and health checks.
- `SecurityServiceCollectionExtensions.cs` registers secret-backed JWT and security services.
- `PersistenceServiceCollectionExtensions.cs` registers MongoDB, TLS settings, and repositories.
- `CachingServiceCollectionExtensions.cs` registers memory cache and Redis-backed cache.
- `ApplicationServicesCollectionExtensions.cs` registers business services and outbound HTTP clients.
- `ApplicationBuilderExtensions.cs` configures middleware and endpoint mapping.
- `StartupTasks.cs` contains one-off startup commands such as admin password reset and default user initialization.

When adding a new feature, prefer this flow:

1. Put business rules behind an interface in `AILearnAPI.Application`.
2. Put MongoDB or external provider details in `AILearnAPI.Infrastructure` or a focused API adapter.
3. Keep controllers thin: validate HTTP input, call an application service, return HTTP responses.
4. Register the service in the matching startup extension instead of adding wiring directly to `Program.cs`.
