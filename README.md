# Invela Project

A full-stack TypeScript application with a focus on robust architecture and maintainable code.

## Project Overview

This project implements a full-stack application with:
- TypeScript for type safety
- Express.js for the backend API
- React for the frontend
- PostgreSQL database with Drizzle ORM

## TypeScript Compilation Strategy

This project uses a carefully designed TypeScript compilation strategy to resolve module system conflicts between ES Modules and CommonJS. Key components include:

1. **TypeScript Configuration**: Configured for proper CommonJS module output
   - Appropriate path mappings for `@db/*` and `@shared/*`
   - Configured proper `outDir` and `rootDir` settings

2. **Server Package Structure**: Server-specific `package.json` with `"type": "commonjs"`
   - Overrides the root `"type": "module"` setting
   - Specifies appropriate Node.js version requirements

3. **Build Process**: Comprehensive build and watch scripts
   - Development scripts with proper TypeScript compilation
   - Production build process 

4. **Database Integration**: Updated database adapter to use compiled JavaScript files
   - Robust error handling with detailed error messages
   - Clear TypeScript interfaces for database access

## Getting Started

### Prerequisites
- Node.js 18 or later
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/EvanCNavarro/invela.git
cd invela
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations
```bash
npm run migrate
```

### Development

Start the development server:
```bash
npm run dev
```

### Production Build

Build for production:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

- `/server` - Backend Express.js application
- `/db` - Database models and migrations
- `/shared` - Shared types and utilities
- `/client` - Frontend React application
- `/dist` - Compiled JavaScript output

## License

[MIT](LICENSE)