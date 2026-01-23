// ============================================================================
// @pplx-unofficial/sdk - Unofficial Perplexity AI TypeScript SDK
// Version: 1.0.0
// Protocol: 2.18
// ============================================================================

// ============================================================================
// SSE STREAMING CLIENT
// ============================================================================
export {
  PplxClient,
  createPplxClient,
  createSSEStream,
  applyJsonPatch,
  PplxError,
  PplxStreamError,
  PplxFetchError,
} from "./pplx-client";

export type {
  Entry,
  Thread,
  Stream,
  StreamStatus,
  StreamEvents,
  UserPermission,
  SearchMode,
  SearchFocus,
  ModelPreference,
  QuerySource,
  SSERequest,
  SSERequestParams,
  JsonPatchOperation,
  DiffBlock,
  Source,
  SocialInfo,
  CollectionInfo,
  PplxClientConfig,
  Logger,
  SSEClientOptions,
} from "./pplx-client";

// ============================================================================
// REST API CLIENT
// ============================================================================
export {
  PplxRestClient,
  createRestClient,
} from "./pplx-rest-client";

export type {
  Thread as RestThread,
  Collection,
  CollectionInfo as RestCollectionInfo,
  PaginatedResponse,
  SocialInfo as RestSocialInfo,
  ForkResult,
  CreateThreadParams,
  UpdateThreadParams,
  CreateCollectionParams,
  UpdateCollectionParams,
  ForkEntryParams,
  UpdateEntryParams,
  ListThreadsParams,
} from "./pplx-rest-client";

// ============================================================================
// CONNECTORS CLIENT
// ============================================================================
export {
  PplxConnectorsClient,
  createConnectorsClient,
  OAuthPopupManager,
  CONNECTOR_DEFINITIONS,
} from "./pplx-connectors-client";

export type {
  ConnectorId,
  ConnectorStatus,
  SyncStatus,
  PlanType,
  ConnectorDefinition,
  Connector,
  ConnectorFile,
  AuthorizeResponse,
  CallbackResponse,
  ConnectorStatusResponse,
  FileListResponse,
  SyncResponse,
  PickerConfig,
} from "./pplx-connectors-client";

// ============================================================================
// UNIFIED SDK CLIENT
// ============================================================================

import { PplxClient, PplxClientConfig } from "./pplx-client";
import { PplxRestClient } from "./pplx-rest-client";
import { PplxConnectorsClient } from "./pplx-connectors-client";

/**
 * Unified SDK configuration
 */
export interface PplxSDKConfig extends PplxClientConfig {
  /** Custom headers for all requests */
  headers?: Record<string, string>;
}

/**
 * Unified Perplexity SDK Client
 * Combines SSE streaming, REST API, and Connectors
 */
export class PplxSDK {
  /** SSE streaming client */
  public readonly stream: PplxClient;
  
  /** REST API client */
  public readonly rest: PplxRestClient;
  
  /** Connectors client */
  public readonly connectors: PplxConnectorsClient;

  constructor(config?: PplxSDKConfig) {
    const baseUrl = config?.baseUrl || "https://www.perplexity.ai";
    const headers = config?.headers || {};

    this.stream = new PplxClient(config);
    this.rest = new PplxRestClient({ baseUrl, headers });
    this.connectors = new PplxConnectorsClient({ baseUrl, headers });
  }

  /**
   * Quick search helper - combines SSE streaming and REST API.
   *
   * NOTE: This is a preview feature and depends on the SSE `stream.search`
   * implementation, which is currently not available (see Issue #1).
   * Calling this method will throw until the SSE search implementation
   * is completed.
   */
  async quickSearch(query: string, options?: {
    focus?: any;
    model?: any;
    sources?: string[];
  }) {
    throw new Error(
      "PplxSDK.quickSearch is a preview feature and requires SSE stream.search implementation (see Issue #1)."
    );
  }

  /**
   * Search with connector sources.
   *
   * NOTE: This is a preview feature and depends on the SSE `stream.search`
   * implementation, which is currently not available (see Issue #1).
   * Calling this method will throw until the SSE search implementation
   * is completed.
   */
  async searchWithConnectors(
    query: string,
    connectorIds: string[],
    options?: any
  ): Promise<never> {
    throw new Error(
      "PplxSDK.searchWithConnectors is a preview feature and requires SSE stream.search implementation (see Issue #1)."
    );
  }

  /**
   * Get connection status for all connectors.
   *
   * Note: The connectors client is not yet implemented. This method is
   * currently a placeholder and will be enabled in a future release.
   */
  async getConnectorsStatus() {
    throw new Error(
      "getConnectorsStatus is not available: the connectors client is not yet implemented. " +
      "This method is a placeholder in the unified SDK interface and will be enabled in a future release."
    );
  }
}

/**
 * Factory function to create unified SDK instance
 */
export function createPplxSDK(config?: PplxSDKConfig): PplxSDK {
  return new PplxSDK(config);
}

// Default export
export default PplxSDK;

// ============================================================================
// VERSION INFO
// ============================================================================

export const SDK_VERSION = "1.0.0";
export const PROTOCOL_VERSION = "2.18";
export const SDK_NAME = "@pplx-unofficial/sdk";