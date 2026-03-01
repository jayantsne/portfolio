namespace AILearnAPI.Shared.DTOs.Notes
{
    /// <summary>Returned to the client for a single saved note.</summary>
    public class NoteDto
    {
        public string   id        { get; set; } = string.Empty;
        public string   topic     { get; set; } = string.Empty;
        public string   content   { get; set; } = string.Empty;
        public DateTime savedAt   { get; set; }
        public long     savedAtMs { get; set; }  // epoch ms — used by frontend for sorting/display
    }

    /// <summary>Body expected when creating a new note.</summary>
    public class CreateNoteDto
    {
        public string topic   { get; set; } = string.Empty;
        public string content { get; set; } = string.Empty;
    }
}
