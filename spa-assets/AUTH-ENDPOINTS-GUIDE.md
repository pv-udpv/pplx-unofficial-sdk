# Auth API Endpoints Guide

## Overview

This guide documents the authentication-related API endpoints discovered in the Perplexity AI SPA and API. These endpoints are used for retrieving authentication providers, user authentication status, profile information, and special permissions.

## Endpoints

### GET /api/auth/providers

Retrieves the list of available authentication providers and their configuration.

**Category:** `auth`  
**Authentication:** Not required (public endpoint)

#### Request

```http
GET /api/auth/providers?version=2.18&source=default HTTP/1.1
Host: www.perplexity.ai
```

**Query Parameters:**
- `version` (required, string) - Application version (e.g., "2.18")
- `source` (required, string) - Source context (e.g., "default")

#### Response

```json
{
  "apple": {
    "callbackUrl": "https://www.perplexity.ai/api/auth/callback/apple",
    "id": "apple",
    "name": "Apple",
    "signinUrl": "https://www.perplexity.ai/api/auth/signin/apple",
    "type": "oauth"
  },
  "email": {
    "callbackUrl": "https://www.perplexity.ai/api/auth/callback/email",
    "id": "email",
    "name": "Email",
    "signinUrl": "https://www.perplexity.ai/api/auth/signin/email",
    "type": "email"
  },
  "google": {
    "callbackUrl": "https://www.perplexity.ai/api/auth/callback/google",
    "id": "google",
    "name": "Google",
    "signinUrl": "https://www.perplexity.ai/api/auth/signin/google",
    "type": "oauth"
  },
  "googleonetap": {
    "callbackUrl": "https://www.perplexity.ai/api/auth/callback/googleonetap",
    "id": "googleonetap",
    "name": "google-one-tap",
    "signinUrl": "https://www.perplexity.ai/api/auth/signin/googleonetap",
    "type": "credentials"
  },
  "pplx-jwt-to-cookie": {
    "callbackUrl": "https://www.perplexity.ai/api/auth/callback/pplx-jwt-to-cookie",
    "id": "pplx-jwt-to-cookie",
    "name": "pplx-jwt-to-cookie",
    "signinUrl": "https://www.perplexity.ai/api/auth/signin/pplx-jwt-to-cookie",
    "type": "credentials"
  },
  "workos": {
    "callbackUrl": "https://www.perplexity.ai/api/auth/callback/workos",
    "id": "workos",
    "name": "WorkOS",
    "signinUrl": "https://www.perplexity.ai/api/auth/signin/workos",
    "type": "oauth"
  }
}
```

#### TypeScript Interface

```typescript
import { AuthProvidersResponse, AuthProvidersParams } from './interfaces/auth-endpoints';

const params: AuthProvidersParams = {
  version: '2.18',
  source: 'default'
};

const providers: AuthProvidersResponse = await fetch(
  `/api/auth/providers?version=${params.version}&source=${params.source}`
).then(response => response.json());
```

#### Available Providers

1. **Apple** (`apple`)
   - Type: OAuth
   - Sign-in: `https://www.perplexity.ai/api/auth/signin/apple`

2. **Email** (`email`)
   - Type: Email-based
   - Sign-in: `https://www.perplexity.ai/api/auth/signin/email`

3. **Google** (`google`)
   - Type: OAuth
   - Sign-in: `https://www.perplexity.ai/api/auth/signin/google`

4. **Google One Tap** (`googleonetap`)
   - Type: Credentials
   - Sign-in: `https://www.perplexity.ai/api/auth/signin/googleonetap`

5. **WorkOS** (`workos`)
   - Type: OAuth (Enterprise SSO)
   - Sign-in: `https://www.perplexity.ai/api/auth/signin/workos`

6. **JWT to Cookie** (`pplx-jwt-to-cookie`)
   - Type: Credentials (Internal)
   - Sign-in: `https://www.perplexity.ai/api/auth/signin/pplx-jwt-to-cookie`

#### Use Cases

1. **Dynamic Login UI**
   - Build login page with available providers
   - Show/hide providers based on configuration

2. **Provider Discovery**
   - Detect available authentication methods
   - Enable/disable SSO for enterprise

3. **Authentication Flow**
   - Direct users to appropriate sign-in URLs
   - Handle callbacks after authentication

#### Example Usage

