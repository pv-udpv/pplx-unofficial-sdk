// ============================================================================
// Perplexity Auth Endpoints - TypeScript Interface Definitions
// Extracted from spa-assets/snapshots/2026-01-21/endpoints.json
// ============================================================================

/**
 * Auth Endpoints Category
 * 
 * This module defines TypeScript interfaces for the authentication-related
 * endpoints discovered in the Perplexity AI SPA and API.
 * 
 * Sources:
 * - layout-sidebar-BPemXja1.js module
 * - LoginModalInner-DytY--wo.js
 * - LoginModal-CDu8fEYM.js
 * 
 * Category: auth (3 primary endpoints + signin/callback endpoints)
 */

// ============================================================================
// ENDPOINT: /api/auth/providers
// ============================================================================

/**
 * Authentication providers configuration
 * 
 * This endpoint returns the list of available authentication providers
 * (e.g., Google, Apple, Email, WorkOS) and their configuration for the current
 * application version and source.
 * 
 * Endpoint: GET /api/auth/providers
 * Authentication: Not required (public endpoint)
 * Query Parameters:
 *   - version: Application version (e.g., "2.18")
 *   - source: Source context (e.g., "default")
 */
export interface AuthProvider {
  /**
   * Callback URL for the provider after authentication
   * Example: "https://www.perplexity.ai/api/auth/callback/google"
   */
  callbackUrl: string;

  /**
   * Provider identifier (e.g., "google", "apple", "email", "workos")
   */
  id: string;

  /**
   * Display name for the provider
   */
  name: string;

  /**
   * Sign-in URL to initiate authentication
   * Example: "https://www.perplexity.ai/api/auth/signin/google"
   */
  signinUrl: string;

  /**
   * Provider type
   * - oauth: OAuth-based authentication (Google, Apple, WorkOS)
   * - email: Email-based authentication
   * - credentials: Credential-based authentication (Google One Tap, JWT)
   */
  type: "oauth" | "email" | "credentials";
}

/**
 * Response from /api/auth/providers endpoint
 * 
 * Returns a map of provider IDs to provider configurations
 */
export interface AuthProvidersResponse {
  /**
   * Apple OAuth authentication
   */
  apple?: AuthProvider;

  /**
   * Email-based authentication
   */
  email?: AuthProvider;

  /**
   * Google OAuth authentication
   */
  google?: AuthProvider;

  /**
   * Google One Tap authentication
   */
  googleonetap?: AuthProvider;

  /**
   * Internal JWT to cookie conversion
   */
  "pplx-jwt-to-cookie"?: AuthProvider;

  /**
   * WorkOS SSO authentication (for enterprise)
   */
  workos?: AuthProvider;

  /**
   * Additional providers (dynamic)
   */
  [providerId: string]: AuthProvider | undefined;
}

/**
 * Query parameters for /api/auth/providers
 */
export interface AuthProvidersParams {
  /**
   * Application version (e.g., "2.18")
   */
  version: string;

  /**
   * Source context (e.g., "default")
   */
  source: string;
}

// ============================================================================
// ENDPOINT: rest/auth/get_special_profile
// ============================================================================

/**
 * Special profile information for the authenticated user
 * 
 * This endpoint appears to retrieve special profile attributes or permissions
 * for the current user, likely used in the layout sidebar to determine
 * feature access or display special badges/indicators.
 * 
 * Endpoint: GET /rest/auth/get_special_profile
 * Module: layout-sidebar-BPemXja1.js
 * Authentication: Required (cookies/session)
 */
export interface SpecialProfileResponse {
  /**
   * User's unique identifier
   */
  user_id?: string;

  /**
   * Special profile type or tier
   * Examples: "pro", "enterprise", "verified", "staff", "beta_tester"
   */
  profile_type?: string;

  /**
   * List of special badges or indicators
   */
  badges?: string[];

  /**
   * Special permissions or feature flags enabled for this user
   */
  permissions?: {
    [key: string]: boolean;
  };

  /**
   * Beta features access
   */
  beta_features?: string[];

  /**
   * Early access features
   */
  early_access?: boolean;

  /**
   * Account creation timestamp
   */
  created_at?: string;

