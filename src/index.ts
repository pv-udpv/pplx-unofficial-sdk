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
   * Quick search helper - combines SSE streaming and REST API
   */
  async quickSearch(query: string, options?: {
    focus?: any;
    model?: any;
    sources?: string[];
  }) {
    const entries = [];
    
    // Stream search
    for await (const entry of this.stream.search(query, options)) {
      entries.push(entry);
      if (entry.final) break;
    }

    // Handle case where no entries were produced
    if (entries.length === 0) {
      return { entries, thread: null };
    }

    const finalEntry = entries[entries.length - 1];

    // Get full thread details if available
    if (finalEntry?.context_uuid) {
      const thread = await this.rest.getThread(finalEntry.context_uuid);
      return { entries, thread };
    }

    return { entries, thread: null };
  }

  /**
   * Search with connector sources
   */
  async *searchWithConnectors(
    query: string,
    connectorIds: string[],
    options?: any
  ) {
    yield* this.stream.search(query, {
      ...options,
      sources: connectorIds,
    });
  }

  /**
   * Get connection status for all connectors
   */
  async getConnectorsStatus() {
    const connectors = await this.connectors.listConnectors();
    return connectors.map((c) => ({
      id: c.id,
      name: c.name,
      connected: c.status === "connected",
      lastSync: c.last_sync,
      fileCount: c.file_count,
    }));
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