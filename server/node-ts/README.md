# Reveal SDK TypeScript Server

A TypeScript implementation of the Reveal SDK Node.js server with SQL Server data source support, mimicking the JavaScript code structure.

## Project Structure

```
src/
├── main.ts          - Entry point (equivalent to main.js)
├── reveal.ts        - Main Reveal class with SDK configuration
├── revealdom.ts     - DOM manipulation and dashboard routes
└── app.ts          - Original TypeScript implementation

dashboards/          - Dashboard files (.rdash)
package.json         - Project dependencies and scripts
tsconfig.json        - TypeScript configuration
.env.example         - Environment variables template
```

## Features

### Reveal SDK Configuration (`reveal.ts`)
- User context provider with header-based authentication
- SQL Server authentication provider
- Data source provider for SQL Server connections
- Data source item provider for custom queries and stored procedures
- Data source item filter for role-based access control
- Dashboard provider for file-based dashboard storage
- Dashboard storage provider for saving dashboards

### API Endpoints (`revealdom.ts`)
- `GET /` - Main page
- `GET /dashboards/` - List dashboard filenames
- `GET /dashboards/names` - Dashboard names and titles
- `GET /dashboards/{name}/exists` - Check if dashboard exists
- `GET /dashboards/visualizations` - List visualizations from dashboards
- `GET /api-docs` - Swagger API documentation
- `GET /swagger.json` - OpenAPI specification

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from template:
   ```bash
   copy .env.example .env
   ```

3. Configure environment variables in `.env`:
   ```
   PORT=5111
   SQL_SERVER_HOST=your_server_host
   SQL_SERVER_DATABASE=your_database_name
   SQL_SERVER_USERNAME=your_username
   SQL_SERVER_PASSWORD=your_password
   SQL_SERVER_SCHEMA=dbo
   ```

## Running the Server

### Development Mode
```bash
npm start
```

### Production Build
```bash
npm run build
npm run start:prod
```

### Direct TypeScript Execution
```bash
npx ts-node src/main.ts
```

## Dependencies

### Runtime Dependencies
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `reveal-sdk-node` - Reveal SDK for Node.js
- `dotenv` - Environment variable management
- `swagger-ui-express` - API documentation
- `swagger-jsdoc` - Swagger specification generation
- `@revealbi/dom` - Reveal BI DOM manipulation

### Development Dependencies
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `nodemon` - Development server with auto-restart
- `@types/*` - Type definitions for libraries

## User Context and Security

The server implements role-based access control:

- **Admin Users** (BLONP): Full access to all tables and data
- **Regular Users**: Limited access to Customers and Orders tables with row-level security

User identification is done via the `x-header-one` header with format:
```
x-header-one: userid:CUSTOMERID,orderid:ORDERID
```

## Dashboard Management

Dashboards are stored in the `dashboards/` directory as `.rdash` files. The server provides:

- Dashboard listing and metadata extraction
- Dashboard existence checking
- Visualization enumeration
- File-based storage and retrieval

## API Documentation

When the server is running, visit:
- `http://localhost:5111/api-docs` - Interactive Swagger UI
- `http://localhost:5111/swagger.json` - OpenAPI specification

## Comparison with JavaScript Version

This TypeScript implementation provides:
- Type safety and better IDE support
- Identical functionality to the JavaScript version
- Same API endpoints and behavior
- Compatible with existing Reveal BI clients
- Enhanced error handling and code documentation
