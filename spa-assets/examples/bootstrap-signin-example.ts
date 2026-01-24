/**
 * Bootstrap Sign-In Function Examples
 * 
 * This file demonstrates how to use the signIn function exported from
 * bootstrap-*.js modules (e.g., bootstrap-CptxcEgE.js) which is a wrapper
 * around NextAuth.js used throughout Perplexity AI's authentication system.
 * 
 * Source: bootstrap-CptxcEgE.js
 * Import Pattern: import { k as signIn } from "./bootstrap-CptxcEgE.js"
 * Used By: LoginModalInner, LoginModal, and various auth components
 */

import type {
  SignInFunction,
  SignInResponse,
  AuthProviderType,
  SignInParams,
  SignInProviderOptions,
  PKCEParams
} from '../interfaces/auth-endpoints';

// ============================================================================
// Type-safe signIn wrapper
// ============================================================================

/**
 * Type-safe wrapper for the bootstrap signIn function
 * In real implementation, import from bootstrap-*.js module
 */
declare const signIn: SignInFunction;

// ============================================================================
// Example 1: Basic OAuth Sign-In (Google, Apple)
// ============================================================================

export async function handleGoogleLogin(redirectUrl: string = '/dashboard'): Promise<boolean> {
  try {
    const response = await signIn('google', {
      callbackUrl: redirectUrl
    });
    
    return response?.ok ?? true; // Default redirect behavior
  } catch (error) {
    console.error('Google login failed:', error);
    return false;
  }
}

export async function handleAppleLogin(redirectUrl: string = '/dashboard'): Promise<boolean> {
  try {
    const response = await signIn('apple', {
      callbackUrl: redirectUrl
    });
    
    return response?.ok ?? true;
  } catch (error) {
    console.error('Apple login failed:', error);
    return false;
  }
}

// ============================================================================
// Example 2: Email Magic Link / OTP
// ============================================================================

