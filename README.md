# Invela Enterprise Risk Assessment Platform

A comprehensive enterprise-grade risk assessment platform delivering advanced diagnostic capabilities through modern, scalable web application with intelligent monitoring and deployment management. Enables organizations to assess, track, and manage risk across multiple assessment types including KYB (Know Your Business), KY3P (Know Your Third Party), Open Banking, and Security evaluations.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Push database schema
npm run db:push

# Launch Storybook design system (optional)
npm run storybook
```

## 🏗️ Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript + Wouter routing
- **Backend**: Express.js + TypeScript + WebSocket
- **Database**: PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS + Radix UI components
- **State**: TanStack Query + Zustand
- **Real-time**: WebSocket communication
- **Design System**: Storybook documentation

### Layered Architecture
```
┌─────────────────────────────────────┐
│ Presentation Layer (client/src/)    │
│ - Pages, Components, UI interactions│
├─────────────────────────────────────┤
│ API Layer (server/routes/)          │
│ - HTTP endpoints, Auth, Validation  │
├─────────────────────────────────────┤
│ Business Logic (server/services/)   │
│ - Core business rules, Processing   │
├─────────────────────────────────────┤
│ Data Access Layer (db/)             │
│ - Schema, Migrations, Transactions  │
└─────────────────────────────────────┘
```

### Key Features
- 📊 **Risk Assessment Workflows** - KYB, KY3P, Open Banking, Security assessments
- 🏢 **Multi-tenant Architecture** - Company-scoped data isolation
- 📝 **Progressive Assessment Unlocking** - KYB completion unlocks KY3P security tasks
- 🔍 **Real-time Updates** - WebSocket-driven live notifications
- 🎯 **Risk Scoring Engine** - Multi-dimensional calculations with AI analysis
- 📱 **Dashboard Analytics** - 10+ specialized widgets with network visualization
- 🔐 **Session-based Authentication** - Passport.js with company context
- 📁 **File Management** - Document processing, CSV/PDF generation, vault storage
- 🛡️ **Production-Ready Deployment** - Industry-standard environment management with automatic dev/prod switching
- 📈 **Risk Trend Analysis** - Real-time risk indicators with visual trend tracking
- 🎛️ **Adaptive Widget System** - Company-type specific dashboard configurations
- 🧪 **Data Integrity Validation** - Comprehensive test suites ensuring assessment accuracy

## 📚 Design System

Our comprehensive design system is documented in Storybook, providing:

- **UI Components**: Reusable components with consistent styling
- **Design Tokens**: Colors, typography, spacing standards
- **Accessibility**: WCAG 2.1 AA compliance
- **Interactive Examples**: Live component demonstrations

### Launch Storybook
```bash
npm run storybook
```

Visit `http://localhost:6006` to explore the design system.

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Database
npm run db:push         # Push schema changes
npm run db:migrate      # Run migrations
npm run db:studio       # Launch Drizzle Studio

# Design System
npm run storybook       # Launch Storybook
npm run build-storybook # Build Storybook for deployment
```

### Project Structure

```
├── client/             # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API and business logic
│   │   └── utils/         # Helper functions
├── server/             # Backend Express server
│   ├── routes/            # API endpoints
│   └── middleware/        # Server middleware
├── db/                 # Database schema and migrations
├── stories/            # Storybook component documentation
│   ├── ui-components/     # Basic UI component stories
│   ├── data-display/      # Data visualization stories
│   ├── forms/            # Form component stories
│   └── design-system/    # Design system documentation
└── docs/               # Technical documentation
```

## 🎨 Design System Components

### UI Components
- **Button**: Primary, secondary, destructive, and ghost variants
- **Input**: Text, email, password, search with icon support
- **Table**: Sortable, selectable with search highlighting
- **Form**: Comprehensive form building with validation
- **Dialog**: Modal dialogs and confirmations
- **Card**: Content containers with consistent styling

### Data Display
- **Enhanced Table**: Enterprise-grade data tables
- **Charts**: Risk assessment visualizations
- **Metrics**: Key performance indicators
- **Progress**: Task and assessment progress tracking

### Layout
- **Navigation**: Sidebar and top navigation
- **Grid**: Responsive layout system
- **Container**: Content organization

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Application
NODE_ENV=development
PORT=3000

# Deployment Mode (Production)
DEPLOYMENT_MODE=production  # Enables production static file serving

# Storybook
STORYBOOK_PORT=6006
```

