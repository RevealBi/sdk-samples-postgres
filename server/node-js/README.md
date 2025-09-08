# Node.js Reveal SDK Server

This Node.js implementation matches the functionality of the ASP.NET Core Reveal SDK Server.

## Features Implemented

### 1. UserContextProvider
- Parses the `x-header-one` HTTP header to extract `userId` and `orderId`
- Implements role-based access control (Admin vs User)
- Sets filter tables based on user role
- Matches the C# `UserContextProvider.cs` functionality

### 2. AuthenticationProvider
- Uses credentials from user context properties
- Returns `RVUsernamePasswordDataSourceCredential` for SQL Server data sources
- Matches the C# `AuthenticationProvider.cs` functionality

### 3. DataSourceProvider
- Updates SQL Server data source properties from user context
- Sets host and database from configuration
- Matches the C# `DataSourceProvider.cs` functionality

### 4. DataSourceItemProvider
- Comprehensive implementation with all the same logic as C#
- Handles stored procedures with parameters
- Implements custom queries based on data source item ID
- Role-based filtering for table access
- Matches the C# `DataSourceProvider.cs` ChangeDataSourceItemAsync method

### 5. DashboardProvider
- Provides dashboard files from the Dashboards directory
- Matches the C# `DashboardProvider.cs` functionality

### 6. ObjectFilter (DataSourceItemFilter)
- Filters data source items based on user permissions
- Uses filterTables from user context
- Matches the C# `DataSourceItemFilter.cs` functionality

### 7. API Endpoints
- `/dashboards/:name/thumbnail` - Gets dashboard thumbnail information
- `/dashboards/names` - Lists available dashboards with names and titles
- Matches the endpoints defined in C# `Program.cs`

## Configuration

The server uses environment variables for SQL Server configuration. Create a `.env` file in the project root:

```env
# SQL Server Configuration
SQL_SERVER_HOST=localhost
SQL_SERVER_DATABASE=Northwind
SQL_SERVER_USERNAME=sa
SQL_SERVER_PASSWORD=your-password-here
SQL_SERVER_SCHEMA=dbo

# Server Configuration
PORT=5111
```

You can copy `.env.example` to `.env` and update the values as needed.

## Usage

1. Create a `.env` file with your SQL Server connection details (see `.env.example`)
2. Ensure dashboard files are present in the `Dashboards` directory
3. Run the server with `npm start`
4. The server will listen on the port specified in the `PORT` environment variable (default: 5111)

## Header-based Authentication

The server expects an `x-header-one` header in the format:
```
x-header-one: userId:BLONP,orderId:12345
```

- Users with `userId: "BLONP"` or `null` are granted Admin role
- All other users get User role
- Admin users have access to all tables
- User role is restricted to "Customers" and "Orders" tables

## Data Source Item Handling

The implementation handles various scenarios:

1. **Stored Procedures**: 
   - `TenMostExpensiveProducts`
   - `CustOrderHist` and `CustOrdersOrders` (with customer ID parameter)

2. **Custom Queries**:
   - `CustomerOrders` - filters by order ID
   - Table filtering based on user role

3. **Role-based Access**:
   - Admin users: Full access to all data
   - Regular users: Filtered data based on customer ID

This Node.js implementation provides identical functionality to the C# ASP.NET Core version.
