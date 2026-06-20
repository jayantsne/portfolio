using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Tracks per-user AI search usage and enforces the free-tier limit (2 searches).
    /// Guest / unauthenticated usage is tracked client-side (localStorage).
    /// This controller handles server-side tracking for identified users.
    /// </summary>
    [ApiController]
    [Route("api/usage")]
    public class UsageController : ControllerBase
    {
        private readonly IMongoDatabase _db;
        private readonly ILogger<UsageController> _logger;

        private const int FREE_LIMIT = 2;
        private const string COLLECTION = "user_usage";

        public UsageController(IMongoDatabase db, ILogger<UsageController> logger)
        {
            _db     = db;
            _logger = logger;
        }

        // GET /api/usage/status/{userId}
        /// <summary>Returns remaining free searches and total usage for a user.</summary>
        [HttpGet("status/{userId}")]
        public async Task<IActionResult> GetStatus(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { message = "userId is required." });

            // Admins have unlimited searches
            if (User.IsInRole("Admin"))
                return Ok(new { remainingSearches = 999, totalUsed = 0, isPremium = true, freeLimit = FREE_LIMIT });

            try
            {
                var col = _db.GetCollection<BsonDocument>(COLLECTION);
                var doc = await col
                    .Find(Builders<BsonDocument>.Filter.Eq("userId", userId))
                    .FirstOrDefaultAsync();

                int totalUsed = doc?.GetValue("searchCount", 0).AsInt32 ?? 0;
                int remaining = Math.Max(0, FREE_LIMIT - totalUsed);

                return Ok(new
                {
                    remainingSearches = remaining,
                    totalUsed,
                    isPremium = false,
                    freeLimit = FREE_LIMIT
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching usage status for {UserId}", userId);
                return StatusCode(500, new { message = "Error fetching usage status." });
            }
        }

        // POST /api/usage/increment/{userId}
        /// <summary>
        /// Increments the search counter for a user.
        /// Returns updated remaining count and whether the free limit has been reached.
        /// </summary>
        [HttpPost("increment/{userId}")]
        public async Task<IActionResult> Increment(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { message = "userId is required." });

            // Admins have unlimited searches — no tracking needed
            if (User.IsInRole("Admin"))
                return Ok(new { success = true, remainingSearches = 999, limitReached = false });

            try
            {
                var col = _db.GetCollection<BsonDocument>(COLLECTION);

                var filter = Builders<BsonDocument>.Filter.Eq("userId", userId);
                var update = Builders<BsonDocument>.Update
                    .Inc("searchCount", 1)
                    .Set("updatedAt", DateTime.UtcNow)
                    .SetOnInsert("userId", userId)
                    .SetOnInsert("createdAt", DateTime.UtcNow);

                var result = await col.FindOneAndUpdateAsync(
                    filter,
                    update,
                    new FindOneAndUpdateOptions<BsonDocument>
                    {
                        IsUpsert       = true,
                        ReturnDocument = ReturnDocument.After
                    });

                int totalUsed = result?.GetValue("searchCount", 0).AsInt32 ?? 1;
                int remaining = Math.Max(0, FREE_LIMIT - totalUsed);

                return Ok(new
                {
                    success          = true,
                    remainingSearches = remaining,
                    totalUsed,
                    limitReached     = remaining <= 0
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error incrementing usage for {UserId}", userId);
                return StatusCode(500, new { message = "Error updating usage." });
            }
        }

        // POST /api/usage/reset/{userId}  (admin only)
        /// <summary>Resets a user's search counter. Admin only.</summary>
        [HttpPost("reset/{userId}")]
        public async Task<IActionResult> Reset(string userId)
        {
            if (!User.IsInRole("Admin"))
                return Forbid();

            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { message = "userId is required." });

            try
            {
                var col = _db.GetCollection<BsonDocument>(COLLECTION);
                var filter = Builders<BsonDocument>.Filter.Eq("userId", userId);
                var update  = Builders<BsonDocument>.Update
                    .Set("searchCount", 0)
                    .Set("updatedAt", DateTime.UtcNow);

                var result = await col.UpdateOneAsync(filter, update);

                return Ok(new
                {
                    success      = result.ModifiedCount > 0,
                    modifiedCount = result.ModifiedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting usage for {UserId}", userId);
                return StatusCode(500, new { message = "Error resetting usage." });
            }
        }
    }
}
