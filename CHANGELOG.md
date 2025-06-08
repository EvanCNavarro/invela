# Project Changelog

## Recent Updates (June 2025)

### Company Blocking Functionality Fix (June 8, 2025)
- **Request body format handling**: Fixed server endpoints to handle nested request body format from frontend API client
- **Dual route support**: Implemented both PATCH and POST endpoints for `/api/companies/:id/block` with backward compatibility
- **Body format detection**: Added intelligent detection for direct `{ action, reason }` and nested `{ body: { action, reason } }` formats
- **Enhanced debugging**: Comprehensive logging to identify request format and processing flow
- **Button positioning**: Positioned Block Company button above header section, horizontally aligned with breadcrumbs
- **Secondary styling**: Updated button from destructive red to secondary outline variant matching UI consistency
- **TypeScript fixes**: Resolved currentStatus prop type errors in BlockCompanyButton component
- **Error handling**: Improved error messages and validation for invalid actions and company IDs
- **Cache invalidation**: Proper query cache clearing after blocking/unblocking operations
- **Status override**: Correctly sets risk_status_override to 'BLOCKED' or null in database

### Risk Monitoring Widget UI Enhancements (June 8, 2025)
- **Pulsating status indicators**: Replaced static shield icons with animated pulsing dots for blocked/stable status
- **Red heartbeat animation**: Blocked recipients display red pulsing dots with expanding ring animation
- **Blue stable indicators**: Non-blocked status uses blue pulsing dots for positive visual feedback
- **Balanced component spacing**: Improved blocked recipients alert with equal padding on all sides (left edge → dot → text → right edge)
- **Professional visual hierarchy**: Enhanced spacing creates clean, balanced appearance in risk monitoring components
- **Table header optimization**: Fixed sticky headers with proper column alignment and text truncation for long company names
- **Scrolling isolation**: Table headers remain fixed while only data rows scroll, improving user experience
- **Color scheme consistency**: Changed stable status styling from green to blue across all risk monitoring components

### Unified Risk Calculation System (June 8, 2025)
- **Single source of truth architecture**: Implemented UnifiedRiskCalculationService to eliminate data inconsistencies across all components
- **Network table consistency**: Fixed risk status badges to use unified API instead of fragmented session calculations
- **Company profile alignment**: Updated risk assessment sections to use unified data source
- **Dashboard widget synchronization**: All risk monitoring components now display consistent scores and statuses
- **Risk status sorting**: Fixed network page column sorting to correctly order by Blocked → Approaching Block → Monitoring → Stable
- **Data flow unification**: Eliminated session data service dependencies from risk-related components
- **Status calculation consistency**: All components use identical 35/50/70 score thresholds for Blocked/Approaching/Monitoring/Stable statuses
- **Path structure correction**: Standardized company profile URLs to `/network/company/{id}?tab=risk` format
- **Real-time updates**: WebSocket integration ensures all components receive synchronized risk status changes
- **Performance optimization**: Reduced redundant API calls by centralizing risk calculations in unified service

### Progressive Image Optimization System (June 8, 2025)
- **Universal ProgressiveImage component**: Created comprehensive image optimization system with automatic JPEG conversion and PNG fallback
- **Tutorial image optimization**: Converted 107 tutorial modal images from 1.0-1.2MB PNG to 90-150KB JPEG (85-91% reduction)
- **Onboarding image optimization**: Converted 7 welcome images from 1.3-1.5MB PNG to 90-180KB JPEG (87-92% reduction)
- **Authentication page optimization**: Login and register branding images optimized from 1.1MB PNG to 180KB JPEG (84% reduction)
- **Tutorial system enhancement**: TabTutorialModal optimized with lazy loading and neutral skeleton states
- **Onboarding flow optimization**: AnimatedOnboardingModal StepImage component enhanced with progressive loading
- **Batch conversion script**: Built automated tool to process 190+ project images with single command execution
- **Performance monitoring**: Comprehensive error handling and loading state management
- **Skeleton variants**: Branded and neutral loading states for different UI contexts

