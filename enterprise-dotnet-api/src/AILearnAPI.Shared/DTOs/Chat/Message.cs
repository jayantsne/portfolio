using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AILearnAPI.Shared.DTOs.Chat
{
    public class Message
    {
        [BsonId]
        public ObjectId Id { get; set; }

        public string? ConversationId { get; set; }

        public string Role { get; set; }

        public string Content { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string? Model { get; set; }          // which AI model
        public int? TokensUsed { get; set; }        // analytics
        public bool IsError { get; set; } = false;  // error tracking
    }
}
