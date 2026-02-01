# Auth Client Examples

This directory contains practical examples demonstrating how to use the auth endpoint interfaces and the bootstrap signIn function.

## Files

### `auth-client-example.ts`

Example implementation of an authentication client using the TypeScript interfaces defined in `../interfaces/auth-endpoints.ts`.

**Features:**
- Practical `AuthClient` interface implementation example
- Error handling
- 5 comprehensive usage examples

### `bootstrap-signin-example.ts`

Comprehensive examples for using the `signIn` function exported from `bootstrap-*.js` modules (e.g., `bootstrap-CptxcEgE.js`).

**Features:**
- 10 complete usage patterns
- OAuth (Google, Apple), Email, and SSO examples
- PKCE flow for desktop apps
- SSO detection and auto-redirect
- Error handling and rate limiting
- React hook example
- Testing utilities

## Running the Examples

### Prerequisites

```bash
npm install
```

### Usage

Import and use the examples in your TypeScript project:

```typescript
// Auth Client examples
import { 
  PplxAuthClient,
  buildLoginUI,
  checkUserProfile,
  completeAuthFlow 
} from './spa-assets/examples/auth-client-example';

// Bootstrap signIn examples
import {
  handleGoogleLogin,
  handleEmailLogin,
  handleSSOLogin,
  performLogin
} from './spa-assets/examples/bootstrap-signin-example';

// Example 1: Get authentication providers
const providers = await buildLoginUI();

// Example 2: Perform OAuth login
await handleGoogleLogin('/dashboard');

// Example 3: Email login with OTP
await handleEmailLogin('user@example.com', {
  useOTP: true,
  redirectUrl: '/verify'
});

// Example 4: Complete login flow
const result = await performLogin({
  provider: 'google',
  redirectUrl: '/dashboard'
});
```

## Bootstrap SignIn Examples

### Overview

The `bootstrap-signin-example.ts` file provides comprehensive examples for using the `signIn` function exported from the `bootstrap-*.js` modules. This function is the core authentication mechanism used throughout Perplexity AI.

**Source:** `bootstrap-CptxcEgE.js`  
**Import Pattern:** `import { k as signIn } from "./bootstrap-CptxcEgE.js"`

### Examples Included

#### 1. Basic OAuth Sign-In

Simple OAuth authentication with Google or Apple.

```typescript
import { handleGoogleLogin, handleAppleLogin } from './bootstrap-signin-example';

// Google login
const success = await handleGoogleLogin('/dashboard');

// Apple login
const success = await handleAppleLogin('/dashboard');
```

#### 2. Email Magic Link / OTP

Email-based authentication with magic links or numeric OTP codes.

```typescript
import { handleEmailLogin } from './bootstrap-signin-example';

const result = await handleEmailLogin('user@example.com', {
  useOTP: true,
  redirectUrl: '/dashboard',
  autoRedirect: false
});

if (result.success) {
  // Redirect to verification page
  console.log('Check your email for verification code');
} else if (result.error === 'rate_limited') {
  console.log('Too many requests. Please try again later.');
}
```

#### 3. WorkOS SSO (Enterprise)

Enterprise single sign-on via WorkOS.

```typescript
import { handleSSOLogin } from './bootstrap-signin-example';

await handleSSOLogin(
  'user@company.com',
  'org_123456', // WorkOS organization ID
  '/dashboard'
);
```

#### 4. SSO Detection with Auto-Redirect

Automatically detect if an email domain requires SSO and redirect appropriately.

```typescript
import { handleEmailSubmit, checkSSORequired } from './bootstrap-signin-example';

// Automatic SSO detection and routing
await handleEmailSubmit('user@company.com', '/dashboard');

// Or check manually
const ssoDetails = await checkSSORequired('user@company.com');
if (ssoDetails.forceSSO) {
  console.log('SSO required for this domain');
}
```

#### 5. PKCE Flow for Desktop Apps

Secure OAuth flow for desktop applications using PKCE (Proof Key for Code Exchange).

```typescript
import { handleDesktopLogin } from './bootstrap-signin-example';

await handleDesktopLogin('google', {
  redirectUrl: '/dashboard',
  clientId: 'YOUR_CLIENT_ID',
  openExternalURL: (url) => {
    // Open URL in external browser
    window.open(url, '_blank');
  }
});
```

#### 6. Development Logins

Special login types for development and testing.

```typescript
import { handleDevLogin } from './bootstrap-signin-example';

// Pro user
await handleDevLogin('pro');

// Enterprise admin
await handleDevLogin('enterpriseAdmin');

// Custom email handle
await handleDevLogin('customEmail', 'test-user');
```

#### 7. Complete Login Flow with Error Handling

Full login flow with comprehensive error handling and provider detection.

```typescript
import { performLogin } from './bootstrap-signin-example';

const result = await performLogin({
  provider: 'google',
  redirectUrl: '/dashboard'
});

if (result.success) {
  console.log('Login successful');
  if (result.requiresVerification) {
    console.log('Check your email for verification');
  }
} else {
  console.error('Login failed:', result.error);
  if (result.rateLimited) {
    console.log('Too many attempts. Please try again later.');
  }
}
```

#### 8. React Hook for Authentication

React hook example for managing authentication state.

