# Invela Complete Setup Guide

**Step-by-step instructions for complete project recreation**

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database access
- Git installed
- Code editor (VS Code recommended)

## 1. Environment Setup

### Clone and Install
```bash
# Clone the repository
git clone <your-repo-url>
cd invela-platform

# Install dependencies
npm install
```

### Environment Configuration
Create `.env` file in project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Application Settings
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secure-session-secret-here

# Optional: Storybook
STORYBOOK_PORT=6006

# API Keys (if using external services)
OPENAI_API_KEY=your-openai-key-here
SENDGRID_API_KEY=your-sendgrid-key-here
```

## 2. Database Setup

### Create PostgreSQL Database
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE invela_platform;

-- Create user (optional)
CREATE USER invela_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE invela_platform TO invela_user;
```

### Initialize Schema
```bash
# Push database schema (creates all 32 tables)
npm run db:push

# Verify schema creation
npm run db:studio
```

### Seed Demo Data (Optional)
```bash
# Run demo data seeding if available
npm run seed:demo
```

## 3. Application Startup

### Development Mode
```bash
# Start development server (includes hot reload)
npm run dev

# Application will be available at:
# Frontend: http://localhost:3000
# API: http://localhost:3000/api
# WebSocket: ws://localhost:3000/ws
```

### Production Mode
```bash
# Build application
npm run build

# Set production environment
export NODE_ENV=production

# Start production server
npm start
```

## 4. Design System Access

### Launch Storybook
```bash
# Start Storybook design system
npm run storybook

# Access at: http://localhost:6006
```

Storybook provides:
- Interactive component documentation
- Design system specifications
- Accessibility guidelines
- Usage examples

## 5. Database Studio Access

```bash
# Launch Drizzle Studio for database management
npm run db:studio

# Access at: http://localhost:4983
```

Use this for:
- Viewing database tables
- Editing data directly
- Schema exploration
- Query execution

## 6. Verification Steps

### Check Application Health
1. **Frontend Loading**: Visit http://localhost:3000
2. **API Response**: Test http://localhost:3000/api/user (should return 401 if not logged in)
3. **Database Connection**: Check console for successful database connection logs
4. **WebSocket**: Look for WebSocket connection messages in browser console

### Test Core Features
1. **User Registration**: Create test account with invitation code
2. **Authentication**: Login and verify session persistence
3. **Company Management**: Access company profile
4. **Task Creation**: Create assessment tasks
5. **File Upload**: Test file vault functionality

## 7. Common Issues and Solutions

### Database Connection Issues
```bash
# Check database URL format
echo $DATABASE_URL

# Test direct connection
psql $DATABASE_URL

# Common fix: ensure database exists
createdb invela_platform
```

### Port Conflicts
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill conflicting process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Missing Dependencies
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for peer dependency warnings
npm ls
```

### Environment Variable Issues
```bash
# Verify .env file exists and is readable
cat .env

# Check environment loading in application
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

## 8. Development Workflow

### File Structure Overview
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API and business logic
│   │   └── utils/         # Helper functions
├── server/                # Express backend
│   ├── routes/            # API endpoints
│   ├── middleware/        # Server middleware
│   └── services/          # Business logic services
├── db/                    # Database schema and migrations
│   ├── schema.ts          # Main schema definition
│   └── migrations/        # Database migrations
├── docs/                  # Documentation
├── stories/               # Storybook component stories
└── uploads/              # File upload storage
```

### Adding New Features
1. **Backend**: Add routes in `server/routes/`
2. **Frontend**: Add components in `client/src/components/`
3. **Database**: Update schema in `db/schema.ts`
4. **Documentation**: Add Storybook stories in `stories/`

### Database Migrations
```bash
# After schema changes, push to database
npm run db:push

# For production, use proper migrations
npm run db:migrate
```

## 9. Production Deployment

### Build Process
```bash
# Create production build
npm run build

# Verify build output
ls -la dist/
```

### Environment Variables for Production
```bash
# Set production environment
export NODE_ENV=production

# Database connection (production)
export DATABASE_URL=postgresql://prod_user:password@prod_host:5432/prod_db

# Session security
export SESSION_SECRET=production-session-secret-128-chars-minimum

# API keys for external services
export OPENAI_API_KEY=prod-openai-key
export SENDGRID_API_KEY=prod-sendgrid-key
```

### Health Checks
The application includes built-in health check endpoints:
- `/api/health` - Application health
- `/api/db-health` - Database connectivity

## 10. Monitoring and Logging

### Application Logs
Development mode includes comprehensive logging:
- Database operations
- API request/response
- WebSocket connections
- Error tracking

### Performance Monitoring
- Built-in request timing
- Database query performance
- Memory usage tracking
- Error rate monitoring

## 11. Security Configuration

### Session Management
- Secure session cookies
- CSRF protection
- Session expiration handling

### Database Security
- SQL injection prevention via Drizzle ORM
- Connection pooling
- Input validation

### File Upload Security
- File type validation
- Size limitations
- Virus scanning (configure as needed)

## 12. Troubleshooting Guide

### Application Won't Start
1. Check Node.js version: `node --version` (should be 20+)
2. Verify dependencies: `npm ls`
3. Check environment variables: `cat .env`
4. Review startup logs for errors

### Database Connection Failures
1. Verify PostgreSQL is running
2. Test connection string manually
3. Check firewall/network access
4. Verify database exists

### Frontend Not Loading
1. Check if build completed successfully
2. Verify static file serving
3. Check browser console for errors
4. Test API endpoints directly

### WebSocket Connection Issues
1. Check browser console for WebSocket errors
2. Verify WebSocket server is running
3. Test connection manually
4. Check firewall settings

## 13. Development Tips

### Debugging
- Use browser DevTools for frontend debugging
- Check server console for backend logs
- Use Drizzle Studio for database inspection
- Test API endpoints with curl or Postman

### Code Quality
- TypeScript provides type safety
- ESLint ensures code quality
- Prettier handles formatting
- Storybook documents components

### Performance
- Use React DevTools for component profiling
- Monitor database query performance
- Check network requests in DevTools
- Use Lighthouse for performance audits

---

## Quick Start Checklist

- [ ] Clone repository
- [ ] Create `.env` file with DATABASE_URL
- [ ] Run `npm install`
- [ ] Create PostgreSQL database
- [ ] Run `npm run db:push`
- [ ] Run `npm run dev`
- [ ] Visit http://localhost:3000
- [ ] Test user registration/login
- [ ] Verify core functionality

**Estimated Setup Time**: 15-30 minutes for experienced developers

**Support**: Refer to documentation in `docs/` directory or check application logs for detailed error messages.