  /**
   * Last verification timestamp
   */
  verified_at?: string;

  /**
   * Organization affiliation (for enterprise users)
   * All fields are required when organization object is present
   */
  organization?: {
    uuid: string;
    name: string;
    role: "admin" | "member" | "owner";
  };

  /**
   * Special profile metadata
   */
  metadata?: {
    [key: string]: any;
  };
}

// ============================================================================
// ENDPOINT: /rest/enterprise/organization/login/details
// ============================================================================

/**
 * Organization login details for SSO detection
 * 
 * This endpoint checks if an email address requires SSO authentication
 * and returns the organization configuration if applicable.
 * 
 * Endpoint: POST /rest/enterprise/organization/login/details
 * Authentication: Not required (used before login)
 * Used by: LoginModalInner component for SSO detection
 */
export interface OrganizationLoginDetailsRequest {
  /**
   * Email address to check for SSO requirements
   */
  email: string;
}

/**
 * Organization information returned when SSO is configured
 */
export interface OrganizationLoginDetails {
  /**
   * Whether this email domain requires SSO (force SSO enabled)
   */
  force_sso?: boolean;

  /**
   * WorkOS organization ID for SSO authentication
   */
  workos_org_id?: string | null;

  /**
   * Single tenant host for this organization
   * Example: "acme.perplexity.ai"
   */
  single_tenant?: string | null;

  /**
   * Direct URL to initiate web SSO
   */
  initiate_web_sso_url?: string | null;
}

/**
 * Response from login/details endpoint
 */
export interface OrganizationLoginDetailsResponse {
  /**
   * Organization details if SSO is configured
   */
  organization?: OrganizationLoginDetails | null;
}

// ============================================================================
// AUTHENTICATION FLOW TYPES
// ============================================================================

/**
 * PKCE (Proof Key for Code Exchange) parameters
 * Used for secure OAuth flows, especially in desktop apps
 */
export interface PKCEParams {
  /**
   * Code verifier - random string stored in cookie
   */
  code_verifier: string;

  /**
   * Code challenge - SHA-256 hash of verifier
   */
  code_challenge: string;
}

/**
 * Sign-in parameters for various auth methods
 */
export interface SignInParams {
  /**
   * Callback URL after authentication
   */
  callbackUrl: string;

  /**
   * Whether to redirect immediately (default: true)
   */
  redirect?: boolean;

  /**
   * Email address (for email auth)
   */
  email?: string;

  /**
   * Use numeric OTP instead of magic link
   */
  useNumericOtp?: string;

  /**
   * Redirect on error
   */
  redirectOnError?: boolean;

  /**
   * WorkOS organization ID (for SSO)
   */
  organization?: string;

  /**
   * Pre-fill email in SSO form
   */
  login_hint?: string;

  /**
   * Pro user flag
   */
  pro?: string;

  /**
   * Enterprise member flag
   */
  enterprise_member?: string;

  /**
   * Enterprise admin flag
   */
  enterprise_admin?: string;

  /**
   * Enterprise billing admin flag
   */
  enterprise_billing_admin?: string;

  /**
   * Script/API user flag
   */
  script?: string;

  /**
   * Frontend test user flag
   */
  fe_test?: string;

  /**
   * Email handle for dev logins
   */
  email_handle?: string;
}

/**
 * Provider-specific options for sign-in
 * Used as the third parameter in signIn() calls
 */
export interface SignInProviderOptions {
  /**
   * WorkOS organization ID (for WorkOS SSO)
   */
  organization?: string;

  /**
   * Pre-fill email in SSO form (for WorkOS SSO)
   */
  login_hint?: string;
}

/**
 * Sign-in response from NextAuth.js/bootstrap module
 */
export interface SignInResponse {
  /**
   * Error message if sign-in failed
   */
  error?: string;

  /**
   * HTTP status code
   */
  status?: number;

  /**
   * Whether the operation was successful
   */
  ok?: boolean;

  /**
   * Redirect URL after successful sign-in
   */
  url?: string | null;
}

/**
 * Authentication provider type
 * Corresponds to the provider parameter in signIn()
 */
