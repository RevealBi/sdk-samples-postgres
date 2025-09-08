using Microsoft.Extensions.Options;
using Reveal.Sdk;
using RevealSdk.Server.Configuration;

namespace RevealSdk.Server.Reveal
{

    public class UserContextProvider : IRVUserContextProvider
    {
        private readonly ServerOptions _options;

        public UserContextProvider(IOptions<ServerOptions> sqlOptions)
        {
            _options = sqlOptions.Value;
        }

        IRVUserContext IRVUserContextProvider.GetUserContext(HttpContext aspnetContext)
        {
            string? headerValue = aspnetContext.Request.Headers["x-header-one"].FirstOrDefault();
            string? userId = null;
            string? orderId = null;

            if (!string.IsNullOrEmpty(headerValue))
            {
                var pairs = headerValue.Split(',');
                foreach (var pair in pairs)
                {
                    var kv = pair.Split(':', 2);
                    if (kv.Length == 2)
                    {
                        var key = kv[0].Trim();
                        var value = kv[1].Trim();
                        if (key.Equals("userId", StringComparison.OrdinalIgnoreCase))
                            userId = value;
                        else if (key.Equals("orderId", StringComparison.OrdinalIgnoreCase))
                            orderId = value;
                    }
                }
            }

            // default to User role
            string role = "User";

            // null is used here just for demo 
            if (userId == "BLONP" || userId == null)
            {
                role = "Admin";
            }

            var filterTables = role == "Admin"
                ? Array.Empty<string>()
                : ["customers", "orders"];

            // Use hardcoded host if _options.Host is empty
            string host = string.IsNullOrEmpty(_options.Host)
                ? ""
                : _options.Host;

            var props = new Dictionary<string, object>() {
                { "OrderId", orderId ?? string.Empty },
                { "Role", role },
                { "Host", host },
                { "Database", _options.Database },
                { "Username", _options.Username },
                { "Password", _options.Password },
                { "Schema", _options.Schema },
                { "Port", _options.Port },
                { "FilterTables", filterTables }
            };

            return new RVUserContext(userId, props);
        }
    }
}