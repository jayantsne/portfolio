using System.IO.Compression;
using System.Security.Claims;
using System.Security.Cryptography;
using AILearnAPI.Domain.Constants;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace AILearnAPI.Api.Features.AndroidReleases;

public sealed class AndroidReleaseStorageOptions { public string BasePath { get; set; } = "android-releases"; public int MaximumFileSizeMb { get; set; } = 200; }
[BsonIgnoreExtraElements]
public sealed class AndroidAppRelease {
    [BsonId,BsonRepresentation(BsonType.ObjectId)] public string? Id{get;set;}
    public string VersionName{get;set;}=""; public int VersionCode{get;set;} public string ReleaseNotes{get;set;}="";
    public string FileName{get;set;}=""; public string StoredFileName{get;set;}=""; public long FileSize{get;set;}
    public string Sha256{get;set;}=""; public string ContentType{get;set;}="application/vnd.android.package-archive";
    public bool IsActive{get;set;} public bool IsPublished{get;set;} public int MinimumSupportedVersionCode{get;set;}=1;
    public string UploadedByUserId{get;set;}=""; public DateTime UploadedAt{get;set;}=DateTime.UtcNow; public DateTime? PublishedAt{get;set;}
    public long DownloadCount{get;set;} public DateTime? LastDownloadedAt{get;set;}
}
public sealed class AndroidAppDownloadLog {
    [BsonId,BsonRepresentation(BsonType.ObjectId)] public string? Id{get;set;} public string ReleaseId{get;set;}="";
    public string UserId{get;set;}=""; public string VersionName{get;set;}=""; public int VersionCode{get;set;}
    public DateTime DownloadedAt{get;set;}=DateTime.UtcNow; public string IpAddress{get;set;}=""; public string UserAgent{get;set;}="";
    public bool DownloadSucceeded{get;set;} public string FailureReason{get;set;}="";
}
public sealed record AndroidReleaseDto(string Id,string VersionName,int VersionCode,string ReleaseNotes,long FileSize,string Sha256,bool IsActive,bool IsPublished,int MinimumSupportedVersionCode,DateTime UploadedAt,DateTime? PublishedAt,long DownloadCount);

public sealed class AndroidReleaseRepository {
    readonly IMongoCollection<AndroidAppRelease> releases; readonly IMongoCollection<AndroidAppDownloadLog> logs;
    public AndroidReleaseRepository(IMongoDatabase db){releases=db.GetCollection<AndroidAppRelease>("AndroidAppReleases");logs=db.GetCollection<AndroidAppDownloadLog>("AndroidAppDownloadLogs");}
    public async Task EnsureIndexes(){await releases.Indexes.CreateManyAsync(new[]{new CreateIndexModel<AndroidAppRelease>(Builders<AndroidAppRelease>.IndexKeys.Ascending(x=>x.VersionCode),new CreateIndexOptions{Unique=true}),new CreateIndexModel<AndroidAppRelease>(Builders<AndroidAppRelease>.IndexKeys.Descending(x=>x.UploadedAt)),new CreateIndexModel<AndroidAppRelease>(Builders<AndroidAppRelease>.IndexKeys.Ascending(x=>x.IsActive).Ascending(x=>x.IsPublished))});}
    public Task<List<AndroidAppRelease>> All()=>releases.Find(_=>true).SortByDescending(x=>x.UploadedAt).ToListAsync();
    public async Task<AndroidAppRelease?> ById(string id)=>ObjectId.TryParse(id,out _)?await releases.Find(x=>x.Id==id).FirstOrDefaultAsync():null;
    public Task<AndroidAppRelease?> Active()=>releases.Find(x=>x.IsActive&&x.IsPublished).FirstOrDefaultAsync()!;
    public async Task Insert(AndroidAppRelease value){await EnsureIndexes();await releases.InsertOneAsync(value);}
    public async Task Publish(string id){await releases.UpdateManyAsync(x=>x.IsActive,Builders<AndroidAppRelease>.Update.Set(x=>x.IsActive,false));await releases.UpdateOneAsync(x=>x.Id==id,Builders<AndroidAppRelease>.Update.Set(x=>x.IsPublished,true).Set(x=>x.IsActive,true).Set(x=>x.PublishedAt,DateTime.UtcNow));}
    public Task Unpublish(string id)=>releases.UpdateOneAsync(x=>x.Id==id,Builders<AndroidAppRelease>.Update.Set(x=>x.IsPublished,false).Set(x=>x.IsActive,false));
    public Task Delete(string id)=>releases.DeleteOneAsync(x=>x.Id==id&&!x.IsActive&&!x.IsPublished);
    public Task Downloaded(string id)=>releases.UpdateOneAsync(x=>x.Id==id,Builders<AndroidAppRelease>.Update.Inc(x=>x.DownloadCount,1).Set(x=>x.LastDownloadedAt,DateTime.UtcNow));
    public Task Log(AndroidAppDownloadLog log)=>logs.InsertOneAsync(log);
}