```typescript
import { 
  AuthClient, 
  AuthProvidersResponse, 
  SpecialProfileResponse,
  OrganizationLoginDetailsResponse 
} from './interfaces/auth-endpoints';

class PplxAuthClient implements AuthClient {
  private baseUrl = 'https://www.perplexity.ai';

  async getAuthProviders(params: { version: string; source: string }): Promise<AuthProvidersResponse> {
    const url = new URL('/api/auth/providers', this.baseUrl);
    url.searchParams.set('version', params.version);
    url.searchParams.set('source', params.source);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch auth providers: ${response.status}`);
    }

    return response.json();
  }

  async getOrganizationLoginDetails(params: { email: string }): Promise<OrganizationLoginDetailsResponse> {
    const url = new URL('/rest/enterprise/organization/login/details', this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Failed to check organization details: ${response.status}`);
    }

    return response.json();
  }

  async getSpecialProfile(params?: { refresh?: boolean }): Promise<SpecialProfileResponse> {
    const url = new URL('/rest/auth/get_special_profile', this.baseUrl);
    
    if (params?.refresh) {
      url.searchParams.set('refresh', 'true');
    }

    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    return response.json();
  }
}

// Usage
const client = new PplxAuthClient();
const providers = await client.getAuthProviders({
  version: '2.18',
  source: 'default'
});

// Check available providers
if (providers.google) {
  console.log('Google login available at:', providers.google.signinUrl);
}

if (providers.workos) {
  console.log('Enterprise SSO available via WorkOS');
}

// Build login UI
const oauthProviders = Object.values(providers).filter(p => p?.type === 'oauth');
console.log('OAuth providers:', oauthProviders.map(p => p?.name));
```

**Note:** See `examples/auth-client-example.ts` for a complete, production-ready implementation with full error handling.

---

### POST /rest/enterprise/organization/login/details

Checks if an email address requires SSO authentication and returns organization configuration.

**Source Module:** `LoginModalInner-DytY--wo.js`  
**Category:** `auth`  
**Authentication:** Not required (public endpoint, used before login)

#### Request

```http
POST /rest/enterprise/organization/login/details HTTP/1.1
Host: www.perplexity.ai
Content-Type: application/json

{
  "email": "user@company.com"
}
```

**Body Parameters:**
- `email` (required, string) - Email address to check for SSO requirements

#### Response

```json
{
  "organization": {
    "force_sso": true,
    "workos_org_id": "org_123456",
    "single_tenant": "company.perplexity.ai",
    "initiate_web_sso_url": "https://company.perplexity.ai/sso/initiate"
  }
}
```

**Response when SSO is not required:**
```json
{
  "organization": null
}
```

#### TypeScript Interface

```typescript
import {
  OrganizationLoginDetailsRequest,
  OrganizationLoginDetailsResponse
} from './interfaces/auth-endpoints';

const request: OrganizationLoginDetailsRequest = {
  email: 'user@company.com'
};

const response: OrganizationLoginDetailsResponse = await fetch(
  '/rest/enterprise/organization/login/details',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  }
).then(r => r.json());

if (response.organization?.force_sso) {
  console.log('SSO required');
  if (response.organization.workos_org_id) {
    // Redirect to WorkOS SSO
  }
}
```

#### Use Cases

1. **SSO Detection Before Login**
   - Check if user's email domain requires SSO
   - Show appropriate login UI (SSO vs email)

2. **Automatic SSO Redirect**
   - Redirect enterprise users to SSO automatically
   - Skip password/magic link for SSO-required domains

3. **Single Tenant Detection**
   - Detect single-tenant organizations
   - Redirect to custom domain

4. **WorkOS Integration**
   - Get WorkOS organization ID for SSO
   - Pre-fill email in SSO form (login_hint)

#### Example Usage

```typescript
// Check if email requires SSO
async function checkSSORequired(email: string): Promise<boolean> {
  const response = await fetch('/rest/enterprise/organization/login/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  return data.organization?.force_sso ?? false;
}

// Full SSO detection flow
async function handleEmailLogin(email: string) {
  const details = await fetch('/rest/enterprise/organization/login/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(r => r.json());

  if (details.organization?.initiate_web_sso_url) {
    // Direct SSO URL available
    window.location.href = details.organization.initiate_web_sso_url;
    return;
  }

  if (details.organization?.single_tenant) {
    // Redirect to single tenant domain
    window.location.href = `https://${details.organization.single_tenant}`;
    return;
  }

  if (details.organization?.force_sso && details.organization?.workos_org_id) {
    // Redirect to WorkOS SSO
    const params = new URLSearchParams({
      organization: details.organization.workos_org_id,
      login_hint: email
    });
    window.location.href = `/api/auth/signin/workos?${params}`;
    return;
  }

  // No SSO required, proceed with email/password login
  // ... regular email login flow
}
```

#### Implementation Notes

1. **Caching**: The LoginModalInner component caches results for 30 seconds per email
2. **Rate Limiting**: Check `/rest/rate-limit/status` for limits
3. **Timeout**: Default timeout is 10 seconds (MEDIUM timeout)
4. **Retries**: 1 retry on failure

---

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

Auth-related endpoints documented in this guide:

1. **`/api/auth/providers`** - Get available authentication providers (public)
2. **`/rest/auth/get_special_profile`** - Get special user profile (authenticated)

Related user information endpoints:

- `/rest/user/info` - Basic user information
- `/rest/user/settings` - User preferences and settings
- `/rest/user/get_user_ai_profile` - AI-specific user profile
- `/rest/enterprise/user/organization` - Enterprise organization details
- `/rest/connections/oauth_callback` - OAuth connection callback
- `/rest/connections/oauth_callback_merge` - OAuth merge callback

## Security Considerations

### For /api/auth/providers

1. **Public Endpoint**
   - No authentication required
   - Can be cached client-side
   - Safe to call frequently

2. **Version Management**
   - Always use current application version
   - Provider configuration may change between versions

### For /rest/auth/get_special_profile

1. **Session-Based Authentication**
   - Requires valid session cookies
   - No API key or token authentication supported

2. **Rate Limiting**
   - Check `/rest/rate-limit/status` for current limits
   - Implement exponential backoff on failures

3. **Cache Management**
   - Profile data is typically cached on the client
   - Use `refresh=true` only when necessary

---

## Bootstrap Sign-In Function

### Overview

The `signIn` function is exported from the `bootstrap-*.js` modules (e.g., `bootstrap-CptxcEgE.js`) and provides the core authentication functionality for Perplexity AI. It's a wrapper around NextAuth.js that handles various authentication methods including OAuth, email magic links, and SSO.

**Source Module:** `bootstrap-CptxcEgE.js`  
**Import Pattern:** `import { k as signIn } from "./bootstrap-CptxcEgE.js"`  
**Used By:** `LoginModalInner-DytY--wo.js`, `LoginModal-CDu8fEYM.js`

### Function Signature

```typescript
type SignInFunction = (
  provider: AuthProviderType,
  options: Partial<SignInParams>,
  providerOptions?: SignInProviderOptions
) => Promise<SignInResponse | undefined>;
```

### Parameters

1. **provider** (`AuthProviderType`) - Authentication provider ID
   - `"google"` - Google OAuth
   - `"apple"` - Apple OAuth
   - `"email"` - Email magic link / OTP
   - `"workos"` - WorkOS SSO (Enterprise)
   - `"googleonetap"` - Google One Tap
   - `"pplx-jwt-to-cookie"` - Internal JWT conversion
   - `"devlogin"` - Development/test logins

2. **options** (`Partial<SignInParams>`) - Sign-in configuration
   - `callbackUrl` (required) - Redirect URL after authentication
   - `redirect` (optional) - Whether to redirect immediately (default: true)
   - `email` (optional) - Email address (for email provider)
   - `useNumericOtp` (optional) - Use numeric OTP instead of magic link
   - `redirectOnError` (optional) - Redirect on error
   - `pro`, `enterprise_member`, etc. - Special user flags for dev logins

3. **providerOptions** (`SignInProviderOptions`) - Provider-specific options
   - `organization` - WorkOS organization ID (for SSO)
   - `login_hint` - Pre-fill email in SSO form

### Usage Examples

#### 1. Google OAuth Sign-In

```typescript
import { signIn } from './bootstrap-CptxcEgE.js';

