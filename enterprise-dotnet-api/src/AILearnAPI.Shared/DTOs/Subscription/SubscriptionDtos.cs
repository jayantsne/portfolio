namespace AILearnAPI.Shared.DTOs.Subscription
{
    /// <summary>Full subscription status returned to the client.</summary>
    public record SubscriptionStatusDto(
        string  UserId,
        string  SubscriptionStatus,   // trial | active | expired
        bool    HasAccess,
        bool    IsTrialActive,
        bool    IsSubscriptionActive,
        int     TrialDaysRemaining,
        string? SubscriptionPlan,
        DateTime? SubscriptionExpiry,
        DateTime  TrialEndDate,
        DateTime  SignupDate
    );

    /// <summary>Returned after creating a Razorpay order.</summary>
    public record CreateOrderResponseDto(
        string OrderId,
        long   AmountPaise,    // amount in paise (19900 = ₹199)
        string Currency,
        string KeyId           // Razorpay publishable key, safe to send to client
    );

    /// <summary>Sent by the client after successful Razorpay payment.</summary>
    public record VerifyPaymentDto(
        string UserId,
        string RazorpayOrderId,
        string RazorpayPaymentId,
        string RazorpaySignature
    );

    /// <summary>Simple wrapper confirming payment was accepted.</summary>
    public record PaymentVerifiedDto(
        bool    Success,
        string  Message,
        string  SubscriptionStatus,
        DateTime? SubscriptionExpiry
    );
}