[ApiController,Route("api/admin/android-releases")]
[Authorize(AuthenticationSchemes=JwtBearerDefaults.AuthenticationScheme,Roles=UserRoles.Admin)]
public sealed class AndroidReleasesController:ControllerBase {
    readonly AndroidReleaseRepository repo; readonly AndroidReleaseStorageOptions options; readonly string root;
    public AndroidReleasesController(AndroidReleaseRepository repo,IOptions<AndroidReleaseStorageOptions> options,IWebHostEnvironment env){this.repo=repo;this.options=options.Value;root=Path.GetFullPath(Path.IsPathRooted(this.options.BasePath)?this.options.BasePath:Path.Combine(env.ContentRootPath,this.options.BasePath));Directory.CreateDirectory(root);}
    [HttpGet] public async Task<IActionResult> All()=>Ok((await repo.All()).Select(Map));
    [HttpGet("active")] public async Task<IActionResult> Active(){var value=await repo.Active();return value is null?NotFound(new{message="No published Android release is available."}):Ok(Map(value));}
    [HttpPost,RequestSizeLimit(220_000_000)] public async Task<IActionResult> Upload([FromForm]IFormFile file,[FromForm]string versionName,[FromForm]int versionCode,[FromForm]string? releaseNotes,[FromForm]bool publishImmediately=false,[FromForm]int minimumSupportedVersionCode=1){
        if(file is null||file.Length==0)return BadRequest(new{message="APK file is required."}); if(!System.Text.RegularExpressions.Regex.IsMatch(versionName??"",@"^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$"))return BadRequest(new{message="Use a semantic version such as 1.0.0."}); if(versionCode<1)return BadRequest(new{message="Version code must be positive."}); if((releaseNotes?.Length??0)>5000)return BadRequest(new{message="Release notes cannot exceed 5000 characters."});
        var max=(long)options.MaximumFileSizeMb*1024*1024;if(file.Length>max)return StatusCode(413,new{message=$"APK exceeds {options.MaximumFileSizeMb} MB."});if(!string.Equals(Path.GetExtension(file.FileName),".apk",StringComparison.OrdinalIgnoreCase))return BadRequest(new{message="Only .apk files are accepted."});
        await using var input=file.OpenReadStream();var signature=new byte[4];if(await input.ReadAsync(signature)!=4||signature[0]!=0x50||signature[1]!=0x4b||signature[2]!=0x03||signature[3]!=0x04)return BadRequest(new{message="The file is not a valid APK/ZIP package."});input.Position=0;
        var stored=$"{Guid.NewGuid():N}.apk";var destination=SafePath(stored);await using(var output=System.IO.File.Create(destination)){await input.CopyToAsync(output,HttpContext.RequestAborted);}string hash;await using(var hashStream=System.IO.File.OpenRead(destination)){hash=Convert.ToHexString(await SHA256.HashDataAsync(hashStream,HttpContext.RequestAborted)).ToLowerInvariant();}
        var value=new AndroidAppRelease{VersionName=versionName,VersionCode=versionCode,ReleaseNotes=releaseNotes??"",FileName=Path.GetFileName(file.FileName),StoredFileName=stored,FileSize=file.Length,Sha256=hash,UploadedByUserId=UserId(),MinimumSupportedVersionCode=Math.Max(1,minimumSupportedVersionCode)};
        try{await repo.Insert(value);if(publishImmediately&&value.Id is not null)await repo.Publish(value.Id);}catch(MongoWriteException ex)when(ex.WriteError?.Category==ServerErrorCategory.DuplicateKey){System.IO.File.Delete(destination);return Conflict(new{message="That version code already exists."});}return CreatedAtAction(nameof(All),Map(value));
    }
    [HttpPost("{id}/publish")] public async Task<IActionResult> Publish(string id){if(await repo.ById(id)is null)return NotFound();await repo.Publish(id);return NoContent();}
    [HttpPost("{id}/unpublish")] public async Task<IActionResult> Unpublish(string id){await repo.Unpublish(id);return NoContent();}
    [HttpDelete("{id}")] public async Task<IActionResult> Delete(string id){var value=await repo.ById(id);if(value is null)return NotFound();if(value.IsActive||value.IsPublished)return Conflict(new{message="Unpublish and deactivate this release before deleting it."});var path=SafePath(value.StoredFileName);await repo.Delete(id);if(System.IO.File.Exists(path))System.IO.File.Delete(path);return NoContent();}
    [HttpGet("{id}/download")] public async Task<IActionResult> Download(string id){var value=await repo.ById(id);if(value is null||!value.IsPublished)return NotFound(new{message="Published APK not found."});var path=SafePath(value.StoredFileName);if(!System.IO.File.Exists(path)){await Audit(value,false,"File missing from protected storage");return NotFound(new{message="APK file is unavailable."});}Response.Headers.CacheControl="private, no-store";Response.Headers.Pragma="no-cache";await repo.Downloaded(id);await Audit(value,true,"");return PhysicalFile(path,"application/vnd.android.package-archive",$"LearnWithAI-{value.VersionName}.apk",enableRangeProcessing:true);}
    string SafePath(string stored){var path=Path.GetFullPath(Path.Combine(root,Path.GetFileName(stored)));if(!path.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Invalid release path.");return path;}
    Task Audit(AndroidAppRelease x,bool ok,string reason)=>repo.Log(new AndroidAppDownloadLog{ReleaseId=x.Id!,UserId=UserId(),VersionName=x.VersionName,VersionCode=x.VersionCode,IpAddress=HttpContext.Connection.RemoteIpAddress?.ToString()??"",UserAgent=Request.Headers.UserAgent.ToString()[..Math.Min(Request.Headers.UserAgent.ToString().Length,300)],DownloadSucceeded=ok,FailureReason=reason});
    string UserId()=>User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")??"unknown";
    static AndroidReleaseDto Map(AndroidAppRelease x)=>new(x.Id??"",x.VersionName,x.VersionCode,x.ReleaseNotes,x.FileSize,x.Sha256,x.IsActive,x.IsPublished,x.MinimumSupportedVersionCode,x.UploadedAt,x.PublishedAt,x.DownloadCount);
}

[ApiController,Route("api/app-version/android")]
public sealed class AndroidAppVersionController:ControllerBase{readonly AndroidReleaseRepository repo;public AndroidAppVersionController(AndroidReleaseRepository repo)=>this.repo=repo;[HttpGet,AllowAnonymous]public async Task<IActionResult> Get([FromQuery]int? currentVersionCode=null){var x=await repo.Active();return x is null?Ok(new{isAvailable=false}):Ok(new{isAvailable=true,latestVersionName=x.VersionName,latestVersionCode=x.VersionCode,minimumSupportedVersionCode=x.MinimumSupportedVersionCode,updateRequired=currentVersionCode.HasValue&&currentVersionCode<x.MinimumSupportedVersionCode,releaseNotes=x.ReleaseNotes});}}
