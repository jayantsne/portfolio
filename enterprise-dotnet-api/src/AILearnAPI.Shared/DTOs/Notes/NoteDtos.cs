namespace AILearnAPI.Shared.DTOs.Notes
{
    /// <summary>Returned to the client for a single saved note.</summary>
    public class NoteDto
    {
        public string        id        { get; set; } = string.Empty;
        public string        topic     { get; set; } = string.Empty;
        public string        category  { get; set; } = string.Empty;
        public List<string>  tags      { get; set; } = new();
        public string        content   { get; set; } = string.Empty;
        public DateTime      savedAt   { get; set; }
        public long          savedAtMs { get; set; }  // epoch ms — used by frontend
        public bool          isPinned  { get; set; }
    }

    /// <summary>Body expected when creating a new note.</summary>
    public class CreateNoteDto
    {
        public string        topic    { get; set; } = string.Empty;
        public string        category { get; set; } = string.Empty;
        public List<string>  tags     { get; set; } = new();
        public string        content  { get; set; } = string.Empty;
    }

    /// <summary>Body expected when updating an existing note (all fields optional except content).</summary>
    public class UpdateNoteDto
    {
        public string?       topic    { get; set; }
        public string?       category { get; set; }
        public List<string>? tags     { get; set; }
        public string        content  { get; set; } = string.Empty;
    }
}
