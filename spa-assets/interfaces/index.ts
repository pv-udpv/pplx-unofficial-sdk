// ============================================================================
// SPA Assets - TypeScript Interfaces Index
// ============================================================================

/**
 * Central export point for all SPA asset TypeScript interface definitions
 * 
 * This module aggregates interfaces discovered from the Perplexity AI SPA
 * and provides a single import point for type-safe API interactions.
 * 
 * @module spa-assets/interfaces
 */

// Auth Endpoints
// Export with convenient alias
export type {
  AuthProvider,
  AuthProvidersResponse,
  AuthProvidersParams,
  OrganizationLoginDetailsRequest,
  OrganizationLoginDetails,
  OrganizationLoginDetailsResponse,
  PKCEParams,
  SignInParams,
  SpecialProfileResponse,
  GetSpecialProfileParams,
  AuthErrorResponse,
  AuthClient,
} from './auth-endpoints';

// Convenient alias for SpecialProfileResponse
export type { SpecialProfileResponse as SpecialProfile } from './auth-endpoints';