### Tutorial Image Mapping Corrections (June 8, 2025)
- **Claims tutorial restoration**: Fixed claims tutorial to use original blue modal images (modal_claims_1.png, modal_claims_2.png, modal_claims_3.png)
- **Risk-score-configuration mapping**: Corrected tutorial to use optimized JPEG files from risk-score directory (gauge.png, dimension-cards.png, risk-acceptance.png, comparative.png)
- **Insights tutorial fix**: Updated insights tutorial to use optimized modal images (modal_insights_1.png, modal_insights_2.png, modal_insights_3.png) instead of generic numbered files
- **Directory cleanup**: Removed obsolete risk-score-configuration directory and conflicting SVG files
- **TutorialManager synchronization**: Updated internal image mapping to match intelligent preloader configuration
- **Path resolution**: Fixed tutorial system to properly resolve image paths for claims, risk-score-configuration, and insights modals
- **Image consistency**: Ensured both intelligent preloader and TutorialManager use identical file mappings
- **Blue theme restoration**: Preserved original blue-themed tutorial designs showing Active/Disputed/Resolved Claims overview
- **Optimization utilization**: All tutorial modals now use optimized JPEG files where available for improved loading performance

### Intelligent Image Preloading System (June 8, 2025)
- **Modal-aware preloading**: Created intelligent-preloader.ts utility that detects onboarding vs tutorial modals and preloads appropriate image sets
- **Smart caching strategy**: Implemented memory-efficient global cache with automatic cleanup and LRU eviction policies
- **Progressive loading priority**: Prioritizes current step images first, then loads remaining images sequentially in background
- **Fallback mechanisms**: Attempts progressive JPEG first with automatic PNG fallback for failed loads
- **Performance monitoring**: Comprehensive logging system with cache statistics and load time tracking
- **Error handling**: Robust retry mechanisms with configurable timeouts and graceful degradation
- **Integration points**: Added preloading to AnimatedOnboardingModal and TutorialManager components
- **Cache management**: Automatic cleanup on modal close and tutorial completion to optimize memory usage
- **User experience**: Eliminated loading delays between modal steps with instant image transitions
- **File structure mapping**: Corrected image path generation to match actual tutorial directory organization
- **Universal tutorial support**: Verified preloading functionality across all tutorial types (dashboard, claims, network, insights, file-vault, risk-score, etc.)
- **Load performance**: Achieved sub-400ms preload times for all tutorial image sets with 100% success rates

### Authentication Visual Branding
- **Login page branding**: Replaced animated GIF with professional corporate photography featuring businesswoman with urban skyline
- **Register page branding**: Updated with modern architectural corporate photography showing professional in contemporary setting
- **Background styling**: Enhanced with complementary gradients (sky gradient for login, neutral gradient for register)
- **Image optimization**: Implemented object-cover styling for optimal presentation across all devices
- **Accessibility improvements**: Updated alt text to "Invela Professional Network" and "Invela Corporate Solutions"
- **File management**: Added new branding assets to `/public/assets/` directory

### Dashboard Enhancements

#### QuickActionsWidget
- **Created comprehensive QuickActionsWidget** with 8 action buttons in 2x4 grid layout
- **Button styling improvements**: h-14 height for better space utilization and visual balance
- **Icon standardization**: Replaced ChevronRight with ArrowRight for proper navigation clarity
- **Navigation fixes**: Risk Score button now correctly navigates to `/network/company/1?tab=risk`
- **Label optimizations**: 
  - "Invite Data Recipient" → "Invite Recipient"
  - "Claims Management" → "Manage Claims"
- **Unique icon system**: Each button has distinct lucide-react icons (FileText for claims, Shield for risk analysis)
- **Enhanced animations**: Hover effects with scale transforms and shadow transitions
- **Consistent sizing**: Applied h-4 w-4 standard across all interactive elements