export async function handleEmailLogin(
  email: string,
  options: {
    useOTP?: boolean;
    redirectUrl?: string;
    autoRedirect?: boolean;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const {
    useOTP = true,
    redirectUrl = '/auth/verify-request',
    autoRedirect = false
  } = options;

  try {
    const response = await signIn('email', {
      email: email.toLowerCase(),
      callbackUrl: redirectUrl,
      redirect: autoRedirect,
      useNumericOtp: useOTP ? 'true' : undefined,
      redirectOnError: false
    });

    if (response?.error) {
      return { success: false, error: response.error };
    }

    if (!autoRedirect && response?.ok) {
      // Manually redirect to verification page
      const verifyUrl = `/auth/verify-request?email=${encodeURIComponent(email)}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
      window.location.href = verifyUrl;
    }

    return { success: true };
  } catch (error: any) {
    // Handle rate limiting
    if (error?.code === 'AUTH_SIGN_IN_ERROR' && error?.details?.status === 429) {
      return {
        success: false,
        error: 'rate_limited'
      };
    }

    console.error('Email login failed:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }
}

// ============================================================================
// Example 3: WorkOS SSO (Enterprise)
// ============================================================================

export async function handleSSOLogin(
  email: string,
  organizationId: string,
  redirectUrl: string = '/dashboard'
): Promise<boolean> {
  try {
    await signIn('workos', {
      callbackUrl: redirectUrl
    }, {
      organization: organizationId,
      login_hint: email
    });
    
    return true;
  } catch (error) {
    console.error('SSO login failed:', error);
    return false;
  }
}

// ============================================================================
// Example 4: SSO Detection with Auto-Redirect
// ============================================================================

interface SSODetectionResult {
  forceSSO: boolean;
  workOSOrgId: string | null;
  singleTenantHost: string | null;
  initiateWebSSOUrl: string | null;
}

export async function checkSSORequired(email: string): Promise<SSODetectionResult> {
  const response = await fetch('/rest/enterprise/organization/login/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();
  const org = data.organization;

  return {
    forceSSO: org?.force_sso ?? false,
    workOSOrgId: org?.workos_org_id ?? null,
    singleTenantHost: org?.single_tenant ?? null,
    initiateWebSSOUrl: org?.initiate_web_sso_url ?? null
  };
}

export async function handleEmailSubmit(
  email: string,
  redirectUrl: string = '/dashboard'
): Promise<void> {
  const ssoDetails = await checkSSORequired(email);

  // Direct SSO URL available (highest priority)
  if (ssoDetails.initiateWebSSOUrl) {
    window.location.href = ssoDetails.initiateWebSSOUrl;
    return;
  }

  // Single tenant redirect
  if (ssoDetails.singleTenantHost) {
    window.location.href = `https://${ssoDetails.singleTenantHost}`;
    return;
  }

  // WorkOS SSO
  if (ssoDetails.forceSSO && ssoDetails.workOSOrgId) {
    await handleSSOLogin(email, ssoDetails.workOSOrgId, redirectUrl);
    return;
  }

  // Regular email login
  await handleEmailLogin(email, {
    useOTP: true,
    redirectUrl: redirectUrl,
    autoRedirect: false
  });
}

// ============================================================================
// Example 5: PKCE Flow for Desktop Apps
// ============================================================================

/**
 * Generate random string for PKCE verifier
 */
function generateRandomString(length: number): string {
  const arrayLength = Math.ceil(length * 0.75);
  const array = new Uint8Array(arrayLength);
  crypto.getRandomValues(array);
  
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .slice(0, length);
}

/**
 * Generate SHA-256 code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  
  let hash: ArrayBuffer;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    hash = await window.crypto.subtle.digest('SHA-256', data);
  } else {
    // Fallback for environments without crypto.subtle
    throw new Error('crypto.subtle not available');
  }
  
  const hashArray = Array.from(new Uint8Array(hash));
  const hashString = String.fromCharCode(...hashArray);
  
  return btoa(hashString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Store PKCE verifier in cookie
 */
function storePKCEVerifier(verifier: string): void {
  const expiresInDays = 5 / 1440; // 5 minutes
  const expires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  
  document.cookie = `pkce_verifier=${verifier}; path=/; secure; samesite=Lax; expires=${expires.toUTCString()}`;
}

/**
 * Generate PKCE parameters for desktop app authentication
 */
export async function generatePKCEParams(): Promise<PKCEParams> {
  const verifier = generateRandomString(128);
  storePKCEVerifier(verifier);
  
  const challenge = await generateCodeChallenge(verifier);
  
  return {
    code_verifier: verifier,
    code_challenge: challenge
  };
}

/**
 * Handle OAuth login for desktop app with PKCE
 */
export async function handleDesktopLogin(
  provider: 'google' | 'apple' | 'workos',
  options: {
    redirectUrl: string;
    clientId: string;
    organizationId?: string;
    loginHint?: string;
    openExternalURL: (url: string) => void;
  }
): Promise<void> {
  const { redirectUrl, clientId, organizationId, loginHint, openExternalURL } = options;
  
  // Generate PKCE challenge
  const { code_challenge } = await generatePKCEParams();
  
  // Build auth URL
  const origin = window.location.origin;
  const params = new URLSearchParams({
    code_challenge,
    desktopRedirect: redirectUrl,
    client_id: clientId
  });
  
  if (provider === 'workos' && organizationId) {
    params.set('organization', organizationId);
    if (loginHint) {
      params.set('login_hint', loginHint);
    }
  }
  
  const authUrl = `${origin}/auth/oauth/${provider}?${params.toString()}`;
  
  // Open in external browser
  openExternalURL(authUrl);
}

// ============================================================================
// Example 6: Development Logins
// ============================================================================

export type DevLoginType = 
  | 'basic'
  | 'pro'
  | 'enterpriseMember'
  | 'enterpriseAdmin'
  | 'enterpriseBillingAdmin'
  | 'script'
  | 'frontendTest'
  | 'customEmail';

export async function handleDevLogin(
  type: DevLoginType,
  emailHandle?: string
): Promise<boolean> {
  const options: Partial<SignInParams> = {
    callbackUrl: '/'
  };

  switch (type) {
    case 'pro':
      options.pro = 'true';
      break;
    case 'enterpriseMember':
      options.enterprise_member = 'true';
      break;
    case 'enterpriseAdmin':
      options.enterprise_admin = 'true';
      break;
    case 'enterpriseBillingAdmin':
      options.enterprise_billing_admin = 'true';
      break;
    case 'script':
      options.script = 'true';
      break;
    case 'frontendTest':
      options.fe_test = 'true';
      break;
    case 'customEmail':
      if (!emailHandle) {
        throw new Error('Email handle required for customEmail login');
      }
      options.email_handle = emailHandle;
      break;
  }

  try {
    await signIn('devlogin', options);
    return true;
  } catch (error) {
    console.error('Dev login failed:', error);
    return false;
  }
}

// ============================================================================
// Example 7: Complete Login Flow with Error Handling
// ============================================================================

export interface LoginOptions {
  provider: AuthProviderType;
  email?: string;
  redirectUrl?: string;
  isDesktopApp?: boolean;
  clientId?: string;
  openExternalURL?: (url: string) => void;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  rateLimited?: boolean;
}

export async function performLogin(options: LoginOptions): Promise<LoginResult> {
  const {
    provider,
    email,
    redirectUrl = '/dashboard',
    isDesktopApp = false,
    clientId,
    openExternalURL
  } = options;

  try {
    // Handle desktop app with PKCE
    if (isDesktopApp && (provider === 'google' || provider === 'apple' || provider === 'workos')) {
      if (!clientId || !openExternalURL) {
        return {
          success: false,
          error: 'clientId and openExternalURL required for desktop login'
        };
      }

      await handleDesktopLogin(provider, {
        redirectUrl,
        clientId,
        openExternalURL
      });

      return { success: true };
    }

    // Handle email login
    if (provider === 'email') {
      if (!email) {
        return {
          success: false,
          error: 'Email required for email login'
        };
      }

      const result = await handleEmailLogin(email, { redirectUrl });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          rateLimited: result.error === 'rate_limited'
        };
      }

      return {
        success: true,
        requiresVerification: true
      };
    }

    // Handle WorkOS SSO
    if (provider === 'workos' && email) {
      // Check SSO requirements
      const ssoDetails = await checkSSORequired(email);
      
      if (!ssoDetails.workOSOrgId) {
        return {
          success: false,
          error: 'SSO not configured for this email domain'
        };
      }

      await handleSSOLogin(email, ssoDetails.workOSOrgId, redirectUrl);
      return { success: true };
    }

    // Handle OAuth (Google, Apple)
    const response = await signIn(provider, { callbackUrl: redirectUrl });

    return {
      success: response?.ok ?? true,
      error: response?.error
    };
  } catch (error: any) {
    console.error('Login failed:', error);
    
    return {
      success: false,
      error: error?.message || 'Unknown error',
      rateLimited: error?.details?.status === 429
    };
  }
}

