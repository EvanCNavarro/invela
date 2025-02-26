# Authentication Debugging and Testing System

This directory contains components and utilities for debugging and testing the authentication system. These tools are only available in development mode and are designed to help diagnose and fix authentication-related issues.

## Components

### 1. AuthDebug

A debugging component for visualizing and monitoring the authentication state. It displays information about:

- Current authentication status
- Authentication cookies
- JWT token details
- Query cache status
- Authentication event counters

### 2. ConsoleCommands

Makes authentication debugging commands available in the browser console through the `window.__debug` object. This enables quick testing and verification of authentication functionality during development.

## Tools and Utilities

### 1. useDebug Hook

A centralized hook that provides debugging utilities for the authentication system, including:

- Getting authentication state
- Retrieving query cache info
- Running the Auth CLI
- Refreshing authentication state
- Clearing authentication cookies
- Navigating to test pages

### 2. Test Auth CLI

A command-line interface for authentication testing that can be run both in a terminal and in the browser console. It provides functionality for:

- Checking authentication state
- Running comprehensive authentication tests
- Monitoring authentication state
- Clearing cookies
- Checking the query cache
- Refreshing the session

## Pages

### Auth Test Page

A dedicated page for testing the authentication system, available at `/auth-test`. It provides:

- Real-time authentication status
- Login/logout controls
- Session refresh functionality
- Full authentication flow testing
- Authentication state clearing
- Detailed logging of all operations

## Usage

### Browser Console Commands

In development mode, the following commands are available in the browser console:

```javascript
// Access the debug namespace
window.__debug

// Run the authentication CLI tool
window.__debug.runAuthCLI()

// Check current authentication state
window.__debug.checkAuthState()

// Clear authentication cookies
window.__debug.clearAuthCookies()

// Monitor authentication state (polls every few seconds)
window.__debug.monitorAuthState()

// Refresh the authentication session
window.__debug.refreshSession()
```

### Debug Panel

The authentication debug panel is accessible:

1. In the dashboard sidebar when in development mode
2. Through the `/auth-test` route

## Security Note

These debugging tools are disabled in production for security reasons. They are only intended for use during development and testing. 