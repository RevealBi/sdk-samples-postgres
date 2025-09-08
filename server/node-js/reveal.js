var express = require('express');
var reveal = require('reveal-sdk-node');
var cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const dashboardDefaultDirectory = path.join(__dirname, 'Dashboards');

app.use(cors());

// Step 0 - Create API to Retrieve Dashboards
app.get('/dashboards', (req, res) => {
  const directoryPath = './dashboards';
  fs.readdir(directoryPath, (err, files) => {
    const fileNames = files.map((file) => {
    const { name } = path.parse(file);
    return { name };
    });
    res.send(fileNames);
  });
});

// Step 1 - Optional, userContext
const userContextProvider = (request) => {
  const headerValue = request.headers['x-header-one']; 
  
  let userId = null;
  let orderId = null;

  if (headerValue) {
      const pairs = headerValue.split(',');
      
      for (const pair of pairs) {
          const kv = pair.split(':');
          if (kv.length === 2) {
              const key = kv[0].trim().toLowerCase();
              const value = kv[1].trim();
              
              if (key === 'userid') {
                  userId = value || 'BLONP'; // Default to BLONP if value is empty
              } else if (key === 'orderid') {
                  orderId = value;
              }
          }
      }
  }
  
  // If no header or no userId found, default to BLONP
  if (!userId) {
      userId = 'BLONP';
  }
  
  var props = new Map();

  // Set userId and orderId in properties
  props.set("userId", userId);
  props.set("OrderId", orderId || "");
  
  // Default to User role
  let role = "User";
  
  // Only specific users get Admin role
  if (userId === "BLONP") {
      role = "Admin";
  }

  // Set role in properties
  props.set("Role", role);
  
  // Set filterTables based on role
  const filterTables = role === "Admin" 
      ? [] 
      : ["customers", "orders"];
  
  props.set("FilterTables", filterTables);
  
  // Set SQL Server properties from .env file
  props.set("Host", process.env.SQL_SERVER_HOST);
  props.set("Database", process.env.SQL_SERVER_DATABASE);
  props.set("Username", process.env.SQL_SERVER_USERNAME);
  props.set("Password", process.env.SQL_SERVER_PASSWORD);
  props.set("Schema", process.env.SQL_SERVER_SCHEMA);
    
  return new reveal.RVUserContext(userId, props);
};

// Step 2 - Set up your Authentication Provider
const authenticationProvider = async (userContext, dataSource) => {
    if (dataSource instanceof reveal.RVPostgresDataSource) {
      const username = userContext.properties.get("Username") || process.env.SQL_SERVER_USERNAME;
      const password = userContext.properties.get("Password") || process.env.SQL_SERVER_PASSWORD;
      return new reveal.RVUsernamePasswordDataSourceCredential(username, password);
    }
}

// Step 3 - Set up your Data Source Provider
const dataSourceProvider = async (userContext, dataSource) => {
    if (dataSource instanceof reveal.RVPostgresDataSource) {
        const host = userContext.properties.get("Host") || process.env.SQL_SERVER_HOST;
        const database = userContext.properties.get("Database") || process.env.SQL_SERVER_DATABASE;        
        dataSource.host = host;
        dataSource.database = database;
  }
  return dataSource;
}

