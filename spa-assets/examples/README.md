# Auth Client Examples

This directory contains practical examples demonstrating how to use the auth endpoint interfaces.

## Files

### `auth-client-example.ts`

Complete implementation of an authentication client using the TypeScript interfaces defined in `../interfaces/auth-endpoints.ts`.

**Features:**
- Full `AuthClient` interface implementation
- Error handling
- 5 comprehensive usage examples

## Running the Examples

### Prerequisites

```bash
npm install
```

### Usage

Import and use the examples in your TypeScript project:

```typescript
import { 
  PplxAuthClient,
  buildLoginUI,
  checkUserProfile,
  completeAuthFlow 
} from './spa-assets/examples/auth-client-example';

// Example 1: Get authentication providers
const providers = await buildLoginUI();

// Example 2: Check user profile
const profile = await checkUserProfile();

// Example 3: Complete auth flow
const { providers, profile } = await completeAuthFlow();
```

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
