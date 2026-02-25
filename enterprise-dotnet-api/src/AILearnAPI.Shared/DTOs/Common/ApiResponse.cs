namespace AILearnAPI.Shared.DTOs.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }

        public static ApiResponse<T> SuccessResponse(T data, string? message = null, Dictionary<string, object>? metadata = null)
        {
            return new ApiResponse<T>
            {
                Success = true,
                Data = data,
                Message = message,
                Metadata = metadata
            };
        }

        public static ApiResponse<T> ErrorResponse(string message)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message
            };
        }
    }

    public class ErrorResponse
    {
        public string Message { get; set; } = string.Empty;
        public int StatusCode { get; set; }
        public Dictionary<string, string[]>? Errors { get; set; }
    }
}
