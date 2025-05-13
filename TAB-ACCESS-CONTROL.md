# Tab Access Control System Documentation

## Overview

The Tab Access Control System manages which navigation tabs are available to users based on their role, company type, and the completion status of required forms. This document provides comprehensive documentation on how the tab access control system works, focusing particularly on the File Vault tab which has special unlocking requirements.

## Architecture

The tab access control system is built on a three-tier architecture:

1. **Server-side Tab Service**: Controls the assignment of tabs to companies in the database
2. **WebSocket Event System**: Broadcasts tab updates in real-time to connected clients
3. **Client-side Sidebar Component**: Renders the navigation menu based on available tabs

## Key Components

### 1. UnifiedTabService

Centralized service that manages tab access rights for companies, located at `server/services/unified-tab-service.ts`.

```typescript
// Key methods:
addTabsToCompany(companyId: number, tabs: string[]): Promise<string[]>
removeTabsFromCompany(companyId: number, tabs: string[]): Promise<string[]>
setCompanyTabs(companyId: number, tabs: string[]): Promise<string[]>
getAvailableTabs(companyId: number): Promise<string[]>
mergeCompanyTabs(companyId: number, tabs: string[]): Promise<string[]>
```

### 2. WebSocket Event System

Real-time communication between server and client to ensure immediate tab updates. Event types are defined in `client/src/lib/websocket-types.ts`.

```typescript
// Key event types:
export interface CompanyTabsUpdateEvent extends WebSocketEvent {
  type: 'company_tabs_update' | 'company_tabs_updated';
  payload: {
    companyId: number;
    availableTabs: string[];
  };
}

export interface FormSubmittedEvent extends WebSocketEvent {
  type: 'form_submitted';
  payload: {
    companyId: number;
    taskId: number;
    formType: string;
    unlockedTabs?: string[];
  };
};
```

### 3. Sidebar Component

Client-side navigation menu (`client/src/components/dashboard/Sidebar.tsx`) that renders tabs based on the `availableTabs` property.

```typescript
// Example tab definition in Sidebar.tsx
{
  icon: FileIcon,
  label: "File Vault",
  href: "/file-vault",
  locked: !availableTabs.includes('file-vault')
}
```

## Default Tab Access Rules

| Tab Name | Default Access | Unlock Condition |
|----------|---------------|------------------|
| Task Center | Always unlocked | N/A |
| Dashboard | Available after onboarding | Company onboarding complete |
| File Vault | Locked initially | KYB form submitted |
| Network | Varies by company type | Available to Banks and Invela, not FinTechs |
| Insights | Locked initially | Required forms submitted |
| Claims | Varies by company type | Available to Banks and Invela, not FinTechs |
| S&P Risk Score | Varies by company type | Available to Banks and Invela, not FinTechs |
| Builder | Admin only | Invela users only |
| Playground | Admin only | Invela users only |

## File Vault Tab Unlocking

The File Vault tab has special unlocking rules:

1. Tab remains locked for new companies upon initial creation
2. Tab becomes available after the KYB form has been submitted
3. Form submission triggers the `form_submitted` WebSocket event
4. Server processes the form submission and updates company's `available_tabs`
5. WebSocket broadcasts `company_tabs_update` event with the new `availableTabs` list
6. Sidebar component receives the update and refreshes the navigation menu

## Implementation Examples

### Unlocking the File Vault Tab After Form Submission

```typescript
// In form submission handler (server-side)
async function handleFormSubmission(companyId, taskId, formType) {
  // Process form submission
  await markFormAsSubmitted(taskId);
  
  // Determine which tabs to unlock based on form type
  if (formType === 'kyb') {
    // Use UnifiedTabService to add the file-vault tab
    const tabService = new UnifiedTabService();
    const updatedTabs = await tabService.addTabsToCompany(companyId, ['file-vault']);
    
    // Broadcast the update via WebSocket
    await broadcastTabsUpdate(companyId, updatedTabs);
    
    // Also broadcast form submission event
    await broadcastFormSubmitted(companyId, taskId, formType, ['file-vault']);
  }
  
  return { success: true };
}
```

### Handling Tab Updates on the Client

```typescript
// In Sidebar component (client-side)
const handleCompanyTabsUpdate = (data: CompanyTabsUpdateEvent['payload']) => {
  // Only process if it's for our company
  if (company && data.companyId === company.id) {
    // Force immediate cache invalidation to ensure sidebar gets refreshed
    queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
    queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
  }
};

// Subscribe to WebSocket events
wsService.subscribe('company_tabs_update', handleCompanyTabsUpdate);
wsService.subscribe('company_tabs_updated', handleCompanyTabsUpdate);
```

## Troubleshooting

### Common Issues and Solutions

1. **Tab doesn't unlock after form submission**
   - Check if the WebSocket connection is active
   - Verify the company ID in the form submission matches the current company
   - Ensure the form status was properly set to 'submitted'

2. **Tabs flicker between locked and unlocked states**
   - Check for race conditions in the cache invalidation logic
   - Verify only one tab update is being processed at a time
   - Consider implementing a debounce for tab updates

3. **File Vault tab is accessible even though it should be locked**
   - Verify the route protection in `client/src/App.tsx`
   - Check for proper tab validation in the API endpoints
   - Ensure the database has the correct values for `available_tabs`

## Testing

The script `test-tab-access.js` provides automated testing for the tab access control system. It simulates:

1. Checking initial tab state (File Vault should be locked)
2. Submitting a KYB form to trigger tab unlocking
3. Verifying that File Vault tab becomes unlocked after form submission
4. Ensuring other tabs maintain their expected state

Run the script with Node.js to test the tab access control system:

```bash
node test-tab-access.js
```

## Best Practices

1. **Always use the UnifiedTabService**: Never modify company tabs directly in the database
2. **Broadcast tab updates**: Always broadcast tab changes via WebSocket for real-time updates
3. **TypeScript Interfaces**: Use the defined WebSocket event interfaces for type safety
4. **Centralized Access Control**: Keep access rules in one place for consistency
5. **Test thoroughly**: Verify tab access control logic through automated tests

---

## Change Log

- **v1.0.0** (May 5, 2025): Initial documentation
- **v1.0.1** (May 6, 2025): Added troubleshooting section