// Step 4 - Set up your Data Source Item Provider
const dataSourceItemProvider = async (userContext, dataSourceItem) => {
    try {
        if (!(dataSourceItem instanceof reveal.RVPostgresDataSourceItem || dataSourceItem instanceof reveal.RVPostgresDataSourceItem)) {
            return dataSourceItem;
        }

        // Ensure data source is updated with userContext
        await dataSourceProvider(userContext, dataSourceItem.dataSource);

        // Get the UserContext properties
        const customerId = userContext.userId;
        const orderId = userContext.properties.get("OrderId");
        const isAdmin = userContext.properties.get("Role") === "Admin";
        const filterTables = userContext.properties.get("FilterTables") || [];

        // Execute query based on the incoming client request
        switch (dataSourceItem.id) {
            // Example of how to use a stored procedure 
            case "TenMostExpensiveProducts":
                dataSourceItem.functionName = "Ten Most Expensive Products";
                break;

            // Example of how to use a stored procedure with a parameter
            case "CustOrderHist":
            case "CustOrdersOrders":
                dataSourceItem.functionName = dataSourceItem.id;
                dataSourceItem.functionParameters = {
                    customer_id: customerId
                };
                break;

            // Example of an ad-hoc-query
            case "CustomerOrders":
                const customQuery = `SELECT * FROM orders WHERE orderid = '${orderId}'`;
                dataSourceItem.customQuery = customQuery;
                break;

            default:
                // Check for general table access logic
                if (filterTables.includes(dataSourceItem.table)) {
                    if (isAdmin) {
                        const adminQuery = `SELECT * FROM ${dataSourceItem.table}`;
                        dataSourceItem.customQuery = adminQuery;
                    } else {
                        const userQuery = `SELECT * FROM ${dataSourceItem.table} WHERE customerid = '${customerId}'`;
                        dataSourceItem.customQuery = userQuery;
                    }
                }
                break;
        }

        return dataSourceItem;
    } catch (error) {
        console.error('ERROR in DataSourceItemProvider:', error);
        return dataSourceItem;
    }
};

// DashboardProvider - matches TypeScript implementation
const dashboardProvider = async (userContext, dashboardId) => {
    try {
        const filePath = path.join(dashboardDefaultDirectory, `${dashboardId}.rdash`);
        
        if (fs.existsSync(filePath)) {
            const stream = fs.createReadStream(filePath);
            return stream;
        } else {
            throw new Error(`Dashboard file not found: ${filePath}`);
        }
    } catch (error) {
        console.error('ERROR in DashboardProvider:', error);
        throw error;
    }
};

// DashboardStorageProvider - matches TypeScript implementation  
const dashboardStorageProvider = async (userContext, dashboardId, stream) => {
    try {
        const userId = userContext?.properties?.userId || userContext?.userId;
        
        let savePath;
        
        if (userId === 'ALFKI') {
            savePath = path.join(dashboardDefaultDirectory, `${dashboardId}.rdash`);
        } else {
            savePath = path.join(dashboardDefaultDirectory, `${dashboardId}.rdash`);
        }
        
        await pipelineAsync(stream, fs.createWriteStream(savePath));
    } catch (error) {
        console.error('ERROR in DashboardStorageProvider:', error);
        throw error;
    }
};

// DataSourceItemFilter - simplified version
const dataSourceItemFilter = async (userContext, item) => {
    if (!(item instanceof reveal.RVPostgresDataSourceItem || item instanceof reveal.RVPostgresDataSourceItem)) {
        return false;
    }
    
    const role = userContext?.properties?.get("Role") || "User";
    
    // Admin can see all tables
    if (role === "Admin") {
        return true;
    }
    
    // Non-admin can only see tables in filterTables
    const filterTables = userContext?.properties?.get("FilterTables") || [];
    const tableName = item.table?.toLowerCase();
    
    return filterTables.some(filterTable => 
        tableName === filterTable.toLowerCase() || 
        tableName?.endsWith('.' + filterTable.toLowerCase())
    );
};

// Final Step - Set up your Reveal Options
const revealOptions = {
    userContextProvider: userContextProvider,
    authenticationProvider: authenticationProvider,
    dataSourceProvider: dataSourceProvider,
    dataSourceItemProvider: dataSourceItemProvider,
    dataSourceItemFilter: dataSourceItemFilter,
    // localFileStoragePath: "data",
    // settings: {
    //   maxInMemoryCells: 100000,
    //   maxTotalStringsSize: 10,
    //   licenseKey: "your_license_key_here"
    // }
}

// Export the middleware for reveal
module.exports = reveal(revealOptions);