export type AuthProviderType =
  | "google"
  | "apple"
  | "email"
  | "workos"
  | "googleonetap"
  | "pplx-jwt-to-cookie"
  | "devlogin";

/**
 * Bootstrap/SignIn function signature
 * 
 * This is the main authentication function exported from bootstrap-*.js
 * modules. It's a wrapper around NextAuth.js signIn function.
 * 
 * Source: bootstrap-CptxcEgE.js (imported as { k as signIn } in LoginModalInner)
 * 
 * @param provider - Authentication provider ID
 * @param options - Sign-in options (callback URL, email, etc.)
 * @param providerOptions - Provider-specific options (WorkOS org ID, etc.)
 * @returns Promise resolving to SignInResponse
 * 
 * @example
 * ```typescript
 * // Google OAuth sign-in
 * await signIn('google', { callbackUrl: '/dashboard' });
 * 
 * // Email magic link
 * await signIn('email', {
 *   email: 'user@example.com',
 *   callbackUrl: '/verify',
 *   redirect: false,
 *   useNumericOtp: 'true'
 * });
 * 
 * // WorkOS SSO
 * await signIn('workos', {
 *   callbackUrl: '/dashboard'
 * }, {
 *   organization: 'org_123456',
 *   login_hint: 'user@company.com'
 * });
 * ```
 */
export type SignInFunction = (
  provider: AuthProviderType,
  options: Partial<SignInParams>,
  providerOptions?: SignInProviderOptions
) => Promise<SignInResponse | undefined>;

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request parameters for get_special_profile endpoint
 * This endpoint typically doesn't require parameters as it uses session auth
 */
export interface GetSpecialProfileParams {
  /**
   * Optional: Force refresh cached profile data
   */
  refresh?: boolean;
}

/**
 * Error response for auth endpoints
 */
export interface AuthErrorResponse {
  error: string;
  message: string;
  status_code: number;
  details?: {
    [key: string]: any;
  };
}

// ============================================================================
// CLIENT INTERFACE
// ============================================================================

/**
 * Auth API Client Interface
 * 
 * Defines the contract for interacting with authentication endpoints
 */
export interface AuthClient {
  /**
   * Get available authentication providers
   * 
   * @param params - Required query parameters (version and source)
   * @returns Promise resolving to providers configuration
   * 
   * @example
   * ```typescript
   * const providers = await authClient.getAuthProviders({
   *   version: '2.18',
   *   source: 'default'
   * });
   * 
   * // Access provider directly
   * if (providers.google) {
   *   console.log('Google login available at:', providers.google.signinUrl);
   * }
   * 
   * // Or find by ID
   * const googleProvider = Object.values(providers).find(p => p?.id === 'google');
   * if (googleProvider) {
   *   console.log('Google login available');
   * }
   * ```
   */
  getAuthProviders(params: AuthProvidersParams): Promise<AuthProvidersResponse>;

  /**
   * Check organization login details for SSO detection
   * 
   * @param params - Request with email address
   * @returns Promise resolving to organization SSO configuration
   * 
   * @example
   * ```typescript
   * const details = await authClient.getOrganizationLoginDetails({
   *   email: 'user@company.com'
   * });
   * 
   * if (details.organization?.force_sso) {
   *   console.log('SSO required for this domain');
   *   if (details.organization.workos_org_id) {
   *     // Redirect to WorkOS SSO
   *   }
   * }
   * ```
   */
  getOrganizationLoginDetails(
    params: OrganizationLoginDetailsRequest
  ): Promise<OrganizationLoginDetailsResponse>;

  /**
   * Get special profile information for the authenticated user
   * 
   * @param params - Optional request parameters
   * @returns Promise resolving to special profile data
   * @throws {AuthErrorResponse} If authentication fails or user is not authorized
   * 
   * @example
   * ```typescript
   * const profile = await authClient.getSpecialProfile();
   * if (profile.profile_type === 'pro') {
   *   console.log('User has Pro access');
   * }
   * ```
   */
  getSpecialProfile(
    params?: GetSpecialProfileParams
  ): Promise<SpecialProfileResponse>;
}

// ============================================================================
// EXPORTS
// ============================================================================
// Note: SpecialProfile is an alias exported for convenience in index.ts
