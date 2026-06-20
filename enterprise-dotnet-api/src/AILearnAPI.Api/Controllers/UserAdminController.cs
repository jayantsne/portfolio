using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Shared.DTOs.Admin;
using AILearnAPI.Shared.DTOs.Subscription;
using System.Security.Claims;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Admin-only controller for user management operations.
    /// All endpoints require the ADMIN JWT role.
    /// </summary>
    [ApiController]
    [Route("api/user-admin")]
    [Authorize(Roles = UserRoles.Admin)]
    public class UserAdminController : ControllerBase
    {
        private readonly IAuthRepository         _authRepo;
        private readonly ISubscriptionRepository _subRepo;
        private readonly ILogger<UserAdminController> _logger;

        public UserAdminController(
            IAuthRepository          authRepo,
            ISubscriptionRepository  subRepo,
            ILogger<UserAdminController> logger)
        {
            _authRepo = authRepo;
            _subRepo  = subRepo;
            _logger   = logger;
        }

        // ── GET /api/user-admin/users ────────────────────────────────────────
        /// <summary>
        /// Paginated list of all users with their subscription data.
        /// Supports optional filtering by search term, role, and subscription status.
        /// </summary>
        [HttpGet("users")]
        public async Task<ActionResult<AdminUserListDto>> GetUsers(
            [FromQuery] int    skip   = 0,
            [FromQuery] int    limit  = 50,
            [FromQuery] string? search = null,
            [FromQuery] string? role   = null,
            [FromQuery] string? status = null)
        {
            try
            {
                // Load all users + all subscriptions in parallel
                var allUsersTask = _authRepo.GetAllUsersAsync(0, 10_000);
                var allSubsTask  = _subRepo.GetAllAsync();
                await Task.WhenAll(allUsersTask, allSubsTask);

                var users = await allUsersTask;
                var subs  = (await allSubsTask).ToDictionary(s => s.UserId);

                // Apply filters
                IEnumerable<Auth> filtered = users;

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var q = search.Trim().ToLowerInvariant();
                    filtered = filtered.Where(u =>
                        u.Username.ToLowerInvariant().Contains(q) ||
                        u.Email.ToLowerInvariant().Contains(q)    ||
                        u.UserId.ToLowerInvariant().Contains(q));
                }

                if (!string.IsNullOrWhiteSpace(role))
                    filtered = filtered.Where(u => u.Role.Equals(role, StringComparison.OrdinalIgnoreCase));

                var filteredList = filtered.ToList();
                int total = filteredList.Count;

                // Build DTOs with optional status filter
                var dtos = filteredList
                    .Select(u => ToDetailDto(u, subs.GetValueOrDefault(u.UserId)))
                    .ToList();

                if (!string.IsNullOrWhiteSpace(status))
                {
                    var s = status.Trim().ToLowerInvariant();
                    dtos = dtos.Where(d => d.SubscriptionStatus.Equals(s, StringComparison.OrdinalIgnoreCase)).ToList();
                    total = dtos.Count;
                }

                return Ok(new AdminUserListDto
                {
                    Total = total,
                    Users = dtos.Skip(skip).Take(limit).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching admin user list");
                return StatusCode(500, "Internal server error");
            }
        }

        // ── GET /api/user-admin/users/{userId} ──────────────────────────────
        [HttpGet("users/{userId}")]
        public async Task<ActionResult<AdminUserDetailDto>> GetUser(string userId)
        {
            var auth = await _authRepo.GetByUserIdAsync(userId);
            if (auth == null) return NotFound($"User '{userId}' not found");

            var sub = await _subRepo.GetByUserIdAsync(userId);
            return Ok(ToDetailDto(auth, sub));
        }

        // ── POST /api/user-admin/users/{userId}/block ────────────────────────
        /// <summary>Block or unblock a user.</summary>
        [HttpPost("users/{userId}/block")]
        public async Task<IActionResult> BlockUser(string userId, [FromBody] AdminBlockRequest req)
        {
            var sub = await _subRepo.GetByUserIdAsync(userId);
            if (sub == null)
            {
                // Create a minimal subscription record so we can store the block
                sub = new Subscription
                {
                    UserId     = userId,
                    SignupDate = DateTime.UtcNow,
                    TrialEndDate = DateTime.UtcNow,
                    SubscriptionStatus = SubscriptionStatuses.Expired
                };
            }

            sub.IsBlocked     = req.Block;
            sub.BlockedAt     = req.Block ? DateTime.UtcNow : null;
            sub.BlockedReason = req.Block ? req.Reason : null;

            await _subRepo.UpsertByUserIdAsync(sub);

            var callerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogWarning("[ADMIN] User {AdminId} {Action} user {TargetId}. Reason: {Reason}",
                callerUserId, req.Block ? "BLOCKED" : "UNBLOCKED", userId, req.Reason);

            return Ok(new { message = req.Block ? "User blocked." : "User unblocked." });
        }

        // ── POST /api/user-admin/users/{userId}/activate ─────────────────────
        /// <summary>Manually activate subscription for N days (default 30).</summary>
        [HttpPost("users/{userId}/activate")]
        public async Task<IActionResult> ActivateSubscription(string userId, [FromBody] AdminExtendRequest req)
        {
            var sub = await _subRepo.GetByUserIdAsync(userId) ?? new Subscription
            {
                UserId     = userId,
                SignupDate = DateTime.UtcNow,
                TrialEndDate = DateTime.UtcNow
            };

            var now = DateTime.UtcNow;
            sub.SubscriptionStatus    = SubscriptionStatuses.Active;
            sub.SubscriptionPlan      = "admin-grant";
            sub.SubscriptionStartDate = now;
            sub.SubscriptionExpiry    = now.AddDays(req.Days > 0 ? req.Days : 30);

            await _subRepo.UpsertByUserIdAsync(sub);

            var callerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("[ADMIN] {AdminId} manually activated subscription for {TargetId} ({Days}d)",
                callerUserId, userId, req.Days);

            return Ok(new { message = $"Subscription activated for {req.Days} days.", expiry = sub.SubscriptionExpiry });
        }

        // ── POST /api/user-admin/users/{userId}/extend ───────────────────────
        /// <summary>Extend an existing active subscription by N additional days.</summary>
        [HttpPost("users/{userId}/extend")]
        public async Task<IActionResult> ExtendSubscription(string userId, [FromBody] AdminExtendRequest req)
        {
            var sub = await _subRepo.GetByUserIdAsync(userId);
            if (sub == null) return NotFound($"No subscription record for user '{userId}'");

            var baseDate = (sub.SubscriptionExpiry.HasValue && sub.SubscriptionExpiry.Value > DateTime.UtcNow)
                ? sub.SubscriptionExpiry.Value
                : DateTime.UtcNow;

            sub.SubscriptionExpiry = baseDate.AddDays(req.Days > 0 ? req.Days : 30);
            sub.SubscriptionStatus = SubscriptionStatuses.Active;
            if (!sub.SubscriptionStartDate.HasValue)
                sub.SubscriptionStartDate = DateTime.UtcNow;

            await _subRepo.UpsertByUserIdAsync(sub);

            var callerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("[ADMIN] {AdminId} extended subscription for {TargetId} by {Days}d → {Expiry}",
                callerUserId, userId, req.Days, sub.SubscriptionExpiry);

            return Ok(new { message = $"Subscription extended by {req.Days} days.", expiry = sub.SubscriptionExpiry });
        }

        // ── POST /api/user-admin/users/{userId}/reset-trial ─────────────────
        /// <summary>Reset the user's trial to start fresh (2 days from now).</summary>
        [HttpPost("users/{userId}/reset-trial")]
        public async Task<IActionResult> ResetTrial(string userId)
        {
            var sub = await _subRepo.GetByUserIdAsync(userId);
            if (sub == null) return NotFound($"No subscription record for user '{userId}'");

            var now = DateTime.UtcNow;
            sub.SubscriptionStatus     = SubscriptionStatuses.Trial;
            sub.TrialEndDate           = now.AddDays(2);
            sub.SubscriptionExpiry     = null;
            sub.SubscriptionStartDate  = null;
            sub.SubscriptionPlan       = null;
            sub.IsBlocked              = false;
            sub.BlockedAt              = null;
            sub.BlockedReason          = null;

            await _subRepo.UpsertByUserIdAsync(sub);

            var callerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("[ADMIN] {AdminId} reset trial for {TargetId}. New trial end: {TrialEnd}",
                callerUserId, userId, sub.TrialEndDate);

            return Ok(new { message = "Trial reset. User now has a fresh 2-day trial.", trialEndDate = sub.TrialEndDate });
        }

        // ── POST /api/user-admin/users/{userId}/cancel ───────────────────────
        /// <summary>Cancel (expire) a user's subscription immediately.</summary>
        [HttpPost("users/{userId}/cancel")]
        public async Task<IActionResult> CancelSubscription(string userId)
        {
            var sub = await _subRepo.GetByUserIdAsync(userId);
            if (sub == null) return NotFound($"No subscription record for user '{userId}'");

            sub.SubscriptionStatus = SubscriptionStatuses.Expired;
            sub.SubscriptionExpiry = DateTime.UtcNow.AddSeconds(-1); // mark as instantly expired

            await _subRepo.UpsertByUserIdAsync(sub);

            var callerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogWarning("[ADMIN] {AdminId} cancelled subscription for {TargetId}", callerUserId, userId);

            return Ok(new { message = "Subscription cancelled." });
        }

        // ── PUT /api/user-admin/users/{userId}/role ──────────────────────────
        /// <summary>Promote or demote a user's role (ADMIN | USER).</summary>
        [HttpPut("users/{userId}/role")]
        public async Task<IActionResult> SetRole(string userId, [FromBody] SetRoleRequest req)
        {
            var callerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (callerUserId == userId)
                return BadRequest("You cannot change your own role.");

            if (!UserRoles.All.Contains(req.Role))
                return BadRequest($"Invalid role '{req.Role}'. Allowed: {string.Join(", ", UserRoles.All)}");

            var updated = await _authRepo.UpdateRoleAsync(userId, req.Role);
            if (!updated) return NotFound($"User '{userId}' not found");

            _logger.LogWarning("[ADMIN] {AdminId} set role of {TargetId} → {Role}", callerUserId, userId, req.Role);
            return Ok(new { message = $"Role updated to {req.Role}." });
        }

        // ── DELETE /api/user-admin/users/{userId} ────────────────────────────
        /// <summary>Permanently delete a user and their subscription record.</summary>
        [HttpDelete("users/{userId}")]
        public async Task<IActionResult> DeleteUser(string userId)
        {
            var callerUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (callerUserId == userId)
                return BadRequest("You cannot delete your own account.");

            var auth = await _authRepo.GetByUserIdAsync(userId);
            if (auth == null) return NotFound($"User '{userId}' not found");

            // Delete auth + subscription records
            await _authRepo.DeleteAsync(auth.Id);

            var sub = await _subRepo.GetByUserIdAsync(userId);
            if (sub != null)
                await _subRepo.DeleteAsync(sub.Id);

            _logger.LogWarning("[ADMIN] {AdminId} DELETED user {TargetId} ({Email})", callerUserId, userId, auth.Email);
            return Ok(new { message = "User and subscription data deleted permanently." });
        }

        // ── GET /api/user-admin/analytics ────────────────────────────────────
        /// <summary>Aggregated counts for the admin analytics cards.</summary>
        [HttpGet("analytics")]
        public async Task<ActionResult<AdminAnalyticsDto>> GetAnalytics()
        {
            var allUsersTask = _authRepo.GetAllUsersAsync(0, 10_000);
            var allSubsTask  = _subRepo.GetAllAsync();
            await Task.WhenAll(allUsersTask, allSubsTask);

            var users = await allUsersTask;
            var subs  = await allSubsTask;

            var subMap = subs.ToDictionary(s => s.UserId);

            int totalUsers        = users.Count;
            int adminUsers        = users.Count(u => u.Role == UserRoles.Admin);
            int activeTrial       = 0, activeSubscribers = 0, expired = 0, blocked = 0;

            foreach (var u in users)
            {
                subMap.TryGetValue(u.UserId, out var sub);
                if (sub == null) { expired++; continue; }
                if (sub.IsBlocked) { blocked++; continue; }
                if (sub.IsTrialActive)        activeTrial++;
                else if (sub.IsSubscriptionActive) activeSubscribers++;
                else expired++;
            }

            return Ok(new AdminAnalyticsDto
            {
                TotalUsers        = totalUsers,
                AdminUsers        = adminUsers,
                ActiveTrial       = activeTrial,
                ActiveSubscribers = activeSubscribers,
                ExpiredUsers      = expired,
                BlockedUsers      = blocked
            });
        }

        // ── Private helpers ──────────────────────────────────────────────────

        private static AdminUserDetailDto ToDetailDto(Auth u, Subscription? sub) => new()
        {
            UserId    = u.UserId,
            Username  = u.Username,
            Email     = u.Email,
            Role      = u.Role,
            LastLogin = u.LastLogin,
            IsAdmin   = u.Role == UserRoles.Admin,

            SubscriptionStatus   = sub?.SubscriptionStatus  ?? "none",
            HasAccess            = sub?.HasAccess            ?? false,
            IsTrialActive        = sub?.IsTrialActive        ?? false,
            IsSubscriptionActive = sub?.IsSubscriptionActive ?? false,
            TrialDaysRemaining   = sub?.TrialDaysRemaining   ?? 0,
            SubscriptionPlan     = sub?.SubscriptionPlan,
            SubscriptionExpiry   = sub?.SubscriptionExpiry,
            TrialEndDate         = sub?.TrialEndDate,
            SignupDate           = sub?.SignupDate,
            RazorpayOrderId      = sub?.RazorpayOrderId,
            RazorpayPaymentId    = sub?.RazorpayPaymentId,
            IsBlocked            = sub?.IsBlocked     ?? false,
            BlockedAt            = sub?.BlockedAt,
            BlockedReason        = sub?.BlockedReason,
        };
    }

    /// <summary>Request body for PUT /api/user-admin/users/{userId}/role</summary>
    public class SetRoleRequest
    {
        public string Role { get; set; } = string.Empty;
    }
}