async function handleGoogleLogin() {
  await signIn('google', {
    callbackUrl: '/dashboard'
  });
}
```

#### 2. Apple OAuth Sign-In

```typescript
async function handleAppleLogin() {
  await signIn('apple', {
    callbackUrl: window.location.origin + '/dashboard'
  });
}
```

#### 3. Email Magic Link / OTP

```typescript
async function handleEmailLogin(email: string) {
  try {
    await signIn('email', {
      email: email,
      callbackUrl: '/auth/verify-request',
      redirect: false,
      useNumericOtp: 'true',
      redirectOnError: false
    });
    
    // Redirect to verification page
    router.push(`/auth/verify-request?email=${encodeURIComponent(email)}`);
  } catch (error) {
    if (error.code === 'AUTH_SIGN_IN_ERROR' && error.status === 429) {
      // Rate limited
      router.push('/auth/email-rate-limited');
    } else {
      console.error('Email sign-in failed:', error);
    }
  }
}
```

#### 4. WorkOS SSO (Enterprise)

```typescript
async function handleSSOLogin(email: string, orgId: string) {
  await signIn('workos', {
    callbackUrl: '/dashboard'
  }, {
    organization: orgId,
    login_hint: email
  });
}
```

#### 5. Development Logins

```typescript
// Pro user
await signIn('devlogin', {
  callbackUrl: '/',
  pro: 'true'
});

