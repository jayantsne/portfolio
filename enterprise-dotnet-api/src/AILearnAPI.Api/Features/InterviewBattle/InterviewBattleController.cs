using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AILearnAPI.Api.Features.InterviewBattle;

[ApiController,Route("api/interview-battle"),Authorize(AuthenticationSchemes=JwtBearerDefaults.AuthenticationScheme)]
public sealed class InterviewBattleApiController:ControllerBase
{
    private readonly IInterviewBattleService _service; public InterviewBattleApiController(IInterviewBattleService service)=>_service=service;
    private string UserId=>User.FindFirstValue(JwtRegisteredClaimNames.Sub)??User.FindFirstValue(ClaimTypes.NameIdentifier)??"";
    [HttpPost("sessions")] public async Task<ActionResult<BattleSession>> Create(CreateBattleSessionRequest request){if(!ModelState.IsValid)return ValidationProblem(ModelState);return Created("",await _service.CreateAsync(UserId,request));}
    [HttpGet("sessions/{id}")] public async Task<ActionResult<BattleSession>> Get(string id){var x=await _service.GetAsync(UserId,id);return x is null?NotFound():Ok(x);}
    [HttpPost("sessions/{id}/question")] public async Task<ActionResult<BattleQuestion>> Question(string id,CancellationToken ct)=>Ok(await _service.NextQuestionAsync(UserId,id,ct));
    [HttpPost("sessions/{id}/answers")] public async Task<ActionResult<BattleAnswer>> Answer(string id,SubmitBattleAnswerRequest request,CancellationToken ct){if(!ModelState.IsValid)return ValidationProblem(ModelState);return Ok(await _service.EvaluateAsync(UserId,id,request,ct));}
    [HttpPost("sessions/{id}/answers/{answerId}/retry")] public async Task<ActionResult<RetryComparison>> Retry(string id,string answerId,RetryBattleAnswerRequest request,CancellationToken ct){if(!ModelState.IsValid)return ValidationProblem(ModelState);return Ok(await _service.RetryAsync(UserId,id,answerId,request,ct));}
    [HttpPost("sessions/{id}/answers/{answerId}/follow-up")] public async Task<ActionResult<BattleQuestion>> FollowUp(string id,string answerId)=>Ok(await _service.FollowUpAsync(UserId,id,answerId));
    [HttpPost("sessions/{id}/complete")] public async Task<ActionResult<BattleSummary>> Complete(string id)=>Ok(await _service.CompleteAsync(UserId,id));
    [HttpGet("history")] public async Task<ActionResult<List<BattleSession>>> History()=>Ok(await _service.HistoryAsync(UserId));
    [HttpGet("history/{id}")] public async Task<ActionResult<BattleHistoryDetail>> HistoryDetail(string id){var x=await _service.HistoryDetailAsync(UserId,id);return x==null?NotFound():Ok(x);}
    [HttpGet("revision")] public async Task<ActionResult<List<InterviewRevisionItem>>> Revision()=>Ok(await _service.RevisionAsync(UserId));
    [HttpPost("revision/{id}/attempt")] public async Task<ActionResult<InterviewRevisionItem>> RevisionAttempt(string id,RevisionAttemptRequest request){if(!ModelState.IsValid)return ValidationProblem(ModelState);return Ok(await _service.RevisionAttemptAsync(UserId,id,request));}
    [HttpGet("english-mistakes")] public async Task<ActionResult<List<UserEnglishMistake>>> Mistakes([FromQuery]string? type)=>Ok(await _service.MistakesAsync(UserId,type));
    [HttpPatch("english-mistakes/{id}/mastered")] public async Task<ActionResult<UserEnglishMistake>> MarkMistake(string id,[FromBody]bool mastered)=>Ok(await _service.MarkMistakeAsync(UserId,id,mastered));
}
