# WebSocket Infrastructure Inventory

## Existing WebSocket Documentation Files
- `WEBSOCKET_AUDIT_PROGRESS.md` - Component-level audit of WebSocket integrations
- `WEBSOCKET_INVESTIGATION_PROGRESS.md` - Investigation of WebSocket patterns across codebase
- `WEBSOCKET_PHASE2_PROGRESS.md` - Polling elimination progress tracking
- `timer_investigation_log.md` - Timer source validation and elimination tracking

## Core WebSocket Infrastructure Files
- `server/utils/unified-websocket.ts` - Server-side message routing
- `client/src/hooks/use-unified-websocket.ts` - Client-side WebSocket hook
- `client/src/services/websocket-unified.ts` - WebSocket connection management
- `client/src/utils/websocket-event-deduplication.ts` - Event deduplication

## Current Polling Sources (Still Active)
- Current Company fetching (~60 second intervals)
- GET /api/companies/current calls
- Onboarding status checks
- Server-side task processing

## Phase 3 Objective
Surgically remove all polling mechanisms and implement pure WebSocket-driven data flow.