// Enterprise admin
await signIn('devlogin', {
  callbackUrl: '/',
  enterprise_admin: 'true'
});

// Custom email handle
await signIn('devlogin', {
  callbackUrl: '/',
  email_handle: 'test-user'
});
```

### PKCE Flow (Desktop Apps)

For Windows desktop app and other platforms requiring PKCE:

```typescript
// 1. Generate PKCE challenge
async function generateCodeChallenge(): Promise<string> {
  const verifier = generateRandomString(128);
  
  // Store verifier in cookie
  setCookie('pkce_verifier', verifier, {
    secure: true,
    sameSite: 'Lax',
    expires: 5 / 1440, // 5 minutes
    path: '/'
  });
  
  // Generate SHA-256 challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return challenge;
}

// 2. Use in sign-in URL
async function handleDesktopLogin(provider: string) {
  const origin = window.location.origin;
  const codeChallenge = await generateCodeChallenge();
  const redirectUrl = encodeURIComponent('/dashboard');
  const clientId = 'YOUR_CLIENT_ID';
  
  const url = `${origin}/auth/oauth/${provider}?code_challenge=${codeChallenge}&desktopRedirect=${redirectUrl}&client_id=${clientId}`;
  
  // Open in external browser
  openExternalURL(url);
}
```

### Error Handling

```typescript
import { SignInResponse } from './interfaces/auth-endpoints';

async function handleSignIn(provider: string): Promise<boolean> {
  try {
    const response: SignInResponse = await signIn(provider, {
      callbackUrl: '/dashboard',
      redirect: false
    });
    
    if (response?.error) {
      console.error('Sign-in error:', response.error);
      return false;
    }
    
    if (response?.url) {
      // Redirect to the URL
      window.location.href = response.url;
    }
    
    return response?.ok ?? false;
  } catch (error) {
    console.error('Sign-in exception:', error);
    return false;
  }
}
```

### Integration with Login Modal

The `LoginModalInner` component uses the bootstrap signIn function extensively:

```typescript
// From LoginModalInner-DytY--wo.js
import { k as signIn } from "./bootstrap-CptxcEgE.js";

