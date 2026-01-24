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
export type {
  SpecialProfileResponse,
  SpecialProfile,
  GetSpecialProfileParams,
  AuthErrorResponse,
  AuthClient,
} from './auth-endpoints';

// Re-export all from submodules for convenience
export * from './auth-endpoints';
