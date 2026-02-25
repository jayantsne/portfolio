using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.UserProgress;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/user-progress")]
    public class UserProgressController : ControllerBase
    {
        private readonly IUserProgressService _userProgressService;
        private readonly ILogger<UserProgressController> _logger;

        public UserProgressController(
            IUserProgressService userProgressService,
            ILogger<UserProgressController> logger)
        {
            _userProgressService = userProgressService;
            _logger = logger;
        }

        // GET /api/user-progress/{userId} - Get/create user progress
        [HttpGet("{userId}")]
        public async Task<ActionResult<UserProgressDto>> GetUserProgress(string userId)
        {
            try
            {
                var progress = await _userProgressService.GetUserProgressAsync(userId);
                return Ok(progress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user progress for {UserId}", userId);
                return StatusCode(500, new { message = "Error fetching user progress" });
            }
        }

        // PUT /api/user-progress/{userId} - Update progress (upsert)
        [HttpPut("{userId}")]
        public async Task<ActionResult<UserProgressDto>> UpdateUserProgress(
            string userId,
            [FromBody] UpdateUserProgressDto dto)
        {
            try
            {
                var progress = await _userProgressService.UpdateUserProgressAsync(userId, dto);
                return Ok(progress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user progress for {UserId}", userId);
                return StatusCode(500, new { message = "Error updating user progress" });
            }
        }
    }
}
