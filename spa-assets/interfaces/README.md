# SPA Assets - TypeScript Interfaces

This directory contains TypeScript interface definitions for API endpoints discovered in the Perplexity AI SPA (Single Page Application).

## Overview

The interfaces are extracted from the endpoint catalog found in `spa-assets/snapshots/2026-01-21/endpoints.json` and provide type-safe definitions for interacting with Perplexity's internal APIs.

## Structure

```
interfaces/
├── README.md              # This file
└── auth-endpoints.ts      # Authentication endpoint interfaces
```

## Available Interfaces

### Auth Endpoints (`auth-endpoints.ts`)

Defines interfaces for authentication-related endpoints:

- **`AuthProvider`** - Individual authentication provider configuration
- **`AuthProvidersResponse`** - Response type for `GET /api/auth/providers`
- **`AuthProvidersParams`** - Request parameters for getting auth providers
- **`SpecialProfileResponse`** - Response type for `GET /rest/auth/get_special_profile`
- **`GetSpecialProfileParams`** - Request parameters for getting special profile
- **`AuthErrorResponse`** - Standard error response for auth endpoints
- **`AuthClient`** - Client interface for auth operations

#### Example Usage

```typescript
import { 
  AuthProvidersResponse, 
  SpecialProfileResponse, 
  AuthClient 
} from './interfaces/auth-endpoints';

// Get authentication providers
const providers: AuthProvidersResponse = await fetch(
  '/api/auth/providers?version=2.18&source=default'
).then(r => r.json());

// Check if Google login is available
if (providers.google) {
  console.log('Google sign-in URL:', providers.google.signinUrl);
}

// Get user's special profile (requires auth)
const profile: SpecialProfileResponse = await fetch('/rest/auth/get_special_profile')
  .then(r => r.json());

if (profile.profile_type === 'pro') {
  console.log('User has Pro access');
}
```

## Endpoint Catalog Reference

These interfaces are based on the following discovered endpoints:

| Endpoint | Module | Category | Status |
|----------|--------|----------|--------|
| `/api/auth/providers` | Public API | auth | ✅ Documented |
| `/rest/auth/get_special_profile` | layout-sidebar-BPemXja1.js | auth | ✅ Documented |

## Related Files

- **`../snapshots/2026-01-21/endpoints.json`** - Complete endpoint catalog (410 endpoints)
- **`../snapshots/2026-01-21/full_spec.json`** - Full SPA specification
- **`../../src/`** - SDK implementation using these interfaces

## Contributing

When adding new interface definitions:

1. Extract endpoint information from the snapshot data
2. Create logical groupings (e.g., by category or module)
3. Document the source module and endpoint path
4. Provide usage examples
5. Update this README with the new interfaces

## Notes

- All interfaces are based on reverse-engineered endpoints from the SPA
- Field types are inferred from typical API patterns and may need refinement
- Marked as optional (`?`) unless known to be required
- Some fields may be conditional based on user type or permissions

## See Also

- [SPA Assets Main README](../README.md)
- [REST API Guide](../../docs/REST-API-GUIDE.md)
- [Service Worker Guide](../../docs/SERVICE-WORKER-GUIDE.md)
