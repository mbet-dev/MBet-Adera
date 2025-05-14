# Authentication Flow in MBet-Adera

## Overview

The MBet-Adera app implements a persistent authentication flow that keeps users logged in until they explicitly log out. The system is designed to maintain sessions across app restarts, server restarts, and device reboots. This document describes how the enhanced authentication system works.

## Authentication Implementation

The app uses Supabase for authentication with the following key components:

1. **Robust Session Persistence**: Sessions are stored redundantly in AsyncStorage on mobile and localStorage on web platforms
2. **Persistent Auto-Login**: Once authenticated, users remain logged in across app restarts, server restarts, and device reboots
3. **Multi-Layer Session Recovery**: Multiple mechanisms to recover sessions in case of disruptions
4. **Onboarding Flow**: New users or logged-out users will see onboarding screens first (if they haven't seen them before) and then the login screen

## Key Components

### Supabase Configuration (`lib/supabase.ts`)

- Sets up the Supabase client with `persistSession: true`
- Configures AsyncStorage as the storage mechanism
- Includes enhanced auth state change listener with redundant storage
- Implements manual session restoration when standard methods fail
- Stores multiple session flags to ensure persistence across disruptions
- Provides fallback mechanisms for token expiration and refresh

### Session Management (`components/SessionProvider.tsx`)

- Implements aggressive session restoration on app startup
- Checks multiple storage locations for session data
- Provides session restoration as a service to app components
- Refreshes tokens every 5 minutes to keep sessions valid
- Monitors app state changes to restore sessions when app resumes

### App Root (`app/_layout.tsx`)

- Manages navigation flow based on authentication status
- Implements app state monitoring to detect when app comes to foreground
- Attempts session restoration when app becomes active after inactivity
- Handles various edge cases like partially corrupted session data
- Provides a comprehensive recovery mechanism for interrupted sessions

### Logout Functionality (`app/(tabs)/profile/index.tsx`)

- Properly invalidates session on server
- Thoroughly clears all session-related data
- Includes graceful error handling during logout process
- Ensures navigation to login screen even if errors occur

## Authentication Flow Diagram

```
┌─────────────────┐     ┌───────────────┐     ┌──────────────┐
│  App Launches   │────▶│ Check Session │────▶│ Session Found│────▶ Main App
└─────────────────┘     └───────────────┘     └──────────────┘
                              │                      ▲
                              ▼                      │
                        ┌──────────────┐             │
                        │ No Standard  │             │
                        │   Session    │             │
                        └──────────────┘             │
                              │                      │
                              ▼                      │
                    ┌────────────────────┐           │
                    │ Check Session Flag │           │
                    └────────────────────┘           │
                              │                      │
                              ▼                      │
                    ┌────────────────────┐           │
                    │ Manual Restoration │───────────┘
                    └────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ Check Onboarding Status   │
              └───────────────────────────┘
                 │                    │
                 ▼                    ▼
        ┌────────────────┐    ┌────────────┐
        │ Never Onboarded│    │ Previously │
        │                │    │ Onboarded  │
        └────────────────┘    └────────────┘
                 │                   │
                 ▼                   ▼
        ┌────────────────┐    ┌────────────┐
        │ Onboarding     │───▶│ Login      │
        │ Screens        │    │ Screen     │
        └────────────────┘    └────────────┘
```

## App Resume Flow

When a user returns to the app after it has been in the background:

```
┌─────────────────┐      ┌──────────────┐     ┌─────────────────┐
│ App Resumes     │─────▶│ Check Time   │────▶│ Been > 1 Minute │
└─────────────────┘      │ Since Active │     └─────────────────┘
                         └──────────────┘             │
                                                      ▼
                                            ┌────────────────────┐
                                            │  Check Session     │
                                            │  Flag & Status     │
                                            └────────────────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │ Flag = True but    │─────Yes─────┐
                                            │ No Session?        │              │
                                            └────────────────────┘              │
                                                      │                         │
                                                      No                        │
                                                      │                         │
                                                      ▼                         ▼
                                            ┌────────────────────┐    ┌─────────────────┐
                                            │ Continue Normal    │    │ Force Session   │
                                            │ App Operation      │    │ Restoration     │
                                            └────────────────────┘    └─────────────────┘
```

## Session Storage Keys

The authentication system uses the following storage keys:

- `sb-jaqwviuxhxsxypmffece-auth-token`: Supabase's primary session storage
- `supabase.auth.token`: Redundant session storage
- `hasActiveSession`: Flag indicating session should exist
- `mbet.user`: User info storage for restoration
- `hasSeenOnboarding`: Flag for onboarding flow management

## Development Testing

For development purposes, the app includes a set of seed users that can be used with the password "mbet321". The session persistence mechanisms work for both regular users and seed users.

## Future Enhancements

Potential future improvements to the authentication system:
- Social login integration
- Biometric authentication
- Optional session expiration settings
- Remember me functionality with selectable duration
- Secure session storage with encryption 