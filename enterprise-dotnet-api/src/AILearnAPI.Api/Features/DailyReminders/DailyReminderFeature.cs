using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using AILearnAPI.Domain.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using WebPush;

namespace AILearnAPI.Api.Features.DailyReminders;

[BsonIgnoreExtraElements]
public sealed class DailyReminderSubscription
{
    [BsonId, BsonRepresentation(BsonType.ObjectId)] public string? Id { get; set; }
    [BsonElement("userId")] public string UserId { get; set; } = "";
    [BsonElement("endpoint")] public string Endpoint { get; set; } = "";
    [BsonElement("p256dh")] public string P256dh { get; set; } = "";
    [BsonElement("auth")] public string Auth { get; set; } = "";
    [BsonElement("enabled")] public bool Enabled { get; set; } = true;
    [BsonElement("localTime")] public string LocalTime { get; set; } = "08:00";
    [BsonElement("timeZoneId")] public string TimeZoneId { get; set; } = "UTC";
    [BsonElement("lastSentLocalDate")] public string? LastSentLocalDate { get; set; }
    [BsonElement("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed record PushKeys(string P256dh, string Auth);
public sealed record SaveSubscriptionRequest(string Endpoint, PushKeys Keys, string LocalTime, string TimeZoneId);
public sealed record UpdateReminderRequest(bool Enabled, string LocalTime, string TimeZoneId);
public sealed record RemoveSubscriptionRequest(string Endpoint);

public sealed class DailyReminderRepository
{
    private readonly IMongoCollection<DailyReminderSubscription> _collection;
    public DailyReminderRepository(IMongoDatabase db) =>
        _collection = db.GetCollection<DailyReminderSubscription>("DailyReminderSubscriptions");

    public Task<List<DailyReminderSubscription>> ForUser(string userId) =>
        _collection.Find(x => x.UserId == userId).ToListAsync();
    public Task<List<DailyReminderSubscription>> Enabled() =>
        _collection.Find(x => x.Enabled).ToListAsync();
    public Task Upsert(DailyReminderSubscription value) => _collection.ReplaceOneAsync(
        x => x.UserId == value.UserId && x.Endpoint == value.Endpoint, value,
        new ReplaceOptions { IsUpsert = true });
    public Task UpdateSettings(string userId, bool enabled, string time, string zone) =>
        _collection.UpdateManyAsync(x => x.UserId == userId,
            Builders<DailyReminderSubscription>.Update.Set(x => x.Enabled, enabled)
                .Set(x => x.LocalTime, time).Set(x => x.TimeZoneId, zone).Set(x => x.UpdatedAt, DateTime.UtcNow));
    public Task MarkSent(string id, string localDate) => _collection.UpdateOneAsync(x => x.Id == id,
        Builders<DailyReminderSubscription>.Update.Set(x => x.LastSentLocalDate, localDate));
    public Task Remove(string userId, string endpoint) =>
        _collection.DeleteOneAsync(x => x.UserId == userId && x.Endpoint == endpoint);
    public Task RemoveByEndpoint(string endpoint) => _collection.DeleteOneAsync(x => x.Endpoint == endpoint);
}

public sealed class DailyReminderService
{
    private readonly DailyReminderRepository _repo;
    private readonly INoteRepository _notes;
    private readonly IConfiguration _config;
    private readonly ILogger<DailyReminderService> _logger;

    public DailyReminderService(DailyReminderRepository repo, INoteRepository notes,
        IConfiguration config, ILogger<DailyReminderService> logger)
        => (_repo, _notes, _config, _logger) = (repo, notes, config, logger);

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_config["WebPush:PublicKey"])
        && !string.IsNullOrWhiteSpace(_config["WebPush:PrivateKey"]);
    public string PublicKey => _config["WebPush:PublicKey"] ?? "";

    public async Task<bool> SendRandomNote(DailyReminderSubscription sub)
    {
        var notes = await _notes.GetByUserIdAsync(sub.UserId);
        if (notes.Count == 0) return false;
        var note = notes[Random.Shared.Next(notes.Count)];
        var payload = JsonSerializer.Serialize(new
        {
            title = "Morning note recall",
            body = $"{note.Topic} — take one minute to recall it before you open the answer.",
            url = $"/#/notes?noteId={Uri.EscapeDataString(note.Id ?? "")}",
            tag = $"note-recall-{DateTime.UtcNow:yyyy-MM-dd}"
        });
        try
        {
            var subscription = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
            var vapid = new VapidDetails(_config["WebPush:Subject"] ?? "mailto:admin@learnwithai.tech",
                PublicKey, _config["WebPush:PrivateKey"]!);
            using var client = new WebPushClient();
            await client.SendNotificationAsync(subscription, payload, vapid);
            return true;
        }
        catch (WebPushException ex) when ((int)ex.StatusCode is 404 or 410)
        {
            await _repo.RemoveByEndpoint(sub.Endpoint);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to send daily reminder to user {UserId}", sub.UserId);
            return false;
        }
    }
}

public sealed class DailyReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyReminderWorker> _logger;
    public DailyReminderWorker(IServiceScopeFactory scopeFactory, ILogger<DailyReminderWorker> logger)
        => (_scopeFactory, _logger) = (scopeFactory, logger);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<DailyReminderRepository>();
                var service = scope.ServiceProvider.GetRequiredService<DailyReminderService>();
                if (service.IsConfigured)
                {
                    foreach (var sub in await repo.Enabled())
                    {
                        var localNow = ToLocal(DateTime.UtcNow, sub.TimeZoneId);
                        if (!TimeOnly.TryParse(sub.LocalTime, out var due)) due = new TimeOnly(8, 0);
                        var localDate = localNow.ToString("yyyy-MM-dd");
                        var now = TimeOnly.FromDateTime(localNow);
                        if (sub.LastSentLocalDate != localDate && now >= due && now < due.AddHours(4)
                            && await service.SendRandomNote(sub) && sub.Id is not null)
                            await repo.MarkSent(sub.Id, localDate);
                    }
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Daily reminder worker cycle failed"); }
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private static DateTime ToLocal(DateTime utc, string zone)
    {
        try { return TimeZoneInfo.ConvertTimeFromUtc(utc, TimeZoneInfo.FindSystemTimeZoneById(zone)); }
        catch { return utc; }
    }
}

[ApiController, Route("api/reminders")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public sealed class DailyRemindersController : ControllerBase
{
    private readonly DailyReminderRepository _repo;
    private readonly DailyReminderService _service;
    public DailyRemindersController(DailyReminderRepository repo, DailyReminderService service)
        => (_repo, _service) = (repo, service);

    [HttpGet("vapid-public-key")]
    public IActionResult PublicKey() => _service.IsConfigured
        ? Ok(new { publicKey = _service.PublicKey })
        : StatusCode(503, new { message = "Push notifications are not configured on this server." });

    [HttpGet("settings")]
    public async Task<IActionResult> Settings()
    {
        var items = await _repo.ForUser(UserId());
        var first = items.FirstOrDefault();
        return Ok(new { enabled = items.Any(x => x.Enabled), localTime = first?.LocalTime ?? "08:00",
            timeZoneId = first?.TimeZoneId ?? "UTC", devices = items.Count, supported = _service.IsConfigured });
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe(SaveSubscriptionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Endpoint) || string.IsNullOrWhiteSpace(request.Keys.P256dh)
            || string.IsNullOrWhiteSpace(request.Keys.Auth)) return BadRequest(new { message = "Invalid push subscription." });
        await _repo.Upsert(new DailyReminderSubscription { UserId = UserId(), Endpoint = request.Endpoint,
            P256dh = request.Keys.P256dh, Auth = request.Keys.Auth, Enabled = true,
            LocalTime = ValidTime(request.LocalTime), TimeZoneId = request.TimeZoneId });
        return Ok(new { enabled = true });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> Update(UpdateReminderRequest request)
    {
        await _repo.UpdateSettings(UserId(), request.Enabled, ValidTime(request.LocalTime), request.TimeZoneId);
        return Ok(new { request.Enabled });
    }

    [HttpDelete("subscription")]
    public async Task<IActionResult> Remove(RemoveSubscriptionRequest request)
    { await _repo.Remove(UserId(), request.Endpoint); return NoContent(); }

    [HttpPost("test")]
    public async Task<IActionResult> Test()
    {
        var sub = (await _repo.ForUser(UserId())).FirstOrDefault(x => x.Enabled);
        if (sub is null) return BadRequest(new { message = "Enable the reminder on this device first." });
        return await _service.SendRandomNote(sub) ? Ok(new { sent = true })
            : BadRequest(new { message = "No notes were found or the notification could not be delivered." });
    }

    private string UserId() => User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
    private static string ValidTime(string value) => TimeOnly.TryParse(value, out _) ? value : "08:00";
}
