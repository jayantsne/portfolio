using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Shared.DTOs.Subscription;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Manages free-trial state and ₹199/month Razorpay subscriptions.
    /// </summary>
    [ApiController]
    [Route("api/subscription")]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService  _svc;
        private readonly ILogger<SubscriptionController> _logger;

        public SubscriptionController(ISubscriptionService svc, ILogger<SubscriptionController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // GET /api/subscription/status/{userId}
        /// <summary>Returns full subscription status for a user.</summary>
        [HttpGet("status/{userId}")]
        public async Task<IActionResult> GetStatus(string userId)
        {
            // Admin users always have unrestricted access — return synthetic admin status
            if (User.IsInRole(UserRoles.Admin))
            {
                var now = DateTime.UtcNow;
                return Ok(new SubscriptionStatusDto(
                    UserId:               userId,
                    SubscriptionStatus:   "admin",
                    HasAccess:            true,
                    IsTrialActive:        false,
                    IsSubscriptionActive: true,
                    TrialDaysRemaining:   0,
                    SubscriptionPlan:     "Admin",
                    SubscriptionExpiry:   null,
                    TrialEndDate:         now,
                    SignupDate:           now,
                    IsAdmin:              true
                ));
            }

            var status = await _svc.GetStatusAsync(userId);
            if (status == null)
                return NotFound(new { message = "Subscription record not found for this user." });
            return Ok(status);
        }

        // GET /api/subscription/check-access/{userId}
        /// <summary>Lightweight check: returns { hasAccess: bool }.</summary>
        [HttpGet("check-access/{userId}")]
        public async Task<IActionResult> CheckAccess(string userId)
        {
            // Admin users always have access — no DB lookup needed
            if (User.IsInRole(UserRoles.Admin))
                return Ok(new { hasAccess = true, isAdmin = true });

            var ok = await _svc.HasAccessAsync(userId);
            return Ok(new { hasAccess = ok });
        }

        // POST /api/subscription/create-order
        /// <summary>Creates a Razorpay order and returns the order_id + publishable key.</summary>
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
        {
            try
            {
                var result = await _svc.CreateRazorpayOrderAsync(req.UserId);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Failed to create Razorpay order for {UserId}", req.UserId);
                return StatusCode(503, new { message = ex.Message });
            }
        }

        // POST /api/subscription/verify-payment
        /// <summary>Verifies Razorpay signature and activates the subscription.</summary>
        [HttpPost("verify-payment")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentDto dto)
        {
            var result = await _svc.VerifyPaymentAsync(dto);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }
    }

    public record CreateOrderRequest(string UserId);
}