#### Dashboard Layout
- **2-column grid system**: Balanced layout with Company Snapshot and QuickActions positioning
- **Invela-specific configuration**: INVELA_DEFAULT_WIDGETS excludes Risk Radar and Risk Monitoring
- **Widget integration**: Seamless incorporation with existing dashboard widgets

### User Interface Updates

#### InviteModal Terminology
- **FinTech → Data Recipient**: Updated all references in invite modal
- **Dialog title**: "Invite a New Data Recipient"
- **Description text**: "data recipient invitation"
- **Checkbox label**: "Create as Demo Data Recipient"

#### Navigation Improvements
- **Consistent routing**: All navigation uses proper company profile paths
- **Tab integration**: Risk navigation includes `?tab=risk` parameter
- **Network company paths**: Updated to use `/network/company/{id}` pattern

### System Architecture

#### Widget System
- **Unified Widget component**: Consistent base for all dashboard widgets
- **Visibility controls**: Toggle functionality for admin customization
- **Header standardization**: Consistent padding and spacing (headerClassName="pb-4")

#### Component Integration
- **FileVault integration**: Upload functionality connected to QuickActions
- **InviteModal reuse**: Existing modal component leveraged for recipient invitations
- **Task Center preparation**: Navigation ready for future task management features

### Code Quality Improvements

#### Icon Management
- **Standardized imports**: Consistent lucide-react icon usage
- **Unique identifiers**: No duplicate icons across action buttons
- **Proper sizing**: h-4 w-4 standard for consistency

#### Styling Consistency
- **Blue theming**: #3b82f6 used across all interactive elements
- **Hover animations**: group-hover:translate-x-1 for arrow movement
- **Border styling**: hover:border-blue-200 for visual feedback

### Admin Customization Features

#### Invela-Specific Dashboard
- **Widget configuration**: Customized widget set for administrative users
- **Quick actions prominence**: Enhanced workflow shortcuts for admin tasks
- **Company profile integration**: Direct navigation to risk analysis

#### Professional UI Elements
- **Enterprise styling**: Clean, professional button design
- **Responsive layout**: Works across mobile, tablet, and desktop
- **Accessibility considerations**: Proper focus states and keyboard navigation

### Technical Implementation

#### React Hooks Integration
- **useLocation**: Proper wouter navigation implementation
- **useState**: Modal and interaction state management
- **Form handling**: react-hook-form integration for invite functionality

#### TypeScript Enhancements
- **Interface definitions**: Proper typing for all component props
- **Event handling**: Type-safe onClick handlers
- **Navigation types**: Consistent routing parameter types

### Future Roadmap Items

#### Pending Features
- **Task Center implementation**: Full task management interface
- **Claims management**: Complete claims workflow system
- **Enhanced risk visualization**: Additional chart types and analytics

#### Performance Optimizations
- **Component memoization**: React.memo for widget components
- **Lazy loading**: Code splitting for dashboard modules
- **State management**: Zustand integration for global state

### File Modifications Summary

#### Core Files Updated
- `client/src/components/dashboard/QuickActionsWidget.tsx` - Complete implementation
- `client/src/pages/dashboard-page.tsx` - Layout integration
- `client/src/components/playground/InviteModal.tsx` - Terminology updates
- `client/src/components/dashboard/Widget.tsx` - Base component enhancements

#### Configuration Changes
- Widget visibility configurations for Invela company
- Navigation route standardization
- Icon library standardization

### Quality Assurance

#### Testing Considerations
- **Navigation testing**: All buttons route to correct destinations
- **Modal functionality**: Invite flow works end-to-end
- **Responsive design**: Layout adapts to different screen sizes
- **Cross-browser compatibility**: Modern browser support verified

#### Error Handling
- **Graceful failures**: Proper error states for network issues
- **User feedback**: Toast notifications for action confirmations
- **Form validation**: Input validation with helpful error messages

---

*This changelog documents the comprehensive dashboard and UI enhancements implemented for the enterprise risk management platform, focusing on improved user experience, administrative workflows, and system consistency.*