// ============================================================================
// Example 8: React Hook for Authentication
// ============================================================================

/**
 * React hook example for using the signIn function
 * 
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { login, loading, error } = useAuth();
 *   
 *   const handleLogin = async () => {
 *     const result = await login({ provider: 'google' });
 *     if (result.success) {
 *       console.log('Login successful');
 *     }
 *   };
 *   
 *   return <button onClick={handleLogin} disabled={loading}>Login</button>;
 * }
 * ```
 */
export function useAuthExample() {
  // This would be a React hook in a real implementation
  // Included here for documentation purposes
  
  const login = async (options: LoginOptions): Promise<LoginResult> => {
    return performLogin(options);
  };

  return {
    login,
    handleGoogleLogin: (redirectUrl?: string) => 
      login({ provider: 'google', redirectUrl }),
    handleAppleLogin: (redirectUrl?: string) =>
      login({ provider: 'apple', redirectUrl }),
    handleEmailLogin: (email: string, redirectUrl?: string) =>
      login({ provider: 'email', email, redirectUrl }),
    handleSSOLogin: (email: string, redirectUrl?: string) =>
      login({ provider: 'workos', email, redirectUrl })
  };
}

// ============================================================================
// Example 9: Provider Discovery and Dynamic UI
// ============================================================================

export async function buildLoginProviderList(): Promise<Array<{
  id: string;
  name: string;
  type: string;
  handler: () => Promise<boolean>;
}>> {
  // Fetch available providers
  const response = await fetch('/api/auth/providers?version=2.18&source=default');
  const providers = await response.json();

  // Build handler list
  const providerList = [];

  if (providers.google) {
    providerList.push({
      id: 'google',
      name: 'Google',
      type: 'oauth',
      handler: () => handleGoogleLogin()
    });
  }

  if (providers.apple) {
    providerList.push({
      id: 'apple',
      name: 'Apple',
      type: 'oauth',
      handler: () => handleAppleLogin()
    });
  }

  if (providers.workos) {
    providerList.push({
      id: 'workos',
      name: 'Single Sign-On (SSO)',
      type: 'oauth',
      handler: async () => {
        // SSO requires email - would be collected from user
        const email = prompt('Enter your work email:');
        if (!email) return false;
        
        const result = await performLogin({
          provider: 'workos',
          email
        });
        
        return result.success;
      }
    });
  }

  return providerList;
}

// ============================================================================
// Example 10: Testing Utilities
// ============================================================================

/**
 * Mock signIn function for testing
 */
export function createMockSignIn(
  shouldSucceed: boolean = true
): SignInFunction {
  return async (provider, options, providerOptions) => {
    console.log('Mock signIn called:', { provider, options, providerOptions });
    
    if (!shouldSucceed) {
      return {
        error: 'Mock error',
        status: 400,
        ok: false,
        url: null
      };
    }

    return {
      ok: true,
      status: 200,
      url: options.callbackUrl || '/',
      error: undefined
    };
  };
}

/**
 * Test helper to verify signIn calls
 */
export function testSignInCall(
  expectedProvider: AuthProviderType,
  expectedOptions: Partial<SignInParams>
): void {
  // In a real test, you would use a mocking library
  // This is just a demonstration
  console.log('Testing signIn with:', {
    expectedProvider,
    expectedOptions
  });
}
