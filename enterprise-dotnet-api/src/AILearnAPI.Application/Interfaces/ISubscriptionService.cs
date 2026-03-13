using AILearnAPI.Shared.DTOs.Subscription;

namespace AILearnAPI.Application.Interfaces
{
    public interface ISubscriptionService
    {
        /// <summary>Creates a free-trial subscription record for a newly-registered user.</summary>
        Task<SubscriptionStatusDto> CreateTrialAsync(string userId);

        /// <summary>Returns the current subscription status for a user.</summary>
        Task<SubscriptionStatusDto?> GetStatusAsync(string userId);

        /// <summary>
        /// Checks whether the user holds an active trial or paid subscription.
        /// Automatically marks expired records as "expired".
        /// </summary>
        Task<bool> HasAccessAsync(string userId);

        /// <summary>Creates a Razorpay order for ₹199 monthly plan.</summary>
        Task<CreateOrderResponseDto> CreateRazorpayOrderAsync(string userId);

        /// <summary>
        /// Verifies the payment signature from Razorpay and, if valid, activates
        /// the subscription for 30 days.
        /// </summary>
        Task<PaymentVerifiedDto> VerifyPaymentAsync(VerifyPaymentDto dto);
    }
}