```typescript
import { useAuthExample } from './bootstrap-signin-example';

function LoginPage() {
  const { handleGoogleLogin, handleEmailLogin } = useAuthExample();
  
  return (
    <div>
      <button onClick={() => handleGoogleLogin()}>Login with Google</button>
      <button onClick={() => handleEmailLogin('user@example.com')}>
        Login with Email
      </button>
    </div>
  );
}
```

#### 9. Provider Discovery and Dynamic UI

Build a dynamic login UI based on available providers.

```typescript
import { buildLoginProviderList } from './bootstrap-signin-example';

const providers = await buildLoginProviderList();

// Render providers dynamically
providers.forEach(provider => {
  console.log(`${provider.name} (${provider.type})`);
  // Create button that calls provider.handler()
});
```

#### 10. Testing Utilities

Mock signIn function for unit testing.

```typescript
import { createMockSignIn } from './bootstrap-signin-example';

// Create mock that always succeeds
const mockSignIn = createMockSignIn(true);

// Use in tests
const result = await mockSignIn('google', { callbackUrl: '/' });
expect(result.ok).toBe(true);
```

### Error Handling Patterns

The examples include robust error handling for common scenarios:

- **Rate Limiting:** Detect 429 status and show appropriate messages
- **SSO Not Available:** Handle cases where SSO is not configured
- **Invalid Email:** Validate email format before submission
- **Network Errors:** Handle connection failures gracefully
- **Authentication Errors:** Display user-friendly error messages

### Security Considerations

The examples demonstrate important security practices:

- **PKCE for Desktop Apps:** Secure OAuth flow without client secrets
- **Secure Cookies:** HTTP-only, Secure, SameSite=Lax
- **Rate Limiting:** Respect API rate limits
- **Error Messages:** Don't expose sensitive information
- **Callback URL Validation:** Use allow-lists for redirect URLs

## Examples Overview

### 1. Build Login UI (`buildLoginUI`)

Fetches available authentication providers and displays them for building a login interface.

**Output:**
```
OAuth Providers:
  - Apple: https://www.perplexity.ai/api/auth/signin/apple
  - Google: https://www.perplexity.ai/api/auth/signin/google
  - WorkOS: https://www.perplexity.ai/api/auth/signin/workos

✅ Google login available
   Sign-in URL: https://www.perplexity.ai/api/auth/signin/google
```

### 2. Check User Profile (`checkUserProfile`)

Retrieves and displays the authenticated user's special profile information.

**Output:**
```
User Profile:
  User ID: user-uuid-here
  Profile Type: pro

Permissions:
  advanced_search: ✅
  beta_features: ✅

Badges: verified, early_adopter

Beta Features: new-ui, advanced-search
```

### 3. Complete Auth Flow (`completeAuthFlow`)

Demonstrates a complete authentication workflow from provider discovery to user profile access.

**Steps:**
1. Fetch authentication providers
2. Display login options
3. Get user profile (after authentication)
4. Determine access level
5. Enable features based on permissions

### 4. Conditional Feature Rendering (`renderFeaturesByProfile`)

Shows how to use profile data to enable/disable features dynamically.

**Output:**
```json
{
  "showProFeatures": true,
  "showEnterpriseFeatures": false,
  "showBetaFeatures": true,
  "showBadges": true,
  "isVerified": true,
  "isStaff": false
}
```

### 5. Redirect to Sign-In (`redirectToSignIn`)

Demonstrates how to redirect users to the appropriate authentication provider.

```typescript
// Redirect to Google sign-in
const url = await redirectToSignIn('google');
// Returns: https://www.perplexity.ai/api/auth/signin/google

// In browser:
window.location.href = url;
```

## Class: PplxAuthClient

Complete implementation of the `AuthClient` interface.

### Methods

#### `getAuthProviders(params)`

Fetches available authentication providers.

**Parameters:**
- `params.version` (string) - Application version (e.g., "2.18")
- `params.source` (string) - Source context (e.g., "default")

**Returns:** `Promise<AuthProvidersResponse>`

#### `getSpecialProfile(params?)`

Fetches special profile for authenticated user.

**Parameters:**
- `params.refresh` (boolean, optional) - Force refresh cached data

**Returns:** `Promise<SpecialProfileResponse>`

### Error Handling

The client automatically handles API errors and returns structured error responses:

```typescript
try {
  const profile = await client.getSpecialProfile();
} catch (error) {
  // error is of type AuthErrorResponse
  console.error(error.message);
  console.error('Status:', error.status_code);
}
```

## Integration Examples

### React Hook

```typescript
import { useState, useEffect } from 'react';
import { PplxAuthClient } from './auth-client-example';

function useAuthProviders() {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = new PplxAuthClient();
    client.getAuthProviders({ version: '2.18', source: 'default' })
      .then(setProviders)
      .finally(() => setLoading(false));
  }, []);

  return { providers, loading };
}
```

### Vue Composition API

```typescript
import { ref, onMounted } from 'vue';
import { PplxAuthClient } from './auth-client-example';

export function useAuthProviders() {
  const providers = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    const client = new PplxAuthClient();
    providers.value = await client.getAuthProviders({
      version: '2.18',
      source: 'default'
    });
    loading.value = false;
  });

  return { providers, loading };
}
```

## See Also

- [Auth Endpoints Guide](../AUTH-ENDPOINTS-GUIDE.md) - Complete API documentation
- [Auth Interfaces](../interfaces/auth-endpoints.ts) - TypeScript interface definitions
- [Interfaces README](../interfaces/README.md) - Interface documentation
