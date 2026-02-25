using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.AIQA;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/ai-qa")]
    public class AIQAController : ControllerBase
    {
        private readonly IAIQAService _aiqaService;
        private readonly ILogger<AIQAController> _logger;

        public AIQAController(
            IAIQAService aiqaService,
            ILogger<AIQAController> logger)
        {
            _aiqaService = aiqaService;
            _logger = logger;
        }

        // GET /api/ai-qa/{userId} - Get all AI Q&As for user
        [HttpGet("{userId}")]
        public async Task<ActionResult<List<AIQADto>>> GetUserAIQAs(string userId)
        {
            try
            {
                var aiqas = await _aiqaService.GetUserAIQAsAsync(userId);
                return Ok(aiqas);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting AI Q&As for user {UserId}", userId);
                return StatusCode(500, new { message = "Error fetching AI Q&As" });
            }
        }

        // POST /api/ai-qa - Save AI Q&A
        [HttpPost]
        public async Task<ActionResult<AIQADto>> CreateAIQA([FromBody] CreateAIQADto dto)
        {
            try
            {
                var aiqa = await _aiqaService.CreateAIQAAsync(dto);
                return Ok(aiqa);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating AI Q&A");
                return StatusCode(500, new { message = "Error saving AI Q&A" });
            }
        }

        // DELETE /api/ai-qa/{id} - Delete AI Q&A
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteAIQA(string id)
        {
            try
            {
                var deleted = await _aiqaService.DeleteAIQAAsync(id);
                
                if (!deleted)
                    return NotFound(new { message = $"AI Q&A with id {id} not found" });
                
                return Ok(new { message = "AI Q&A deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting AI Q&A {Id}", id);
                return StatusCode(500, new { message = "Error deleting AI Q&A" });
            }
        }

        // PUT /api/ai-qa/{id} - Update AI Q&A
        [HttpPut("{id}")]
        public async Task<ActionResult<AIQADto>> UpdateAIQA(string id, [FromBody] UpdateAIQADto dto)
        {
            try
            {
                var aiqa = await _aiqaService.UpdateAIQAAsync(id, dto);
                
                if (aiqa == null)
                    return NotFound(new { message = $"AI Q&A with id {id} not found" });
                
                return Ok(aiqa);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating AI Q&A {Id}", id);
                return StatusCode(500, new { message = "Error updating AI Q&A" });
            }
        }
    }
}
