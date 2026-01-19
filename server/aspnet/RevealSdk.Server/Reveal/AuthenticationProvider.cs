using Reveal.Sdk;
using Reveal.Sdk.Data;
using Reveal.Sdk.Data.PostgreSQL;

namespace RevealSdk.Server.Reveal
{
    public class AuthenticationProvider : IRVAuthenticationProvider
    {
        public Task<IRVDataSourceCredential> ResolveCredentialsAsync(IRVUserContext userContext, RVDashboardDataSource dataSource)
        {
            IRVDataSourceCredential userCredential = new RVIntegratedAuthenticationCredential();
            if (dataSource is RVPostgresDataSource)
            {
                userCredential = new RVUsernamePasswordDataSourceCredential((string)userContext.Properties["Username"],
                        (string)userContext.Properties["Password"]);
            }
            return Task.FromResult(userCredential);
        }
    }
}