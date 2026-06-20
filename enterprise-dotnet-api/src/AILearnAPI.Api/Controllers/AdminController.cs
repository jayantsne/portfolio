using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Shared.DTOs.Admin;
using MongoDB.Driver;
using BCrypt.Net;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AILearnAPI.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly IMongoCollection<AdminUser> _adminUsers;
        private readonly IMongoCollection<AIProvider> _aiProviders;
        private readonly IConfiguration _configuration;
        private readonly ISecretProvider _secrets;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            IMongoDatabase database,
            IConfiguration configuration,
            ISecretProvider secrets,
            IWebHostEnvironment environment,
            ILogger<AdminController> logger)
        {
            _adminUsers = database.GetCollection<AdminUser>("adminusers");
            _aiProviders = database.GetCollection<AIProvider>("aiproviders");
            _configuration = configuration;
            _secrets = secrets;
            _environment = environment;
            _logger = logger;
        }

        // POST /api/admin/login
        [HttpPost("login")]
        public async Task<ActionResult<AdminLoginResponseDto>> Login([FromBody] AdminLoginDto dto)
        {
            try
            {
                var user = await _adminUsers.Find(u => u.Username == dto.Username).FirstOrDefaultAsync();

                if (user == null)
                {
                    return Ok(new AdminLoginResponseDto
                    {
                        Success = false,
                        Message = "Invalid username or password"
                    });
                }

                if (user.Locked)
                {
                    return Ok(new AdminLoginResponseDto
                    {
                        Success = false,
                        Message = "Account is locked. Contact administrator."
                    });
                }

                // Verify password
                bool validPassword = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

                if (!validPassword)
                {
                    // Increment login attempts
                    var update = Builders<AdminUser>.Update
                        .Inc(u => u.LoginAttempts, 1)
                        .Set(u => u.Locked, user.LoginAttempts >= 4); // Lock after 5 failed attempts

                    await _adminUsers.UpdateOneAsync(u => u.Id == user.Id, update);

                    return Ok(new AdminLoginResponseDto
                    {
                        Success = false,
                        Message = "Invalid username or password"
                    });
                }

                // Reset login attempts and update last login
                var successUpdate = Builders<AdminUser>.Update
                    .Set(u => u.LoginAttempts, 0)
                    .Set(u => u.LastLogin, DateTime.UtcNow);

                await _adminUsers.UpdateOneAsync(u => u.Id == user.Id, successUpdate);

                // Generate JWT token
                var token = GenerateJwtToken(user);
                SetAuthCookie(token);

                return Ok(new AdminLoginResponseDto
                {
                    Success = true,
                    Message = "Login successful",
                    Token = string.Empty,
                    User = new AdminUserDto
                    {
                        Username = user.Username,
                        Email = user.Email,
                        Role = user.Role,
                        LastLogin = DateTime.UtcNow
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error");
                return StatusCode(500, new AdminLoginResponseDto
                {
                    Success = false,
                    Message = "Login failed. Please try again."
                });
            }
        }

        // GET /api/admin/providers - Get all AI providers
        [HttpGet("providers")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "ADMIN")]
        public async Task<ActionResult<List<AIProviderDto>>> GetProviders()
        {
            try
            {
                var providers = await _aiProviders.Find(_ => true)
                    .SortByDescending(p => p.Priority)
                    .ToListAsync();

                var dtos = providers.Select(p => new AIProviderDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    DisplayName = p.DisplayName,
                    Enabled = p.Enabled,
                    Priority = p.Priority,
                    Type = p.Type,
                    Endpoint = p.Endpoint,
                    Model = p.Model,
                    ApiKeys = p.ApiKeys.Select(k => MaskApiKey(k)).ToList(), // Mask keys
                    Stats = new AIProviderStatsDto
                    {
                        TotalRequests = p.Stats.TotalRequests,
                        SuccessfulRequests = p.Stats.SuccessfulRequests,
                        FailedRequests = p.Stats.FailedRequests,
                        AvgResponseTime = p.Stats.AvgResponseTime,
                        LastUsed = p.Stats.LastUsed
                    },
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                }).ToList();

                return Ok(dtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting providers");
                return StatusCode(500, new { message = "Error fetching providers" });
            }
        }

        // PUT /api/admin/providers/{id} - Update provider
        [HttpPut("providers/{id}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "ADMIN")]
        public async Task<ActionResult> UpdateProvider(string id, [FromBody] UpdateProviderDto dto)
        {
            try {
                var updateBuilder = Builders<AIProvider>.Update;
                var updates = new List<UpdateDefinition<AIProvider>>();

                if (dto.Enabled.HasValue)
                    updates.Add(updateBuilder.Set(p => p.Enabled, dto.Enabled.Value));

                if (dto.Priority.HasValue)
                    updates.Add(updateBuilder.Set(p => p.Priority, dto.Priority.Value));

                if (dto.ApiKeys != null)
                    updates.Add(updateBuilder.Set(p => p.ApiKeys, dto.ApiKeys));

                updates.Add(updateBuilder.Set(p => p.UpdatedAt, DateTime.UtcNow));

                var combinedUpdate = updateBuilder.Combine(updates);
                var result = await _aiProviders.UpdateOneAsync(p => p.Id == id, combinedUpdate);

                if (result.MatchedCount == 0)
                    return NotFound(new { message = "Provider not found" });

                return Ok(new { message = "Provider updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating provider");
                return StatusCode(500, new { message = "Error updating provider" });
            }
        }

        // POST /api/admin/providers/add-key - Add API key to provider
        [HttpPost("providers/add-key")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "ADMIN")]
        public async Task<ActionResult> AddApiKey([FromBody] AddApiKeyDto dto)
        {
            try
            {
                var provider = await _aiProviders.Find(p => p.Id == dto.ProviderId).FirstOrDefaultAsync();
                if (provider == null)
                    return NotFound(new { message = "Provider not found" });

                // Add key if not already exists
                if (!provider.ApiKeys.Contains(dto.ApiKey))
                {
                    var update = Builders<AIProvider>.Update
                        .Push(p => p.ApiKeys, dto.ApiKey)
                        .Set(p => p.UpdatedAt, DateTime.UtcNow);

                    await _aiProviders.UpdateOneAsync(p => p.Id == dto.ProviderId, update);
                }

                return Ok(new { message = "API key added successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding API key");
                return StatusCode(500, new { message = "Error adding API key" });
            }
        }

        // DELETE /api/admin/providers/remove-key - Remove API key
        [HttpDelete("providers/remove-key")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "ADMIN")]
        public async Task<ActionResult> RemoveApiKey([FromBody] RemoveApiKeyDto dto)
        {
            try
            {
                var provider = await _aiProviders.Find(p => p.Id == dto.ProviderId).FirstOrDefaultAsync();
                if (provider == null)
                    return NotFound(new { message = "Provider not found" });

                // Find and remove key that ends with provided last 4 chars
                var keyToRemove = provider.ApiKeys.FirstOrDefault(k => k.EndsWith(dto.ApiKey));
                if (keyToRemove != null)
                {
                    var update = Builders<AIProvider>.Update
                        .Pull(p => p.ApiKeys, keyToRemove)
                        .Set(p => p.UpdatedAt, DateTime.UtcNow);

                    await _aiProviders.UpdateOneAsync(p => p.Id == dto.ProviderId, update);
                }

                return Ok(new { message = "API key removed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing API key");
                return StatusCode(500, new { message = "Error removing API key" });
            }
        }

        private string GenerateJwtToken(AdminUser user)
        {
            var secretKey = _secrets.GetRequired("JwtSettings:SecretKey");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim("username", user.Username),
                new Claim("userId", user.Id),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.Email, user.Email)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["JwtSettings:Issuer"] ?? "AILearnAPI",
                audience: _configuration["JwtSettings:Audience"] ?? "AILearnAPI",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private void SetAuthCookie(string token)
        {
            Response.Cookies.Append("ailearn_auth", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment() || Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = DateTimeOffset.UtcNow.AddHours(24)
            });
        }

        private string MaskApiKey(string key)
        {
            if (string.IsNullOrEmpty(key) || key.Length < 8)
                return "****";

            return $"{key.Substring(0, 4)}...{key.Substring(key.Length - 4)}";
        }
    }
}