### Deployment Configuration

The platform features industry-standard environment management:

**Development Mode** (Default)
- Automatic Vite development server with hot reloading
- Full debugging capabilities and detailed logging
- No manual configuration required

**Production Mode**
- Set `DEPLOYMENT_MODE=production` environment variable
- Automatic static file serving with API route priority
- Optimized middleware order preventing route conflicts
- Zero manual code changes required

```bash
# Production Deployment
DEPLOYMENT_MODE=production npm run build
DEPLOYMENT_MODE=production npm start
```

### Database Setup

1. **Configure Database URL**
   ```bash
   echo "DATABASE_URL=your_postgresql_url" > .env
   ```

2. **Push Schema**
   ```bash
   npm run db:push
   ```

3. **Launch Studio** (optional)
   ```bash
   npm run db:studio
   ```

## 📖 Documentation

### Component Documentation
All components are thoroughly documented in Storybook with:
- **Interactive Examples**: Live component playground
- **API Documentation**: Props, events, and usage patterns
- **Accessibility Notes**: ARIA labels and keyboard navigation
- **Design Guidelines**: When and how to use components

### Technical Documentation
- **System Architecture**: `docs/ARCHITECTURE.md`
- **Development Guidelines**: `docs/CONTRIBUTING.md`
- **Technical Analysis**: `docs/TECHNICAL_ANALYSIS.md`
- **Platform Changelog**: Modal accessible from login page via "View Changelog" button
- **API Reference**: Available in Storybook actions panel

## 🚦 Quality Assurance

### Code Standards
- **TypeScript**: Full type safety across the application
- **ESLint**: Code quality and consistency
- **Prettier**: Automated code formatting
- **Accessibility**: WCAG 2.1 AA compliance

### Testing Strategy
- **Component Testing**: Storybook interaction tests
- **Visual Testing**: Automated screenshot comparison
- **Accessibility Testing**: Built-in a11y addon
- **Performance**: Lighthouse audits

## 🔐 Security

- **Input Validation**: Comprehensive form validation
- **SQL Injection**: Protection via Drizzle ORM
- **XSS Prevention**: React's built-in protection
- **CORS**: Configured for production environments

## 📈 Performance

- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Image Optimization**: Responsive image handling
- **Caching**: Intelligent browser caching strategies

## 🤝 Contributing

1. **Follow Design System**: Use existing components and patterns
2. **Document Changes**: Update Storybook stories
3. **Maintain Standards**: Follow coding guidelines
4. **Test Thoroughly**: Ensure accessibility compliance

### Adding New Components

1. **Create Component**
   ```tsx
   // client/src/components/ui/new-component.tsx
   export function NewComponent({ ...props }) {
     return <div>...</div>;
   }
   ```

2. **Add Storybook Story**
   ```tsx
   // stories/ui-components/NewComponent.stories.tsx
   export default {
     title: 'UI Components/NewComponent',
     component: NewComponent,
   };
   ```

3. **Document Usage**
   Include comprehensive examples and API documentation.

## 📞 Support

- **Design System**: Explore components in Storybook
- **Technical Issues**: Check application logs and error states
- **Documentation**: Refer to inline code comments and docs/

## 🎯 Roadmap

- **Enhanced Accessibility**: WCAG 2.2 compliance
- **Advanced Analytics**: Extended reporting capabilities
- **Mobile Application**: Native mobile client
- **API Expansion**: Extended third-party integrations

---

**Built with ❤️ for enterprise risk assessment**