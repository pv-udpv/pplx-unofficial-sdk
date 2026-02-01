// ============================================================================
// Auth Client Implementation Example
// Complete TypeScript implementation using auth endpoint interfaces
// ============================================================================

import {
  AuthClient,
  AuthProvidersResponse,
  AuthProvidersParams,
  SpecialProfileResponse,
  GetSpecialProfileParams,
  OrganizationLoginDetailsRequest,
  OrganizationLoginDetailsResponse,
  AuthErrorResponse,
  AuthProvider,
} from '../interfaces/auth-endpoints';

/**
 * Complete implementation of the Auth API client
 */
export class PplxAuthClient implements AuthClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://www.perplexity.ai') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get available authentication providers
   */
  async getAuthProviders(params: AuthProvidersParams): Promise<AuthProvidersResponse> {
    const url = new URL('/api/auth/providers', this.baseUrl);
    url.searchParams.set('version', params.version);
    url.searchParams.set('source', params.source);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Get special profile for authenticated user
   */
  async getSpecialProfile(params?: GetSpecialProfileParams): Promise<SpecialProfileResponse> {
    const url = new URL('/rest/auth/get_special_profile', this.baseUrl);
    
    if (params?.refresh) {
      url.searchParams.set('refresh', 'true');
    }

    const response = await fetch(url.toString(), {
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Get organization login details for SSO detection
   * 
   * Implements POST /rest/enterprise/organization/login/details
   */
  async getOrganizationLoginDetails(
    params: OrganizationLoginDetailsRequest
  ): Promise<OrganizationLoginDetailsResponse> {
    const url = new URL('/rest/enterprise/organization/login/details', this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<AuthErrorResponse> {
    let errorData: AuthErrorResponse;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: 'UnknownError',
        message: response.statusText || 'An unknown error occurred',
        status_code: response.status,
      };
    }

    return errorData;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Get authentication providers and build login UI
 */
export async function buildLoginUI() {
  const client = new PplxAuthClient();

  try {
    const providers = await client.getAuthProviders({
      version: '2.18',
      source: 'default',
    });

    // Filter OAuth providers
    const oauthProviders = Object.values(providers).filter(
      (p): p is AuthProvider => p?.type === 'oauth'
    );

    console.log('OAuth Providers:');
    oauthProviders.forEach((provider) => {
      console.log(`  - ${provider.name}: ${provider.signinUrl}`);
    });

    // Check specific providers
    if (providers.google) {
      console.log('\n✅ Google login available');
      console.log('   Sign-in URL:', providers.google.signinUrl);
    }

    if (providers.workos) {
      console.log('\n✅ Enterprise SSO available via WorkOS');
      console.log('   Sign-in URL:', providers.workos.signinUrl);
    }

    if (providers.email) {
      console.log('\n✅ Email login available');
      console.log('   Sign-in URL:', providers.email.signinUrl);
    }

    return providers;
  } catch (error) {
    console.error('Failed to fetch auth providers:', error);
    throw error;
  }
}

/**
 * Example 2: Check user's special profile and permissions
 */
export async function checkUserProfile() {
  const client = new PplxAuthClient();

  try {
    const profile = await client.getSpecialProfile();

    console.log('User Profile:');
    console.log('  User ID:', profile.user_id);
    console.log('  Profile Type:', profile.profile_type);

    // Check permissions
    if (profile.permissions) {
      console.log('\nPermissions:');
      Object.entries(profile.permissions).forEach(([key, enabled]) => {
        console.log(`  ${key}: ${enabled ? '✅' : '❌'}`);
      });
    }

    // Check badges
    if (profile.badges && profile.badges.length > 0) {
      console.log('\nBadges:', profile.badges.join(', '));
    }

    // Check beta features
    if (profile.beta_features && profile.beta_features.length > 0) {
      console.log('\nBeta Features:', profile.beta_features.join(', '));
    }

    // Check organization
    if (profile.organization) {
      console.log('\nOrganization:');
      console.log('  Name:', profile.organization.name);
      console.log('  Role:', profile.organization.role);
    }

    return profile;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}

/**
 * Example 3: Complete authentication flow
 */
export async function completeAuthFlow() {
  const client = new PplxAuthClient();

  // Step 1: Get available providers
  console.log('Step 1: Fetching authentication providers...');
  const providers = await client.getAuthProviders({
    version: '2.18',
    source: 'default',
  });

  // Step 2: Show login options to user
  console.log('\nStep 2: Available login methods:');
  Object.values(providers).forEach((provider) => {
    if (provider) {
      console.log(`  - ${provider.name} (${provider.type})`);
    }
  });

  // Step 3: After user logs in, get their profile
  // (This assumes authentication has been completed)
  console.log('\nStep 3: Fetching user profile after authentication...');
  try {
    const profile = await client.getSpecialProfile();

    // Step 4: Check user access level
    console.log('\nStep 4: Determining user access level...');
    if (profile.profile_type === 'pro') {
      console.log('✅ User has Pro access');
    } else if (profile.profile_type === 'enterprise') {
      console.log('✅ User has Enterprise access');
    } else {
      console.log('ℹ️ User has free access');
    }

    // Step 5: Enable features based on permissions
    console.log('\nStep 5: Enabling features...');
    if (profile.permissions?.['advanced_search']) {
      console.log('  ✅ Advanced search enabled');
    }
    if (profile.early_access) {
      console.log('  ✅ Early access features enabled');
    }

    return { providers, profile };
  } catch (error) {
    console.log('\nUser not authenticated - showing login UI');
    return { providers, profile: null };
  }
}

/**
 * Example 4: Conditional feature rendering
 */
export async function renderFeaturesByProfile() {
  const client = new PplxAuthClient();

  try {
    const profile = await client.getSpecialProfile();

    // Feature flags based on profile
    const features = {
      showProFeatures: profile.profile_type === 'pro' || profile.profile_type === 'enterprise',
      showEnterpriseFeatures: profile.profile_type === 'enterprise',
      showBetaFeatures: profile.early_access === true,
      showBadges: profile.badges && profile.badges.length > 0,
      isVerified: profile.badges?.includes('verified'),
      isStaff: profile.profile_type === 'staff',
    };

    console.log('Feature Flags:');
    console.log(JSON.stringify(features, null, 2));

    return features;
  } catch (error) {
    console.log('User not authenticated - showing public features only');
    return {
      showProFeatures: false,
      showEnterpriseFeatures: false,
      showBetaFeatures: false,
      showBadges: false,
      isVerified: false,
      isStaff: false,
    };
  }
}

/**
 * Example 5: Redirect to appropriate sign-in URL
 */
export async function redirectToSignIn(preferredProvider: 'google' | 'apple' | 'email' | 'workos') {
  const client = new PplxAuthClient();

  const providers = await client.getAuthProviders({
    version: '2.18',
    source: 'default',
  });

  const provider = providers[preferredProvider];

  if (!provider) {
    throw new Error(`Provider ${preferredProvider} not available`);
  }

  console.log(`Redirecting to ${provider.name} sign-in...`);
  console.log(`URL: ${provider.signinUrl}`);

  // In browser context:
  // window.location.href = provider.signinUrl;

  return provider.signinUrl;
}
