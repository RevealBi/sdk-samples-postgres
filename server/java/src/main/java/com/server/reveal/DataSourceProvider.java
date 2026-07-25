package com.server.reveal;

import io.revealbi.core.IRVUserContext;
import io.revealbi.core.data.IRVDataSourceProvider;
import io.revealbi.core.data.RVDashboardDataSource;
import io.revealbi.core.data.RVDataSourceItem;
import io.revealbi.core.data.RVPostgresDataSource;
import io.revealbi.core.data.RVPostgresDataSourceItem;
import org.springframework.stereotype.Component;

import java.util.HashMap;

@Component
public class DataSourceProvider implements IRVDataSourceProvider {


    public RVDataSourceItem changeDataSourceItem(IRVUserContext userContext, String dashboardsID, RVDataSourceItem dataSourceItem) {

        // ****
        // Every request for data passes thru changeDataSourceItem
        // You can set query properties based on the incoming requests
        // for example, you can check:
        // - dsi.getId()
        // - dsi.getTable()
        // - dsi.getFunctionName()
        // - dsi.getTitle()
        // and take a specific action on the dsi as this request is processed
        // ****

        if (!(dataSourceItem instanceof RVPostgresDataSourceItem)) {
            return dataSourceItem;
        }

        RVPostgresDataSourceItem postgresDsi = (RVPostgresDataSourceItem) dataSourceItem;

        // Ensure data source is updated
        changeDataSource(userContext, dataSourceItem.getDataSource());

        // Get the UserContext properties
        String customerId = userContext.getUserId();
        String orderId = userContext.getProperties().get("OrderId") != null ?
            userContext.getProperties().get("OrderId").toString() : null;
        boolean isAdmin = "Admin".equals(userContext.getProperties().get("Role"));

        // Get filterTables from userContext properties
        String[] filterTables = userContext.getProperties().get("FilterTables") instanceof String[] ?
            (String[]) userContext.getProperties().get("FilterTables") : new String[0];

        // Execute query based on the incoming client request
        switch (postgresDsi.getId()) {
            // Example of how to use a stored procedure
            case "TenMostExpensiveProducts":
                postgresDsi.setFunctionName("Ten Most Expensive Products");
                break;

            // Example of how to use a stored procedure with a parameter
            case "CustOrderHist":
            case "CustOrdersOrders":
                postgresDsi.setFunctionName(postgresDsi.getId());
                HashMap<String, Object> functionParameters = new HashMap<>();
                functionParameters.put("customer_id", customerId);
                postgresDsi.setFunctionParameters(functionParameters);
                break;

            // Example of an ad-hoc query with a parameter.
            // Never concatenate userContext values into the SQL text. Use a named
            // placeholder (@name) in the custom query and pass the value in
            // setCustomQueryParameters - the value is then bound by the driver, so it
            // can never be interpreted as SQL.
            //
            // Bound parameters are typed, so the value has to match the column type.
            // orderid is numeric (smallint), and passing the raw string would make
            // Postgres resolve "smallint = text" and fail with 42883. Parse the value
            // instead of casting inside the query. A missing or non-numeric OrderId
            // falls back to -1, which matches no row, rather than returning every row.
            case "CustomerOrders":
                int parsedOrderId;
                try {
                    parsedOrderId = Integer.parseInt(orderId != null ? orderId.trim() : "");
                } catch (NumberFormatException e) {
                    parsedOrderId = -1;
                }
                postgresDsi.setCustomQuery("SELECT * FROM orders WHERE orderid = @orderId");
                HashMap<String, Object> orderParameters = new HashMap<>();
                orderParameters.put("@orderId", parsedOrderId);
                postgresDsi.setCustomQueryParameters(orderParameters);
                break;

            default:
                // Check for general table access logic
                if (java.util.Arrays.asList(filterTables).contains(postgresDsi.getTable())) {
                    if (isAdmin) {
                        // The table name is an identifier, so it cannot be a parameter.
                        // It is safe here because it was matched against FilterTables,
                        // a server-side allow list, and not taken from client input.
                        postgresDsi.setCustomQuery("SELECT * FROM " + postgresDsi.getTable());
                    } else {
                        postgresDsi.setCustomQuery("SELECT * FROM " + postgresDsi.getTable() + " WHERE customerid = @customerId");
                        HashMap<String, Object> customerParameters = new HashMap<>();
                        customerParameters.put("@customerId", customerId);
                        postgresDsi.setCustomQueryParameters(customerParameters);
                    }
                }
                break;
        }
        return dataSourceItem;
    }

    public RVDashboardDataSource changeDataSource(IRVUserContext userContext, RVDashboardDataSource dataSource) {
        if (dataSource instanceof RVPostgresDataSource) {
            RVPostgresDataSource postgresDataSource = (RVPostgresDataSource) dataSource;

            postgresDataSource.setHost((String) userContext.getProperties().get("Host"));
            postgresDataSource.setDatabase((String) userContext.getProperties().get("Database"));
        }
        return dataSource;
    }
}
