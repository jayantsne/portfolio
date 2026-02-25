using AILearnAPI.Api.Models;
using MongoDB.Driver;

namespace AILearnAPI.Api.Repositories;

/// <summary>
/// Repository implementation for AiTopicPrompts using MongoDB
/// </summary>
public class AiTopicPromptRepository : IAiTopicPromptRepository
{
    private readonly IMongoCollection<AiTopicPrompt> _collection;
    private readonly ILogger<AiTopicPromptRepository> _logger;

    public AiTopicPromptRepository(
        IMongoDatabase database,
        ILogger<AiTopicPromptRepository> logger)
    {
        _collection = database.GetCollection<AiTopicPrompt>("aiTopicPrompts");
        _logger = logger;
        
        // Create indexes for better performance
        CreateIndexes();
    }

    private void CreateIndexes()
    {
        try
        {
            var indexKeys = Builders<AiTopicPrompt>.IndexKeys
                .Ascending(x => x.TopicName)
                .Ascending(x => x.ExamCode);
            
            var indexModel = new CreateIndexModel<AiTopicPrompt>(
                indexKeys,
                new CreateIndexOptions { Name = "idx_topic_exam", Unique = true });
            
            _collection.Indexes.CreateOne(indexModel);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Index may already exist");
        }
    }

    public async Task<AiTopicPrompt?> GetByTopicAndExamAsync(string topicName, string examCode)
    {
        try
        {
            var filter = Builders<AiTopicPrompt>.Filter.And(
                Builders<AiTopicPrompt>.Filter.Eq(x => x.TopicName, topicName),
                Builders<AiTopicPrompt>.Filter.Eq(x => x.ExamCode, examCode)
            );

            var result = await _collection.Find(filter).FirstOrDefaultAsync();

            if (result != null)
            {
                _logger.LogInformation(
                    "Found prompt for topic '{TopicName}' and exam '{ExamCode}'",
                    topicName, examCode);
            }
            else
            {
                _logger.LogWarning(
                    "No prompt found for topic '{TopicName}' and exam '{ExamCode}'",
                    topicName, examCode);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Error retrieving prompt for topic '{TopicName}' and exam '{ExamCode}'",
                topicName, examCode);
            throw;
        }
    }

    public async Task<IEnumerable<AiTopicPrompt>> GetAllByExamCodeAsync(string examCode)
    {
        try
        {
            var filter = Builders<AiTopicPrompt>.Filter.Eq(x => x.ExamCode, examCode);
            var sort = Builders<AiTopicPrompt>.Sort.Ascending(x => x.TopicName);

            var results = await _collection.Find(filter).Sort(sort).ToListAsync();

            _logger.LogInformation(
                "Retrieved {Count} prompts for exam '{ExamCode}'",
                results.Count, examCode);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving prompts for exam '{ExamCode}'", examCode);
            throw;
        }
    }

    public async Task<AiTopicPrompt?> GetByIdAsync(string id)
    {
        try
        {
            var filter = Builders<AiTopicPrompt>.Filter.Eq(x => x.Id, id);
            return await _collection.Find(filter).FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving prompt with ID {Id}", id);
            throw;
        }
    }

    public async Task<IEnumerable<AiTopicPrompt>> GetAllAsync()
    {
        try
        {
            var sort = Builders<AiTopicPrompt>.Sort
                .Ascending(x => x.ExamCode)
                .Ascending(x => x.TopicName);

            var results = await _collection.Find(_ => true).Sort(sort).ToListAsync();

            _logger.LogInformation("Retrieved {Count} total prompts", results.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all prompts");
            throw;
        }
    }
}
