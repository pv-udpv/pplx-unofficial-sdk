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
 * Source: layout-sidebar-BPemXja1.js module
 * Category: auth (2 endpoints)
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
   * const googleProvider = providers.providers.find(p => p.id === 'google');
   * if (googleProvider?.enabled) {
   *   console.log('Google login available');
   * }
   * ```
   */
  getAuthProviders(params: AuthProvidersParams): Promise<AuthProvidersResponse>;

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
