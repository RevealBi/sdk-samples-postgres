using Reveal.Sdk;
using Reveal.Sdk.Data;
using Reveal.Sdk.Data.PostgreSQL;

namespace RevealSdk.Server.Reveal
{
    internal class DataSourceProvider : IRVDataSourceProvider
    {
        public Task<RVDashboardDataSource> ChangeDataSourceAsync(IRVUserContext userContext, RVDashboardDataSource dataSource)
        {
            if (dataSource is RVPostgresDataSource SqlDs)
            {
                SqlDs.Host = (string)userContext.Properties["Host"];
                SqlDs.Database = (string)userContext.Properties["Database"];
            }
            return Task.FromResult(dataSource);
        }

        public Task<RVDataSourceItem>? ChangeDataSourceItemAsync(IRVUserContext userContext, string dashboardId, RVDataSourceItem dataSourceItem)
        {
            // ****
            // Every request for data passes thru changeDataSourceItem
            // You can set query properties based on the incoming requests
            // for example, you can check:
            // - dsi.Id
            // - dsi.Table
            // - dsi.FunctionName
            // - dsi.Title
            // and take a specific action on the dsi as this request is processed
            // ****

            if (dataSourceItem is not RVPostgresDataSourceItem sqlDsi) return Task.FromResult(dataSourceItem);

            // Ensure data source is updated
            ChangeDataSourceAsync(userContext, sqlDsi.DataSource);

            // Get the UserContext properties
            string customerId = userContext.UserId;
            string? orderId = userContext.Properties["OrderId"]?.ToString();
            bool isAdmin = userContext.Properties["Role"]?.ToString() == "Admin";

            // Get filterTables from userContext properties
            var filterTables = userContext.Properties["FilterTables"] as string[] ?? Array.Empty<string>();

            // Execute query based on the incoming client request
            switch (sqlDsi.Id)
            {
                // Example of how to use a stored procedure 
                case "TenMostExpensiveProducts":
                    sqlDsi.FunctionName = "Ten Most Expensive Products";
                    break;

                // Example of how to use a stored procedure with a parameter
                case "CustOrderHist":
                case "CustOrdersOrders":
                    sqlDsi.FunctionName = sqlDsi.Id;
                    sqlDsi.FunctionParameters = new Dictionary<string, object> { { "customer_id", customerId } };
                    break;


                // Example of an ad-hoc query with a parameter.
                // Never concatenate userContext values into the SQL text. Use a named
                // placeholder (@name) in CustomQuery and pass the value in
                // CustomQueryParameters - the value is then bound by the driver, so it
                // can never be interpreted as SQL.
                //
                // Bound parameters are typed, so the value has to match the column type.
                // orderid is numeric (smallint), and passing the raw string would make
                // Postgres resolve "smallint = text" and fail with 42883. Parse the value
                // instead of casting inside the query. A missing or non-numeric OrderId
                // falls back to -1, which matches no row, rather than returning every row.
                case "CustomerOrders":
                    sqlDsi.CustomQuery = "SELECT * FROM Orders WHERE OrderId = @orderId";
                    sqlDsi.CustomQueryParameters = new Dictionary<string, object>
                    {
                        ["@orderId"] = int.TryParse(orderId, out var parsedOrderId) ? parsedOrderId : -1
                    };
                    break;

                default:
                    // Check for general table access logic
                    if (filterTables.Contains(sqlDsi.Table))
                    {
                        if (isAdmin)
                        {
                            // The table name is an identifier, so it cannot be a parameter.
                            // It is safe here because it was matched against FilterTables,
                            // a server-side allow list, and not taken from client input.
                            sqlDsi.CustomQuery = $"SELECT * FROM {sqlDsi.Table}";
                        }
                        else
                        {
                            sqlDsi.CustomQuery = $"SELECT * FROM {sqlDsi.Table} WHERE customerId = @customerId";
                            sqlDsi.CustomQueryParameters = new Dictionary<string, object>
                            {
                                ["@customerId"] = customerId
                            };
                        }
                    }
                break;
            }
            return Task.FromResult(dataSourceItem);
        }
    }
}