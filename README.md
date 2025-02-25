# Full-Stack TypeScript Application

This is a modern full-stack TypeScript application with robust API testing and documentation.

## Features

- 🔄 **API Versioning**: Built-in support for multiple API versions with clear documentation
- 📚 **OpenAPI Documentation**: Comprehensive API documentation using Swagger/OpenAPI
- 🧪 **API Testing**: Automated tests to validate API endpoints against documentation
- 🔒 **Authentication**: Secure authentication system with refresh tokens
- 🌐 **WebSockets**: Real-time communication with typed messages
- 🧩 **Type Safety**: Shared types between frontend and backend for consistency
- ⚡ **Modern Stack**: Uses React, Express, TypeScript, and modern tools

## Project Structure

```
.
├── client/                 # Frontend React application
├── server/                 # Backend Express server
├── shared/                 # Shared types and utilities
├── db/                     # Database schema and migrations
├── scripts/                # Utility scripts
└── docs/                   # Documentation
```

## API Versioning

The application uses a standardized API versioning system to ensure backward compatibility. See [API Versioning Strategy](server/docs/API_VERSIONING.md) for details.

API consumers can specify the API version in several ways:

1. **URL Path**: `/api/v1/users`
2. **Accept Header**: `Accept: application/vnd.company.v1+json`
3. **Custom Header**: `X-API-Version: v1`
4. **Query Parameter**: `?api-version=v1`

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Setup environment variables
   ```
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server
   ```
   npm run dev
   ```

5. Access the application
   ```
   # Main application (frontend and API)
   http://localhost:5001
   
   # API documentation
   http://localhost:5001/api-docs
   ```

### Development Modes

The application can be run in several modes:

- **Integrated mode** (default): `npm run dev`
  - Starts the Express server on port 5001, which serves both the frontend application and API
  - This is the recommended way to run the application during development
  - Access the application at http://localhost:5001

- **Separate servers**: `npm run dev:separate`
  - Starts Vite development server on port 3000 and Express backend on port 5001
  - Only use this if you need to work on the frontend in isolation
  - For full functionality, always use port 5001 to access your application

### Build for Production

```
npm run build
```

## Testing

### Running Tests

```
# Run all tests
npm test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running.

To generate a static version of the API documentation:

```
npm run update-docs
```

## Generating API Client

You can automatically generate a TypeScript client for the API:

```
npm run generate:api-client
```

This creates a strongly-typed client in `client/src/api/` that can be used to interact with the backend.

## License

This project is licensed under the MIT License - see the LICENSE file for details.