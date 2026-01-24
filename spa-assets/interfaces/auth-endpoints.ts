// ============================================================================
// Perplexity Auth Endpoints - TypeScript Interface Definitions
// Extracted from spa-assets/snapshots/2026-01-21/endpoints.json
// ============================================================================

/**
 * Auth Endpoints Category
 * 
 * This module defines TypeScript interfaces for the authentication-related
 * endpoints discovered in the Perplexity AI SPA.
 * 
 * Source: layout-sidebar-BPemXja1.js module
 * Category: auth (1 endpoint)
 */

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
