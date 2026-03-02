using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Application.Services
{
    public class MasterConfigService : IMasterConfigService
    {
        private readonly IMasterConfigRepository _repo;

        public MasterConfigService(IMasterConfigRepository repo)
        {
            _repo = repo;
        }

        public async Task<MasterConfigDto> GetAsync()
        {
            var config = await _repo.GetOrCreateAsync();
            return ToDto(config);
        }

        public async Task<MasterConfigDto> UpdateAsync(UpdateMasterConfigDto dto, string updatedByUserId)
        {
            var config = await _repo.GetOrCreateAsync();

            // ── Provider ─────────────────────────────────────────────────
            if (dto.allowedProviders     != null) config.AllowedProviders     = dto.allowedProviders;
            if (dto.defaultProvider      != null) config.DefaultProvider      = dto.defaultProvider;
            if (dto.fallbackOrder        != null) config.FallbackOrder        = dto.fallbackOrder;
            if (dto.ollamaEnabled        != null) config.OllamaEnabled        = dto.ollamaEnabled.Value;

            // ── Models ───────────────────────────────────────────────────
            if (dto.modelGroq            != null) config.ModelGroq            = dto.modelGroq;
            if (dto.modelTogether        != null) config.ModelTogether        = dto.modelTogether;
            if (dto.modelOpenrouter      != null) config.ModelOpenrouter      = dto.modelOpenrouter;
            if (dto.modelOllamaStream    != null) config.ModelOllamaStream    = dto.modelOllamaStream;
            if (dto.modelOllamaFallbacks != null) config.ModelOllamaFallbacks = dto.modelOllamaFallbacks;

            // ── Generation ───────────────────────────────────────────────
            if (dto.defaultMaxTokens    != null) config.DefaultMaxTokens    = dto.defaultMaxTokens.Value;
            if (dto.defaultTemperature  != null) config.DefaultTemperature  = dto.defaultTemperature.Value;
            if (dto.topK                != null) config.TopK                = dto.topK.Value;
            if (dto.topP                != null) config.TopP                = dto.topP.Value;
            if (dto.maxOutputTokens     != null) config.MaxOutputTokens     = dto.maxOutputTokens.Value;
            if (dto.maxTokensStream     != null) config.MaxTokensStream     = dto.maxTokensStream.Value;
            if (dto.maxTokensSimplified != null) config.MaxTokensSimplified = dto.maxTokensSimplified.Value;
            if (dto.defaultSystemPrompt != null) config.DefaultSystemPrompt = dto.defaultSystemPrompt;
            if (dto.mainPromptTemplate  != null) config.MainPromptTemplate  = dto.mainPromptTemplate;

            // ── Prompts ──────────────────────────────────────────────────
            if (dto.systemRole                != null) config.SystemRole                = dto.systemRole;
            if (dto.promptTypeCode            != null) config.PromptTypeCode            = dto.promptTypeCode;
            if (dto.promptTypeConcept         != null) config.PromptTypeConcept         = dto.promptTypeConcept;
            if (dto.promptTypeComparison      != null) config.PromptTypeComparison      = dto.promptTypeComparison;
            if (dto.promptTypeTroubleshooting != null) config.PromptTypeTroubleshooting = dto.promptTypeTroubleshooting;
            if (dto.promptTypeDefault         != null) config.PromptTypeDefault         = dto.promptTypeDefault;
            if (dto.formatInstruction         != null) config.FormatInstruction         = dto.formatInstruction;
            if (dto.complexitySimple          != null) config.ComplexitySimple          = dto.complexitySimple;
            if (dto.complexityMedium          != null) config.ComplexityMedium          = dto.complexityMedium;
            if (dto.complexityComplex         != null) config.ComplexityComplex         = dto.complexityComplex;

            // ── Cache ────────────────────────────────────────────────────
            if (dto.cacheEnabled       != null) config.CacheEnabled       = dto.cacheEnabled.Value;
            if (dto.cacheDurationHours != null) config.CacheDurationHours = dto.cacheDurationHours.Value;
            if (dto.cacheVersion       != null) config.CacheVersion       = dto.cacheVersion.Value;
            if (dto.cacheKeyPrefix     != null) config.CacheKeyPrefix     = dto.cacheKeyPrefix;

            // ── Rate limiting ─────────────────────────────────────────────
            if (dto.maxRequestsPerUserPerDay != null) config.MaxRequestsPerUserPerDay = dto.maxRequestsPerUserPerDay.Value;
            if (dto.maxRequestsPerMinute     != null) config.MaxRequestsPerMinute     = dto.maxRequestsPerMinute.Value;
            if (dto.requestDelayMs           != null) config.RequestDelayMs           = dto.requestDelayMs.Value;
            if (dto.maxHistory               != null) config.MaxHistory               = dto.maxHistory.Value;
            if (dto.enableRateLimiting       != null) config.EnableRateLimiting       = dto.enableRateLimiting.Value;
            if (dto.perProviderLimits        != null) config.PerProviderLimits        = dto.perProviderLimits;
            if (dto.cooldownMs               != null) config.CooldownMs               = dto.cooldownMs;

            // ── Feature flags ─────────────────────────────────────────────
            if (dto.enableSignup       != null) config.EnableSignup       = dto.enableSignup.Value;
            if (dto.maintenanceMode    != null) config.MaintenanceMode    = dto.maintenanceMode.Value;
            if (dto.maintenanceMessage != null) config.MaintenanceMessage = dto.maintenanceMessage;
            // ── Device token limits ──────────────────────────────────────────────
            if (dto.deviceTokenLimitsEnabled != null) config.DeviceTokenLimitsEnabled = dto.deviceTokenLimitsEnabled.Value;
            if (dto.mobileMaxTokens          != null) config.MobileMaxTokens          = dto.mobileMaxTokens.Value;
            if (dto.tabletMaxTokens          != null) config.TabletMaxTokens          = dto.tabletMaxTokens.Value;
            if (dto.desktopMaxTokens         != null) config.DesktopMaxTokens         = dto.desktopMaxTokens.Value;
            config.LastUpdatedBy = updatedByUserId;
            config.LastUpdatedAt = DateTime.UtcNow;

            var saved = await _repo.UpdateAsync(config);
            return ToDto(saved);
        }

        // ── Mapping ────────────────────────────────────────────────────────────
        private static MasterConfigDto ToDto(Domain.Entities.MasterConfig c) => new()
        {
            // Provider
            allowedProviders     = c.AllowedProviders,
            defaultProvider      = c.DefaultProvider,
            fallbackOrder        = c.FallbackOrder,
            ollamaEnabled        = c.OllamaEnabled,

            // Models
            modelGroq            = c.ModelGroq,
            modelTogether        = c.ModelTogether,
            modelOpenrouter      = c.ModelOpenrouter,
            modelOllamaStream    = c.ModelOllamaStream,
            modelOllamaFallbacks = c.ModelOllamaFallbacks,

            // Generation
            defaultMaxTokens    = c.DefaultMaxTokens,
            defaultTemperature  = c.DefaultTemperature,
            topK                = c.TopK,
            topP                = c.TopP,
            maxOutputTokens     = c.MaxOutputTokens,
            maxTokensStream     = c.MaxTokensStream,
            maxTokensSimplified = c.MaxTokensSimplified,
            defaultSystemPrompt = c.DefaultSystemPrompt,
            mainPromptTemplate  = c.MainPromptTemplate,

            // Prompts
            systemRole                = c.SystemRole,
            promptTypeCode            = c.PromptTypeCode,
            promptTypeConcept         = c.PromptTypeConcept,
            promptTypeComparison      = c.PromptTypeComparison,
            promptTypeTroubleshooting = c.PromptTypeTroubleshooting,
            promptTypeDefault         = c.PromptTypeDefault,
            formatInstruction         = c.FormatInstruction,
            complexitySimple          = c.ComplexitySimple,
            complexityMedium          = c.ComplexityMedium,
            complexityComplex         = c.ComplexityComplex,

            // Cache
            cacheEnabled       = c.CacheEnabled,
            cacheDurationHours = c.CacheDurationHours,
            cacheVersion       = c.CacheVersion,
            cacheKeyPrefix     = c.CacheKeyPrefix,

            // Rate limiting
            maxRequestsPerUserPerDay = c.MaxRequestsPerUserPerDay,
            maxRequestsPerMinute     = c.MaxRequestsPerMinute,
            requestDelayMs           = c.RequestDelayMs,
            maxHistory               = c.MaxHistory,
            enableRateLimiting       = c.EnableRateLimiting,
            perProviderLimits        = c.PerProviderLimits,
            cooldownMs               = c.CooldownMs,

            // Feature flags
            enableSignup       = c.EnableSignup,
            maintenanceMode    = c.MaintenanceMode,
            maintenanceMessage = c.MaintenanceMessage,

            // Device token limits
            deviceTokenLimitsEnabled = c.DeviceTokenLimitsEnabled,
            mobileMaxTokens          = c.MobileMaxTokens,
            tabletMaxTokens          = c.TabletMaxTokens,
            desktopMaxTokens         = c.DesktopMaxTokens,

            // Audit
            lastUpdatedBy = c.LastUpdatedBy,
            lastUpdatedAt = c.LastUpdatedAt
        };
    }
}
