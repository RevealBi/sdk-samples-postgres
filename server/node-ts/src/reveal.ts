import express, { Request, Response } from 'express';
import reveal, {
    IRVUserContext,
    RevealOptions,
    RVDashboardDataSource,
    RVDataSourceItem,
    RVPostgresDataSource,
    RVPostgresDataSourceItem,
    RVUserContext,
    RVUsernamePasswordDataSourceCredential,
} from 'reveal-sdk-node';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { IncomingMessage } from 'http';
import { promisify } from 'util';
import { pipeline, Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const dashboardDefaultDirectory = path.join(process.cwd(), 'dashboards');
const pipelineAsync = promisify(pipeline);

app.use(cors());

// Step 0 - Create API to Retrieve Dashboards
app.get('/dashboards', (req: Request, res: Response) => {
  const directoryPath = './dashboards';
  fs.readdir(directoryPath, (err: NodeJS.ErrnoException | null, files: string[]) => {
    if (err) {
      res.status(500).send({ error: 'Unable to scan directory' });
      return;
    }
    const fileNames = files.map((file: string) => {
      const { name } = path.parse(file);
      return { name };
    });
    res.send(fileNames);
  });
});

// Step 1 - Optional, userContext
const userContextProvider = (request: IncomingMessage): RVUserContext => {
  const headerValue = request.headers['x-header-one'] as string | undefined; 
  
  let userId: string | null = null;
  let orderId: string | null = null;

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
  
  const props = new Map<string, any>();

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
    
  return new RVUserContext(userId, props);
};

// Step 2 - Set up your Authentication Provider
const authenticationProvider = async (userContext: IRVUserContext | null, dataSource: RVDashboardDataSource) => {
        if (dataSource instanceof RVPostgresDataSource) {
            const username = userContext?.properties.get("Username") as string;
            const password = userContext?.properties.get("Password") as string;
            return new RVUsernamePasswordDataSourceCredential(username, password);
        }
        return null;
}

// Step 3 - Set up your Data Source Provider
const dataSourceProvider = async (userContext: IRVUserContext | null, dataSource: RVDashboardDataSource) => {
    if (dataSource instanceof RVPostgresDataSource) {
        const host = userContext?.properties.get("Host") as string;
        const database = userContext?.properties.get("Database") as string;
        dataSource.host = host;
        dataSource.database = database;
    }
    return dataSource;
}

// Step 4 - Set up your Data Source Item Provider
const dataSourceItemProvider = async (userContext: IRVUserContext | null, dataSourceItem: RVDataSourceItem) => {
    try {
        if (!(dataSourceItem instanceof RVPostgresDataSourceItem)) {
            return dataSourceItem;
        }

        // Ensure data source is updated with userContext
        await dataSourceProvider(userContext, dataSourceItem.dataSource);

        // Get the UserContext properties
        const customerId = userContext?.userId;
        const orderId = userContext?.properties.get("OrderId");
        const isAdmin = userContext?.properties.get("Role") === "Admin";
        const filterTables = userContext?.properties.get("FilterTables") as string[] || [];

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
                dataSourceItem.functionParameters = { customer_id: customerId };
                break;

            // Example of an ad-hoc-query
            case "CustomerOrders":
                const customQuery = `SELECT * FROM orders WHERE orderid = '${orderId}'`;
                dataSourceItem.customQuery = customQuery;
                break;

            default:
                // Check for general table access logic
                if (filterTables.includes(dataSourceItem.table || "")) {
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
const dashboardProvider = async (userContext: IRVUserContext | null, dashboardId: string) => {
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
const dashboardStorageProvider = async (userContext: IRVUserContext | null, dashboardId: string, stream: Readable) => {
    try {
        const userId = userContext?.properties?.get("userId") || userContext?.userId;
        
        let savePath: string;
        
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
const dataSourceItemFilter = async (userContext: IRVUserContext | null, item: RVDataSourceItem): Promise<boolean> => {
    if (!(item instanceof RVPostgresDataSourceItem || item instanceof RVPostgresDataSourceItem)) {
        return false;
    }
    const role = userContext?.properties?.get("Role") || "User";
    
    // Admin can see all tables
    if (role === "Admin") {
        return true;
    }
    
    // Non-admin can only see tables in filterTables
    const filterTables = userContext?.properties?.get("FilterTables") as string[] || [];
    const tableName = item.table?.toLowerCase();
    
    return filterTables.some((filterTable: string) => 
        tableName === filterTable.toLowerCase() || 
        tableName?.endsWith('.' + filterTable.toLowerCase())
    );
};

// Final Step - Set up your Reveal Options
const revealOptions: RevealOptions = {
    userContextProvider: userContextProvider,
    authenticationProvider: authenticationProvider,
    dataSourceProvider: dataSourceProvider,
    dataSourceItemProvider: dataSourceItemProvider,
    dataSourceItemFilter: dataSourceItemFilter,
    dashboardProvider: dashboardProvider,
    dashboardStorageProvider: dashboardStorageProvider,
    // localFileStoragePath: "data",
    // settings: {
    //   maxInMemoryCells: 100000,
    //   maxTotalStringsSize: 10,
    //   licenseKey: "your_license_key_here"
    // }
}

// Export the middleware for reveal
export function createRevealMiddleware() {
    return reveal(revealOptions);
}
