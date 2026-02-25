using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.Questions;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/questions")]
    public class QuestionsController : ControllerBase
    {
        private readonly IQuestionService _questionService;
        private readonly ILogger<QuestionsController> _logger;

        public QuestionsController(
            IQuestionService questionService,
            ILogger<QuestionsController> logger)
        {
            _questionService = questionService;
            _logger = logger;
        }

        // GET /api/questions - Get all questions with metadata
        [HttpGet]
        public async Task<ActionResult<QuestionsResponseDto>> GetAllQuestions()
        {
            try
            {
                var result = await _questionService.GetAllQuestionsAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all questions");
                return StatusCode(500, new { message = "Error fetching questions" });
            }
        }

        // GET /api/questions/{id} - Get question by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionDto>> GetQuestionById(int id)
        {
            try
            {
                var question = await _questionService.GetQuestionByIdAsync(id);
                
                if (question == null)
                    return NotFound(new { message = $"Question with id {id} not found" });
                
                return Ok(question);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting question {Id}", id);
                return StatusCode(500, new { message = "Error fetching question" });
            }
        }

        // POST /api/questions - Add new question (auto-increment ID)
        [HttpPost]
        public async Task<ActionResult<QuestionDto>> CreateQuestion([FromBody] CreateQuestionDto dto)
        {
            try
            {
                var question = await _questionService.CreateQuestionAsync(dto);
                return CreatedAtAction(nameof(GetQuestionById), new { id = question.id }, question);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating question");
                return StatusCode(500, new { message = "Error creating question" });
            }
        }

        // PUT /api/questions/{id} - Update question
        [HttpPut("{id}")]
        public async Task<ActionResult<QuestionDto>> UpdateQuestion(int id, [FromBody] UpdateQuestionDto dto)
        {
            try
            {
                var question = await _questionService.UpdateQuestionAsync(id, dto);
                
                if (question == null)
                    return NotFound(new { message = $"Question with id {id} not found" });
                
                return Ok(question);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating question {Id}", id);
                return StatusCode(500, new { message = "Error updating question" });
            }
        }

        // DELETE /api/questions/{id} - Delete single question
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteQuestion(int id)
        {
            try
            {
                var deleted = await _questionService.DeleteQuestionAsync(id);
                
                if (!deleted)
                    return NotFound(new { message = $"Question with id {id} not found" });
                
                return Ok(new { message = "Question deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting question {Id}", id);
                return StatusCode(500, new { message = "Error deleting question" });
            }
        }

        // DELETE /api/questions - Clear all questions
        [HttpDelete]
        public async Task<ActionResult> DeleteAllQuestions()
        {
            try
            {
                var deleted = await _questionService.DeleteAllQuestionsAsync();
                
                if (!deleted)
                    return NotFound(new { message = "No questions to delete" });
                
                return Ok(new { message = "All questions cleared successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all questions");
                return StatusCode(500, new { message = "Error clearing questions" });
            }
        }

        // POST /api/questions/import - Bulk import questions
        [HttpPost("import")]
        public async Task<ActionResult> ImportQuestions([FromBody] ImportQuestionsDto dto)
        {
            try
            {
                var (imported, failed) = await _questionService.ImportQuestionsAsync(dto.questions);
                
                return Ok(new
                {
                    message = "Questions imported successfully",
                    imported = imported,
                    failed = failed
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing questions");
                return StatusCode(500, new { message = "Error importing questions" });
            }
        }
    }
}
