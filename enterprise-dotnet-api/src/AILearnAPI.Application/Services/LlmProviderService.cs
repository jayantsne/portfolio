using System.Security.Cryptography;
using System.Text;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Application.Services
{
    /// <summary>
    /// Manages LLM providers with RBAC.  
    /// API keys are AES-256-GCM encrypted before MongoDB storage and never returned to callers.
    /// Encryption key is taken from configuration (LlmProvider:EncryptionKey) or a fallback
    /// — override with env var LlmProvider__EncryptionKey in production.
    /// </summary>
    public class LlmProviderService : ILlmProviderService
    {
        private readonly ILlmProviderRepository _repo;
        private readonly byte[] _encKey;

        public LlmProviderService(ILlmProviderRepository repo, ISecretProvider secrets)
        {
            _repo = repo;

            // Derive a 32-byte key from configuration. In production set the env var
            // LlmProvider__EncryptionKey to a strong random 256-bit Base64 string.
            var rawKey = secrets.GetRequired("LlmProvider:EncryptionKey");
            using var sha = SHA256.Create();
            _encKey = sha.ComputeHash(Encoding.UTF8.GetBytes(rawKey));
        }

        // ── Public surface ───────────────────────────────────────────────────

        public async Task<List<LlmProviderDto>> GetAllForAdminAsync()
        {
            var all = await _repo.GetAllAsync();
            return all.Select(ToDto).ToList();
        }

        public async Task<List<string>> GetAllowedProviderNamesAsync(string userId, string role)
        {
            var all = await _repo.GetEnabledAsync();
            if (role == UserRoles.Admin)
                return all.Select(p => p.ProviderName).ToList();

            return all
                .Where(p => p.AllowedUserIds.Contains(userId))
                .Select(p => p.ProviderName)
                .ToList();
        }

        public async Task<LlmProviderDto> UpsertProviderAsync(UpsertLlmProviderRequest req)
        {
            var existing = await _repo.GetByNameAsync(req.ProviderName);

            if (existing == null)
            {
                var entity = new LlmProvider
                {
                    ProviderName    = req.ProviderName.ToLower(),
                    DisplayName     = req.DisplayName,
                    ApiKeyEncrypted = !string.IsNullOrWhiteSpace(req.ApiKey) ? Encrypt(req.ApiKey) : string.Empty,
                    Model           = req.Model,
                    BaseUrl         = req.BaseUrl,
                    Enabled         = req.Enabled
                };
                await _repo.CreateAsync(entity);
                return ToDto(entity);
            }

            // Patch in-place
            existing.DisplayName = req.DisplayName;
            existing.Model       = req.Model;
            existing.BaseUrl     = req.BaseUrl;
            existing.Enabled     = req.Enabled;

            if (!string.IsNullOrWhiteSpace(req.ApiKey))
                existing.ApiKeyEncrypted = Encrypt(req.ApiKey);

            await _repo.UpdateAsync(existing.Id, existing);
            return ToDto(existing);
        }

        public async Task<bool> SetEnabledAsync(string providerName, bool enabled)
            => await _repo.SetEnabledAsync(providerName, enabled);

        public async Task<bool> AddAllowedUserAsync(string providerName, string userId)
            => await _repo.AddAllowedUserAsync(providerName, userId);

        public async Task<bool> RemoveAllowedUserAsync(string providerName, string userId)
            => await _repo.RemoveAllowedUserAsync(providerName, userId);

        public async Task<string?> ResolveApiKeyAsync(string providerName, string userId, string role)
        {
            var provider = await _repo.GetByNameAsync(providerName);
            if (provider == null || !provider.Enabled) return null;

            bool isAdmin    = role == UserRoles.Admin;
            bool isAllowed  = provider.AllowedUserIds.Contains(userId);

            if (!isAdmin && !isAllowed)
                throw new UnauthorizedAccessException(
                    $"User '{userId}' is not authorised to use the '{providerName}' provider.");

            return string.IsNullOrWhiteSpace(provider.ApiKeyEncrypted)
                ? null
                : Decrypt(provider.ApiKeyEncrypted);
        }

        // ── AES-256-GCM helpers ──────────────────────────────────────────────

        private string Encrypt(string plain)
        {
            var nonce      = new byte[AesGcm.NonceByteSizes.MaxSize];     // 12 bytes
            var ciphertext = new byte[Encoding.UTF8.GetByteCount(plain)];
            var tag        = new byte[AesGcm.TagByteSizes.MaxSize];       // 16 bytes

            RandomNumberGenerator.Fill(nonce);
            using var aes = new AesGcm(_encKey, AesGcm.TagByteSizes.MaxSize);
            aes.Encrypt(nonce, Encoding.UTF8.GetBytes(plain), ciphertext, tag);

            // Pack: nonce (12) + tag (16) + ciphertext
            var packed = new byte[nonce.Length + tag.Length + ciphertext.Length];
            Buffer.BlockCopy(nonce,      0, packed, 0,                          nonce.Length);
            Buffer.BlockCopy(tag,        0, packed, nonce.Length,               tag.Length);
            Buffer.BlockCopy(ciphertext, 0, packed, nonce.Length + tag.Length,  ciphertext.Length);

            return Convert.ToBase64String(packed);
        }

        private string Decrypt(string packed64)
        {
            var packed = Convert.FromBase64String(packed64);
            var nonce      = packed[..12];
            var tag        = packed[12..28];
            var ciphertext = packed[28..];
            var plain      = new byte[ciphertext.Length];

            using var aes = new AesGcm(_encKey, AesGcm.TagByteSizes.MaxSize);
            aes.Decrypt(nonce, ciphertext, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }

        private static LlmProviderDto ToDto(LlmProvider p) => new()
        {
            Id             = p.Id,
            ProviderName   = p.ProviderName,
            DisplayName    = p.DisplayName,
            Enabled        = p.Enabled,
            Model          = p.Model,
            BaseUrl        = p.BaseUrl,
            AllowedUserIds = p.AllowedUserIds,
            CreatedAt      = p.CreatedAt,
            UpdatedAt      = p.UpdatedAt
            // api_key intentionally omitted
        };
    }
}
