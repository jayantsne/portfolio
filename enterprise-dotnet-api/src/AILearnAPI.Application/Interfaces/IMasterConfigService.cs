using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Application.Interfaces
{
    public interface IMasterConfigService
    {
        Task<MasterConfigDto> GetAsync();
        Task<MasterConfigDto> UpdateAsync(UpdateMasterConfigDto dto, string updatedByUserId);
    }
}
