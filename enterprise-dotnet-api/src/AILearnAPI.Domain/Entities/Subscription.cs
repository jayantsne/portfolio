using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// Tracks free-trial start and paid-subscription status for each user.
    /// Stored in the "subscriptions" MongoDB collection, keyed by UserId.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class Subscription : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        /// <summary>UTC timestamp when the account was created.</summary>
        [BsonElement("signupDate")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime SignupDate { get; set; } = DateTime.UtcNow;

        /// <summary>Trial expires SignupDate + 2 days.</summary>
        [BsonElement("trialEndDate")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime TrialEndDate { get; set; }

        /// <summary>trial | active | expired</summary>
        [BsonElement("subscriptionStatus")]
        public string SubscriptionStatus { get; set; } = SubscriptionStatuses.Trial;

        /// <summary>null until paid; then "monthly".</summary>
        [BsonElement("subscriptionPlan")]
        public string? SubscriptionPlan { get; set; }

        [BsonElement("subscriptionStartDate")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? SubscriptionStartDate { get; set; }

        /// <summary>SubscriptionStartDate + 30 days.</summary>
        [BsonElement("subscriptionExpiry")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? SubscriptionExpiry { get; set; }

        /// <summary>Razorpay order ID used in the checkout session.</summary>
        [BsonElement("razorpayOrderId")]
        public string? RazorpayOrderId { get; set; }

        /// <summary>Razorpay payment ID returned after successful payment.</summary>
        [BsonElement("razorpayPaymentId")]
        public string? RazorpayPaymentId { get; set; }

        // ─── Computed helpers (not stored) ──────────────────────────────────

        [BsonIgnore]
        public bool IsTrialActive  => SubscriptionStatus == SubscriptionStatuses.Trial
                                      && DateTime.UtcNow <= TrialEndDate;

        [BsonIgnore]
        public bool IsSubscriptionActive => SubscriptionStatus == SubscriptionStatuses.Active
                                            && SubscriptionExpiry.HasValue
                                            && DateTime.UtcNow <= SubscriptionExpiry.Value;

        [BsonIgnore]
        public bool HasAccess => IsTrialActive || IsSubscriptionActive;

        [BsonIgnore]
        public int TrialDaysRemaining =>
            IsTrialActive ? (int)Math.Ceiling((TrialEndDate - DateTime.UtcNow).TotalDays) : 0;
    }

    public static class SubscriptionStatuses
    {
        public const string Trial   = "trial";
        public const string Active  = "active";
        public const string Expired = "expired";
    }
}
