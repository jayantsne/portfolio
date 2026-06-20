using MongoDB.Driver;
using Microsoft.Extensions.Options;
using System.Net.Security;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;

namespace AILearnAPI.Infrastructure.Persistence
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IOptions<MongoDbSettings> settings)
        {
            var client = CreateClient(settings.Value);
            _database = client.GetDatabase(settings.Value.DatabaseName);
        }

        public IMongoDatabase Database => _database;

        public static MongoClient CreateClient(MongoDbSettings settings)
        {
            if (string.IsNullOrWhiteSpace(settings.ConnectionString))
                throw new InvalidOperationException("MongoDB connection string is required.");

            var connectionString = settings.ConnectionString.Trim();
            if (!connectionString.StartsWith("mongodb://", StringComparison.OrdinalIgnoreCase) &&
                !connectionString.StartsWith("mongodb+srv://", StringComparison.OrdinalIgnoreCase))
            {
                connectionString = $"mongodb://{connectionString}";
            }

            var clientSettings = MongoClientSettings.FromUrl(new MongoUrl(connectionString));

            if (settings.RequireTls)
            {
                clientSettings.UseTls = true;
                clientSettings.SslSettings = new SslSettings
                {
                    EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                    CheckCertificateRevocation = !settings.AllowInvalidCertificates,
                    ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) =>
                        ValidateServerCertificate(settings, sender, certificate, chain, sslPolicyErrors)
                };
                clientSettings.AllowInsecureTls = settings.AllowInvalidCertificates;
            }

            return new MongoClient(clientSettings);
        }

        private static bool ValidateServerCertificate(
            MongoDbSettings settings,
            object sender,
            X509Certificate? certificate,
            X509Chain? chain,
            SslPolicyErrors sslPolicyErrors)
        {
            if (sslPolicyErrors == SslPolicyErrors.None)
                return true;

            if (settings.AllowInvalidCertificates)
                return true;

            if (settings.AllowInvalidHostnames)
            {
                var nonNameErrors = sslPolicyErrors & ~SslPolicyErrors.RemoteCertificateNameMismatch;
                return nonNameErrors == SslPolicyErrors.None;
            }

            return false;
        }

        public IMongoCollection<T> GetCollection<T>(string name)
        {
            return _database.GetCollection<T>(name);
        }
    }

    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public bool RequireTls { get; set; } = true;
        public bool AllowInvalidCertificates { get; set; } = false;
        public bool AllowInvalidHostnames { get; set; } = false;
    }
}