const handleThirdPartySignIn = async (provider: string) => {
  trackEvent('login with third party clicked', { thirdParty: provider });
  
  const origin = window.location.origin;
  
  if (isWindowsApp) {
    // Desktop app with PKCE
    const codeChallenge = await generateCodeChallenge();
    const url = `${origin}/auth/${OAUTH_PATH}/${provider}?code_challenge=${codeChallenge}&desktopRedirect=${encodeURIComponent(redirectUrl)}&client_id=${CLIENT_ID}`;
    openExternalURL(url);
  } else {
    // Web app
    await signIn(provider, { callbackUrl: redirectUrl });
  }
};
```

### Common Patterns

#### 1. SSO Detection and Automatic Redirect

```typescript
async function handleEmailSubmit(email: string) {
  // Check if SSO is required
  const details = await fetch('/rest/enterprise/organization/login/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(r => r.json());
  
  if (details.organization?.force_sso) {
    // SSO required - use WorkOS
    if (details.organization.workos_org_id) {
      await signIn('workos', {
        callbackUrl: '/dashboard'
      }, {
        organization: details.organization.workos_org_id,
        login_hint: email
      });
    }
  } else {
    // Regular email login
    await signIn('email', {
      email: email,
      callbackUrl: '/auth/verify-request',
      redirect: false,
      useNumericOtp: 'true'
    });
  }
}
```

#### 2. Dynamic Provider Selection

```typescript
async function buildLoginUI() {
  // Get available providers
  const providers = await fetch('/api/auth/providers?version=2.18&source=default')
    .then(r => r.json());
  
  // Filter OAuth providers
  const oauthProviders = Object.values(providers)
    .filter(p => p?.type === 'oauth');
  
  // Create login buttons
  oauthProviders.forEach(provider => {
    if (provider) {
      createButton(provider.name, () => {
        signIn(provider.id, { callbackUrl: '/dashboard' });
      });
    }
  });
}
```

#### 3. Rate Limiting Handling

```typescript
async function handleEmailLogin(email: string) {
  try {
    await signIn('email', {
      email: email,
      callbackUrl: '/verify',
      redirect: false,
      useNumericOtp: 'true',
      redirectOnError: false
    });
  } catch (error) {
    if (error?.code === 'AUTH_SIGN_IN_ERROR' && error?.details?.status === 429) {
      // Rate limited - show appropriate message
      router.push('/auth/email-rate-limited');
    } else {
      // Generic error
      console.error('Sign-in failed:', error);
    }
  }
}
```

### Security Considerations

1. **PKCE for Desktop Apps**
   - Always use PKCE flow for desktop/mobile apps
   - Store verifier securely in HTTP-only cookie
   - Set short expiration (5 minutes)

2. **Callback URL Validation**
   - Always use absolute URLs for callbacks
   - Validate redirect URLs on the server
   - Use allow-list for permitted domains

3. **Rate Limiting**
   - Email sign-in is rate limited (429 status)
   - Implement exponential backoff
   - Show user-friendly error messages

4. **Error Handling**
   - Never expose sensitive error details to users
   - Log errors with trace IDs for debugging
   - Provide fallback authentication methods

5. **Session Security**
   - Cookies are secure, HTTP-only, SameSite=Lax
   - Session duration is limited (check expiration)
   - Clear cookies on logout

### TypeScript Interfaces

See [auth-endpoints.ts](./interfaces/auth-endpoints.ts) for complete type definitions:
- `SignInFunction` - Main function signature
- `SignInParams` - Sign-in options
- `SignInProviderOptions` - Provider-specific options
- `SignInResponse` - Response interface
- `AuthProviderType` - Supported providers

## Module Reference

The endpoint is referenced in the following SPA modules:

- **layout-sidebar-BPemXja1.js** - Primary usage for sidebar rendering
  - Other endpoints in this module:
    - `rest/user/promotions`
    - `rest/enterprise/user/organization`
    - `rest/user/get_user_ai_profile`
    - `rest/enterprise/user/organization/seat-info`
    - `rest/user/site-instructions`

- **LoginModalInner-DytY--wo.js** - Login modal implementation
  - Imports: `import { k as signIn } from "./bootstrap-CptxcEgE.js"`
  - Handles: Google, Apple, Email, WorkOS, DevLogin providers
  - Features: PKCE for desktop, SSO detection, rate limiting

- **LoginModal-CDu8fEYM.js** - Login modal wrapper
  - Orchestrates login flow
  - Manages modal state and callbacks

- **bootstrap-CptxcEgE.js** - Core authentication module
  - Exports: signIn function (NextAuth.js wrapper)
  - Handles: All authentication provider integrations

## Next Steps

1. **Implement Client** - Create a complete auth client using the interfaces
2. **Add Tests** - Write integration tests for both endpoints
3. **Document Edge Cases** - Document special scenarios and edge cases
4. **Add Authentication Flows** - Document complete login/logout flows

## API Endpoints Summary

| Endpoint | Type | Auth Required | Purpose |
|----------|------|---------------|---------|
| `/api/auth/providers` | GET | No | Get available auth providers |
| `/api/auth/signin/{provider}` | POST | No | Initiate authentication with provider |
| `/api/auth/callback/{provider}` | GET/POST | No | OAuth callback handler |
| `/rest/enterprise/organization/login/details` | POST | No | Check SSO requirements for email |
| `/rest/auth/get_special_profile` | GET | Yes | Get user special profile |

## References

- [TypeScript Interfaces](./interfaces/auth-endpoints.ts)
- [Auth Client Example](./examples/auth-client-example.ts)
- [Endpoint Catalog](./snapshots/2026-01-21/endpoints.json)
- [SPA Assets README](./README.md)
- [REST API Guide](../docs/REST-API-GUIDE.md)
