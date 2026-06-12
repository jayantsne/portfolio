namespace AILearnAPI.Application.Interfaces;

public interface ISecretProvider
{
    string? GetOptional(string key);
    string GetRequired(string key);
}
