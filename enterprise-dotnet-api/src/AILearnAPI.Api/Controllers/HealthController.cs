using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/health")]
    public class HealthController : ControllerBase
    {
        private readonly IMongoDatabase _database;
        private readonly ILogger<HealthController> _logger;

        public HealthController(
            IMongoDatabase database,
            ILogger<HealthController> logger)
        {
            _database = database;
            _logger = logger;
        }

        // GET /api/health - Health check endpoint
        [HttpGet]
        public async Task<ActionResult> GetHealth()
        {
            try
            {
                // Check MongoDB connection by running a ping command
                var command = "{ ping: 1 }";
                await _database.RunCommandAsync(new MongoDB.Driver.JsonCommand<MongoDB.Bson.BsonDocument>(command));

                return Ok(new
                {
                    status = "OK",
                    mongodb = "Connected",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed");
                
                return StatusCode(500, new
                {
                    status = "Error",
                    mongodb = "Disconnected",
                    timestamp = DateTime.UtcNow,
                    error = ex.Message
                });
            }
        }
    }
}
