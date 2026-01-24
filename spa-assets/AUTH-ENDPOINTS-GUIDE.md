# Auth API Endpoints Guide

## Overview

This guide documents the authentication-related API endpoints discovered in the Perplexity AI SPA. These endpoints are used for retrieving user authentication status, profile information, and special permissions.

## Endpoints

### GET /rest/auth/get_special_profile

Retrieves special profile information for the authenticated user, including permissions, badges, and organizational affiliations.

**Source Module:** `layout-sidebar-BPemXja1.js`  
**Category:** `auth`  
**Authentication:** Required (session/cookies)

#### Request

```http
GET /rest/auth/get_special_profile HTTP/1.1
Host: www.perplexity.ai
Cookie: [session cookies]
```

**Query Parameters:**
- `refresh` (optional, boolean) - Force refresh of cached profile data

#### Response

```typescript
{
  "user_id": "uuid-string",
  "profile_type": "pro" | "enterprise" | "verified" | "staff" | "beta_tester",
  "badges": ["verified", "early_adopter"],
  "permissions": {
    "feature_x": true,
    "feature_y": false
  },
  "beta_features": ["new-ui", "advanced-search"],
  "early_access": true,
  "created_at": "2024-01-01T00:00:00Z",
  "verified_at": "2024-06-01T00:00:00Z",
  "organization": {
    "uuid": "org-uuid",
    "name": "Acme Corp",
    "role": "admin"
  },
  "metadata": {
    "custom_field": "value"
  }
}
```

#### TypeScript Interface

```typescript
import { SpecialProfileResponse } from './interfaces/auth-endpoints';

const profile: SpecialProfileResponse = await fetch('/rest/auth/get_special_profile')
  .then(response => response.json());
```

#### Use Cases

1. **Feature Flag Evaluation**
   - Determine which features are available to the user
   - Show/hide UI elements based on permissions

2. **Badge Display**
   - Display special badges on user profiles
   - Show verification status

3. **Organization Management**
   - Display organization affiliation in sidebar
   - Enable organization-specific features

4. **Beta Access Control**
   - Grant access to beta features
   - Show early access UI elements

#### Example Usage

```typescript
import { AuthClient, SpecialProfileResponse } from './interfaces/auth-endpoints';

class PplxAuthClient implements AuthClient {
  private baseUrl = 'https://www.perplexity.ai';

  async getSpecialProfile(params?: { refresh?: boolean }): Promise<SpecialProfileResponse> {
    const url = new URL('/rest/auth/get_special_profile', this.baseUrl);
    if (params?.refresh) {
      url.searchParams.set('refresh', 'true');
    }

    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch special profile: ${response.status}`);
    }

    return response.json();
  }
}

// Usage
const client = new PplxAuthClient();
const profile = await client.getSpecialProfile();

// Check permissions
if (profile.permissions?.['advanced_search']) {
  console.log('User has access to advanced search');
}

// Display badges
if (profile.badges?.includes('verified')) {
  console.log('User is verified');
}

// Check organization role
if (profile.organization?.role === 'admin') {
  console.log('User is an organization admin');
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "status_code": 401
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "status_code": 403
}
```

**500 Internal Server Error**
```json
{
  "error": "InternalServerError",
  "message": "Failed to retrieve profile",
  "status_code": 500,
  "details": {
    "trace_id": "xxx"
  }
}
```

## Integration with Sidebar

This endpoint is called by the `layout-sidebar-BPemXja1.js` module to:

1. Display user-specific UI elements
2. Show organization membership
3. Enable/disable features based on permissions
4. Display special badges and indicators

## Related Endpoints

While this is the only endpoint in the `auth` category, related user information can be obtained from:

- `/rest/user/info` - Basic user information
- `/rest/user/settings` - User preferences and settings
- `/rest/user/get_user_ai_profile` - AI-specific user profile
- `/rest/enterprise/user/organization` - Enterprise organization details

## Security Considerations

1. **Session-Based Authentication**
   - This endpoint requires valid session cookies
   - No API key or token authentication supported

2. **Rate Limiting**
   - Check `/rest/rate-limit/status` for current limits
   - Implement exponential backoff on failures

3. **Cache Management**
   - Profile data is typically cached on the client
   - Use `refresh=true` only when necessary

## Module Reference

The endpoint is referenced in the following SPA modules:

- **layout-sidebar-BPemXja1.js** - Primary usage for sidebar rendering
  - Other endpoints in this module:
    - `rest/user/promotions`
    - `rest/enterprise/user/organization`
    - `rest/user/get_user_ai_profile`
    - `rest/enterprise/user/organization/seat-info`
    - `rest/user/site-instructions`

## Next Steps

1. **Implement Client** - Create a complete auth client using the interfaces
2. **Add Tests** - Write integration tests for the endpoint
3. **Document Edge Cases** - Document special scenarios and edge cases
4. **Add More Auth Endpoints** - As more endpoints are discovered, add them here

## References

- [TypeScript Interfaces](./interfaces/auth-endpoints.ts)
- [Endpoint Catalog](./snapshots/2026-01-21/endpoints.json)
- [SPA Assets README](./README.md)
- [REST API Guide](../docs/REST-API-GUIDE.md)
