using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.Subscription;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly ISubscriptionRepository _repo;
        private readonly IConfiguration          _config;
        private readonly ILogger<SubscriptionService> _logger;
        private readonly HttpClient              _http;

        // ── Razorpay constants ───────────────────────────────────────────────
        private const int    TrialDays      = 2;
        private const int    SubDays        = 30;
        private const long   PriceInPaise   = 19900; // ₹199
        private const string Currency       = "INR";
        private const string RazorpayOrders = "https://api.razorpay.com/v1/orders";

        public SubscriptionService(
            ISubscriptionRepository repo,
            IConfiguration config,
            ILogger<SubscriptionService> logger,
            IHttpClientFactory httpFactory)
        {
            _repo   = repo;
            _config = config;
            _logger = logger;
            _http   = httpFactory.CreateClient("Razorpay");
        }

        // ── Trial creation ───────────────────────────────────────────────────

        public async Task<SubscriptionStatusDto> CreateTrialAsync(string userId)
        {
            var now = DateTime.UtcNow;
            var sub = new Subscription
            {
                UserId             = userId,
                SignupDate         = now,
                TrialEndDate       = now.AddDays(TrialDays),
                SubscriptionStatus = SubscriptionStatuses.Trial
            };
            var saved = await _repo.UpsertByUserIdAsync(sub);
            _logger.LogInformation("Free trial created for {UserId}, expires {Expiry}", userId, saved.TrialEndDate);
            return ToDto(saved);
        }

        // ── Status query ─────────────────────────────────────────────────────

        public async Task<SubscriptionStatusDto?> GetStatusAsync(string userId)
        {
            var sub = await _repo.GetByUserIdAsync(userId);
            if (sub == null) return null;
            await AutoExpireAsync(sub);
            return ToDto(sub);
        }

        public async Task<bool> HasAccessAsync(string userId)
        {
            var sub = await _repo.GetByUserIdAsync(userId);
            if (sub == null) return false;
            await AutoExpireAsync(sub);
            return sub.HasAccess;
        }

        // ── Razorpay order creation ──────────────────────────────────────────

        public async Task<CreateOrderResponseDto> CreateRazorpayOrderAsync(string userId)
        {
            var keyId     = _config["Razorpay:KeyId"]     ?? throw new InvalidOperationException("Razorpay:KeyId not configured");
            var keySecret = _config["Razorpay:KeySecret"] ?? throw new InvalidOperationException("Razorpay:KeySecret not configured");

            var payload = new
            {
                amount   = PriceInPaise,
                currency = Currency,
                receipt  = $"sub_{userId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
                notes    = new { userId }
            };

            var json    = JsonSerializer.Serialize(payload);
            var request = new HttpRequestMessage(HttpMethod.Post, RazorpayOrders)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            // Razorpay uses HTTP Basic Auth: key_id as username, key_secret as password
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);

            var response = await _http.SendAsync(request);
            var body     = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Razorpay order creation failed: {Status} {Body}", response.StatusCode, body);
                throw new InvalidOperationException("Payment gateway error. Please try again.");
            }

            using var doc      = JsonDocument.Parse(body);
            var       orderId  = doc.RootElement.GetProperty("id").GetString()!;

            _logger.LogInformation("Razorpay order {OrderId} created for {UserId}", orderId, userId);
            return new CreateOrderResponseDto(orderId, PriceInPaise, Currency, keyId);
        }

        // ── Payment verification ─────────────────────────────────────────────

        public async Task<PaymentVerifiedDto> VerifyPaymentAsync(VerifyPaymentDto dto)
        {
            var keySecret = _config["Razorpay:KeySecret"]
                            ?? throw new InvalidOperationException("Razorpay:KeySecret not configured");

            // Signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
            var payload   = $"{dto.RazorpayOrderId}|{dto.RazorpayPaymentId}";
            var keyBytes  = Encoding.UTF8.GetBytes(keySecret);
            var dataBytes = Encoding.UTF8.GetBytes(payload);
            using var hmac      = new HMACSHA256(keyBytes);
            var       hashBytes = hmac.ComputeHash(dataBytes);
            var       computed  = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

            if (!string.Equals(computed, dto.RazorpaySignature, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Invalid Razorpay signature for {UserId}", dto.UserId);
                return new PaymentVerifiedDto(false, "Payment verification failed — invalid signature.", "expired", null);
            }

            // Activate subscription
            var sub = await _repo.GetByUserIdAsync(dto.UserId);
            if (sub == null)
                sub = new Subscription { UserId = dto.UserId, SignupDate = DateTime.UtcNow, TrialEndDate = DateTime.UtcNow };

            var now = DateTime.UtcNow;
            sub.SubscriptionStatus    = SubscriptionStatuses.Active;
            sub.SubscriptionPlan      = "monthly";
            sub.SubscriptionStartDate = now;
            sub.SubscriptionExpiry    = now.AddDays(SubDays);
            sub.RazorpayOrderId       = dto.RazorpayOrderId;
            sub.RazorpayPaymentId     = dto.RazorpayPaymentId;

            await _repo.UpsertByUserIdAsync(sub);
            _logger.LogInformation("Subscription activated for {UserId}, expires {Expiry}", dto.UserId, sub.SubscriptionExpiry);

            return new PaymentVerifiedDto(true, "Payment verified! Your subscription is now active.", SubscriptionStatuses.Active, sub.SubscriptionExpiry);
        }

        // ── Private helpers ──────────────────────────────────────────────────

        private async Task AutoExpireAsync(Subscription sub)
        {
            // Mark trial as expired if window has passed
            if (sub.SubscriptionStatus == SubscriptionStatuses.Trial && DateTime.UtcNow > sub.TrialEndDate)
            {
                sub.SubscriptionStatus = SubscriptionStatuses.Expired;
                await _repo.UpsertByUserIdAsync(sub);
            }
            // Mark active subscription as expired after 30 days
            else if (sub.SubscriptionStatus == SubscriptionStatuses.Active
                     && sub.SubscriptionExpiry.HasValue
                     && DateTime.UtcNow > sub.SubscriptionExpiry.Value)
            {
                sub.SubscriptionStatus = SubscriptionStatuses.Expired;
                await _repo.UpsertByUserIdAsync(sub);
            }
        }

        private static SubscriptionStatusDto ToDto(Subscription s) => new(
            s.UserId,
            s.SubscriptionStatus,
            s.HasAccess,
            s.IsTrialActive,
            s.IsSubscriptionActive,
            s.TrialDaysRemaining,
            s.SubscriptionPlan,
            s.SubscriptionExpiry,
            s.TrialEndDate,
            s.SignupDate
        );
    }
}
