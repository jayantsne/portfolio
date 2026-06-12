using System.Security.Cryptography;
using System.Text;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.UserConfig;
using AILearnAPI.Shared.Extensions;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class UserConfigService : IUserConfigService
    {
        private readonly IUserConfigRepository _repo;
        private readonly ILogger<UserConfigService> _logger;
        private readonly byte[] _encKey;

        public UserConfigService(
            IUserConfigRepository repo,
            ILogger<UserConfigService> logger,
            ISecretProvider secrets)
        {
            _repo   = repo;
            _logger = logger;

            // Reuse same key derivation as LlmProviderService for consistency.
            // Override with env var: LlmProvider__EncryptionKey
            var rawKey = secrets.GetRequired("LlmProvider:EncryptionKey");
            using var sha = SHA256.Create();
            _encKey = sha.ComputeHash(Encoding.UTF8.GetBytes(rawKey));
        }

        // ── Core ─────────────────────────────────────────────────────────────

        public async Task<UserConfigDto> GetOrCreateAsync(string userId)
        {
            var config = await _repo.GetByUserIdAsync(userId);
            if (config == null)
            {
                config = new UserConfig { UserId = userId };
                await _repo.UpsertAsync(userId, config);
                _logger.LogInformation("Created default UserConfig for {UserId}", userId);
            }
            return config.ToDto();
        }

        public async Task<UserConfigDto> UpdateAsync(string userId, UpdateUserConfigDto dto)
        {
            var config = await _repo.GetByUserIdAsync(userId)
                         ?? new UserConfig { UserId = userId };

            if (dto.maxTokens.HasValue)      config.MaxTokens       = dto.maxTokens.Value;
            if (dto.systemPrompt != null)    config.SystemPrompt    = dto.systemPrompt;
            if (dto.providerToggles != null) config.ProviderToggles = dto.providerToggles;
            if (dto.defaultProvider != null) config.DefaultProvider = dto.defaultProvider;

            var updated = await _repo.UpsertAsync(userId, config);
            _logger.LogInformation("Updated UserConfig for {UserId}", userId);
            return updated.ToDto();
        }

        // ── Default provider ─────────────────────────────────────────────────

        public async Task<UserConfigDto> SetDefaultProviderAsync(string userId, string providerName)
        {
            var config = await _repo.GetByUserIdAsync(userId)
                         ?? new UserConfig { UserId = userId };
            config.DefaultProvider = providerName;
            var updated = await _repo.UpsertAsync(userId, config);
            _logger.LogInformation("Set defaultProvider={P} for {UserId}", providerName, userId);
            return updated.ToDto();
        }

        // ── Custom providers ─────────────────────────────────────────────────

        public async Task<List<UserCustomProviderDto>> GetCustomProvidersAsync(string userId)
        {
            var config = await _repo.GetByUserIdAsync(userId);
            if (config == null) return new();
            return config.CustomProviders.Select(ToPublicDto).ToList();
        }

        public async Task<UserCustomProviderDto> AddCustomProviderAsync(string userId, AddCustomProviderDto dto)
        {
            var config = await _repo.GetByUserIdAsync(userId)
                         ?? new UserConfig { UserId = userId };

            var entry = new UserCustomProvider
            {
                Id             = Guid.NewGuid().ToString("N")[..12],
                Name           = dto.name.Trim(),
                BaseUrl        = dto.baseUrl.TrimEnd('/'),
                Model          = string.IsNullOrWhiteSpace(dto.model) ? "gpt-4o" : dto.model,
                ApiKeyEncrypted = Encrypt(dto.apiKey),
                CreatedAt      = DateTime.UtcNow
            };
            config.CustomProviders.Add(entry);
            await _repo.UpsertAsync(userId, config);
            _logger.LogInformation("Added custom provider {Name} for {UserId}", entry.Name, userId);
            return ToPublicDto(entry);
        }

        public async Task<UserCustomProviderDto> UpdateCustomProviderAsync(
            string userId, string providerId, UpdateCustomProviderDto dto)
        {
            var config = await _repo.GetByUserIdAsync(userId)
                         ?? throw new KeyNotFoundException("User config not found");

            var entry = config.CustomProviders.FirstOrDefault(p => p.Id == providerId)
                        ?? throw new KeyNotFoundException($"Custom provider '{providerId}' not found");

            if (dto.name    != null) entry.Name    = dto.name.Trim();
            if (dto.baseUrl != null) entry.BaseUrl = dto.baseUrl.TrimEnd('/');
            if (dto.model   != null) entry.Model   = dto.model;
            if (dto.apiKey  != null) entry.ApiKeyEncrypted = Encrypt(dto.apiKey);

            await _repo.UpsertAsync(userId, config);
            _logger.LogInformation("Updated custom provider {Id} for {UserId}", providerId, userId);
            return ToPublicDto(entry);
        }

        public async Task<bool> DeleteCustomProviderAsync(string userId, string providerId)
        {
            var config = await _repo.GetByUserIdAsync(userId);
            if (config == null) return false;

            var removed = config.CustomProviders.RemoveAll(p => p.Id == providerId);
            if (removed == 0) return false;

            // If deleted provider was the default, reset to ollama
            if (config.DefaultProvider == $"custom:{providerId}")
                config.DefaultProvider = "ollama";

            await _repo.UpsertAsync(userId, config);
            _logger.LogInformation("Deleted custom provider {Id} for {UserId}", providerId, userId);
            return true;
        }

        public async Task<CustomProviderStreamInfo?> GetCustomProviderStreamInfoAsync(
            string userId, string providerId)
        {
            var config = await _repo.GetByUserIdAsync(userId);
            if (config == null) return null;

            var entry = config.CustomProviders.FirstOrDefault(p => p.Id == providerId);
            if (entry == null) return null;

            return new CustomProviderStreamInfo
            {
                BaseUrl = entry.BaseUrl,
                ApiKey  = string.IsNullOrEmpty(entry.ApiKeyEncrypted)
                              ? string.Empty
                              : Decrypt(entry.ApiKeyEncrypted),
                Model   = entry.Model
            };
        }

        // ── AES-256-GCM helpers ──────────────────────────────────────────────

        private string Encrypt(string plain)
        {
            var nonce      = new byte[AesGcm.NonceByteSizes.MaxSize];     // 12 bytes
            var plainBytes = Encoding.UTF8.GetBytes(plain);
            var ciphertext = new byte[plainBytes.Length];
            var tag        = new byte[AesGcm.TagByteSizes.MaxSize];       // 16 bytes
            RandomNumberGenerator.Fill(nonce);
            using var aes = new AesGcm(_encKey, AesGcm.TagByteSizes.MaxSize);
            aes.Encrypt(nonce, plainBytes, ciphertext, tag);
            var packed = new byte[nonce.Length + tag.Length + ciphertext.Length];
            Buffer.BlockCopy(nonce,      0, packed, 0,                         nonce.Length);
            Buffer.BlockCopy(tag,        0, packed, nonce.Length,              tag.Length);
            Buffer.BlockCopy(ciphertext, 0, packed, nonce.Length + tag.Length, ciphertext.Length);
            return Convert.ToBase64String(packed);
        }

        private string Decrypt(string packed64)
        {
            var packed     = Convert.FromBase64String(packed64);
            var nonce      = packed[..12];
            var tag        = packed[12..28];
            var ciphertext = packed[28..];
            var plain      = new byte[ciphertext.Length];
            using var aes = new AesGcm(_encKey, AesGcm.TagByteSizes.MaxSize);
            aes.Decrypt(nonce, ciphertext, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }

        private static UserCustomProviderDto ToPublicDto(UserCustomProvider cp) => new()
        {
            id        = cp.Id,
            name      = cp.Name,
            baseUrl   = cp.BaseUrl,
            model     = cp.Model,
            createdAt = cp.CreatedAt.ToString("o")
        };
    }
}

