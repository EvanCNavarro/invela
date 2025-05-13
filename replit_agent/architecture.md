# Architecture Overview

## Overview

Invela is a financial compliance and assessment platform that allows organizations to complete various compliance forms including KYB (Know Your Business), KY3P (Know Your Third-Party Provider), Open Banking, and Card Industry assessments. The application features a task-centered workflow, file management through a File Vault, and real-time collaboration capabilities.

The system is built with a modern web stack using Node.js for the backend, React for the frontend, PostgreSQL for data storage, and WebSockets for real-time updates.

## System Architecture

The application follows a client-server architecture with these key components:

1. **Frontend**: React-based single-page application with component-based architecture
2. **Backend**: Node.js API server using Express
3. **Database**: PostgreSQL database managed through Drizzle ORM
4. **Real-time Communication**: WebSocket server for instant updates and notifications
5. **Authentication**: JWT and session-based authentication system
6. **File Storage**: File management system for document uploads and generation

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│             │        │             │        │             │
│  React      │◄─HTTP─►│  Node.js    │◄─SQL──►│ PostgreSQL  │
│  Frontend   │        │  Backend    │        │ Database    │
│             │        │             │        │             │
└─────────────┘        └─────────────┘        └─────────────┘
       ▲                      ▲
       │                      │
       └────WebSocket─────────┘
```

### Key Architectural Decisions

1. **Universal Form System**:
   - The application uses a unified approach to form handling through a "Universal Form" component
   - This allows different assessment types (KYB, KY3P, Open Banking) to use the same underlying infrastructure
   - Progressively enhanced to handle up to 120 fields with optimized loading strategies

2. **Task-based Workflow**:
   - All assessments are managed as tasks with defined progress tracking
   - Unified progress calculation across different form types
   - Status transitions follow a consistent pattern (not_started → in_progress → ready_for_submission → submitted)

3. **Real-time Updates**:
   - WebSocket-based broadcasting system for instant updates
   - Event-based architecture for notifications about task changes, form submissions, and UI updates

4. **Component-based UI**:
   - Modular UI components with responsive design considerations
   - Dynamic tab visibility based on user role, company type, and task completion status

## Key Components

### Backend Components

1. **API Routes**:
   - RESTful API endpoints organized by functionality
   - Specific route handlers for each form type (KYB, KY3P, Open Banking)
   - Utility endpoints for task management, file operations, and user authentication

2. **Services**:
   - `UnifiedTabService`: Manages tab access rights for companies
   - `FileCreationService`: Handles file generation for different form types
   - `WebSocketService`: Manages real-time communication and broadcasts
   - `FormPerformanceMonitor`: Tracks and optimizes form performance metrics

3. **Utilities**:
   - Progress calculation utilities for tracking task completion
   - Form field validation and transformation utilities
   - Caching mechanisms for performance optimization

### Frontend Components

1. **Forms**:
   - `UniversalForm`: Core component for rendering dynamic forms with section-based loading
   - Form field components with validation and auto-fill capabilities
   - Progress tracking and submission handling

2. **Navigation**:
   - Sidebar with dynamically visible tabs based on permissions
   - Task center for viewing and managing assigned tasks
   - File Vault for document management

3. **UI Components**:
   - Responsive tables with prioritized column visibility
   - Modal dialogs for detailed information and actions
   - Notification system for user feedback

### Database Schema

The database schema includes these main entity types:

1. **Users and Companies**:
   - User accounts with authentication details
   - Company information including available tab permissions
   - Role-based access controls

2. **Tasks and Templates**:
   - Task definitions with status, progress, and metadata
   - Task templates for creating standardized assessments
   - Component configurations for customizing form behavior

3. **Form Responses**:
   - Separate tables for different form types (kyb_responses, ky3p_responses, open_banking_responses)
   - Field definitions with validation rules and display properties
   - Response tracking with timestamps and status information

4. **Files**:
   - File metadata including access levels and classifications
   - Storage locations and retention policies
   - Usage metrics (download count, unique viewers)

## Data Flow

### Form Submission Flow

1. User accesses a form through the Task Center
2. UniversalForm component loads field definitions from the server
3. Form fields are progressively loaded in sections to optimize performance
4. As the user completes fields, individual updates are sent to the server
5. Progress is calculated on the server and broadcast via WebSockets
6. When 100% complete, form status changes to "ready_for_submission"
7. User submits the form, changing status to "submitted"
8. A PDF or document is generated and stored in the File Vault
9. Related tabs (like File Vault) are unlocked based on form completion
10. WebSocket notifications update the UI for all connected clients

### Tab Access Control Flow

1. When a user completes a form, the system determines which tabs to unlock
2. The UnifiedTabService updates the available_tabs for the company
3. A WebSocket event is broadcast to notify all connected clients
4. The Sidebar component listens for tab update events and refreshes the navigation
5. Newly unlocked tabs become visible to all users in the company

### File Management Flow

1. Files are created either through direct uploads or form generation
2. File metadata is stored in the database with classification and access control information
3. Files are displayed in the File Vault with responsive column visibility
4. Actions such as download, share, or delete are available based on user permissions
5. File access and downloads are tracked for audit purposes

## External Dependencies

The application integrates with several external services:

1. **Authentication and Security**:
   - Session-based authentication with JWT tokens
   - Cookie-based session persistence

2. **Email Services**:
   - Gmail integration for notifications (via GMAIL_APP_PASSWORD)
   - Potentially SendGrid for larger email campaigns (SENDGRID_API_KEY)

3. **External APIs**:
   - Abstract API for various utilities
   - Google Custom Search API for search functionality
   - OpenAI API potentially for AI-assisted features

4. **Database**:
   - Neon PostgreSQL database (serverless PostgreSQL service)

## Deployment Strategy

The application is deployed using the following approach:

1. **Infrastructure**:
   - Hosted on Replit with custom domain (invela.replit.app)
   - Uses Cloud Run for containerized deployment

2. **Build Process**:
   - Development: `npm run dev` for local development
   - Build: `npm run build` for production deployment
   - Start: `npm run start` to run the production build

3. **Database**:
   - Connection to Neon's serverless PostgreSQL database
   - Database migrations can be skipped in production with SKIP_MIGRATIONS flag

4. **Environment Configuration**:
   - Environment variables managed through .env file
   - Different configuration for development and production environments

5. **Ports and Networking**:
   - Multiple port mappings for various services
   - Primary application runs on port 8080
   - WebSocket server uses dedicated port for real-time communication

## Security Considerations

1. **Authentication**: JWT-based authentication with session secrets
2. **Data Protection**: Form data is stored securely in the database
3. **File Security**: Files have classification and access control mechanisms
4. **API Security**: API keys for external services are managed through environment variables

## Optimization Strategies

1. **Form Performance**:
   - Section-based progressive loading for large forms
   - Client-side caching of form fields
   - Performance monitoring for field processing and UI responsiveness

2. **Database Efficiency**:
   - Unified approach to progress calculation
   - Transaction-based updates for data consistency
   - Type casting for consistent data handling

3. **UI Responsiveness**:
   - Responsive design with priority-based column visibility
   - WebSocket updates to avoid polling
   - Optimized state management for large forms