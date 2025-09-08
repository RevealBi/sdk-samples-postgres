using Reveal.Sdk;
using Reveal.Sdk.Data;
using Reveal.Sdk.Data.PostgreSQL    ;

namespace RevealSdk.Server.Reveal
{
    public class DataSourceItemFilter : IRVObjectFilter
    {
        public Task<bool> Filter(IRVUserContext userContext, RVDashboardDataSource dataSource)
        {
            throw new NotImplementedException();
        }
        public Task<bool> Filter(IRVUserContext userContext, RVDataSourceItem dataSourceItem)
        {
            if (userContext?.Properties != null && dataSourceItem is RVPostgresDataSourceItem dataSQLItem)
            {
                if (userContext.Properties.TryGetValue("FilterTables", out var filterTablesObj) &&
                    filterTablesObj is string[] filterTables)
                {
                    // If filterTables is empty, allow all
                    if (filterTables.Length == 0)
                        return Task.FromResult(true);

                    // Otherwise, restrict to allowed tables/procedures
                    if ((dataSQLItem.Table != null && !filterTables.Contains(dataSQLItem.Table)) ||
                        (dataSQLItem.FunctionName != null && !filterTables.Contains(dataSQLItem.FunctionName)))
                    {
                        return Task.FromResult(false);
                    }
                }
            }
            return Task.FromResult(true);
        }
    }
}