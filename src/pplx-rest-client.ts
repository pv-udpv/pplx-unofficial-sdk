// ============================================================================
// Perplexity REST API Client - Thread & Entry Management
// Reconstructed from articleQueries-Da3WJvaL.js
// ============================================================================

import { Entry, UserPermission } from "./pplx-client";

// ============================================================================
// TYPES - REST API
// ============================================================================

/** Thread (conversation) */
export interface Thread {
  uuid: string; // context_uuid
  title: string;
  slug: string; // thread_url_slug
  entries: string[]; // backend_uuid[]
  created_at: string;
  updated_at: string;
  entry_count?: number;
  collection_uuid?: string;
  collection_info?: CollectionInfo;
  privacy_state: "public" | "private" | "unlisted";
  read_write_token?: string;
}

/** Collection (Space) */
export interface Collection {
  uuid: string;
  name: string;
  description?: string;
  threads: string[]; // context_uuid[]
  thread_count: number;
  created_at: string;
  updated_at?: string;
  user_permission: UserPermission;
  is_public?: boolean;
}

export interface CollectionInfo {
  uuid: string;
  name: string;
  user_permission: UserPermission;
}

/** Pagination response */
export interface PaginatedResponse<T> {
  items: T[];
  next_cursor?: string;
  has_more: boolean;
  total?: number;
}

/** Social interaction */
export interface SocialInfo {
  like_count: number;
  view_count: number;
  fork_count: number;
  user_likes: boolean;
}

/** Fork result */
export interface ForkResult {
  new_context_uuid: string;
  new_backend_uuid: string;
  slug: string;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface CreateThreadParams {
  title?: string;
  collection_uuid?: string;
  privacy_state?: "public" | "private" | "unlisted";
}

export interface UpdateThreadParams {
  uuid: string;
  title?: string;
  privacy_state?: "public" | "private" | "unlisted";
  collection_uuid?: string;
}

export interface CreateCollectionParams {
  name: string;
  description?: string;
  is_public?: boolean;
}

export interface UpdateCollectionParams {
  uuid: string;
  name?: string;
  description?: string;
  is_public?: boolean;
}

export interface ForkEntryParams {
  backend_uuid: string;
  collection_uuid?: string;
  title?: string;
}

export interface UpdateEntryParams {
  backend_uuid: string;
  query_str?: string;
  blocks?: any[];
}

export interface ListThreadsParams {
  limit?: number;
  cursor?: string;
  sort?: "created_at" | "updated_at";
  order?: "asc" | "desc";
}

// ============================================================================
// REST API CLIENT
// ============================================================================

export class PplxRestClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(
    config?: {
      baseUrl?: string;
      headers?: Record<string, string>;
    }
  ) {
    this.baseUrl = config?.baseUrl || "https://www.perplexity.ai";
    this.headers = {
      "Content-Type": "application/json",
      ...config?.headers,
    };
  }

  private async fetch<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
  }

  // ==========================================================================
  // THREADS
  // ==========================================================================

  /**
   * List all threads
   */
  async listThreads(
    params?: ListThreadsParams
  ): Promise<PaginatedResponse<Thread>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.order) searchParams.set("order", params.order);

    const query = searchParams.toString();
    const path = `/rest/threads${query ? `?${query}` : ""}`;

    const data = await this.fetch<{
      threads: Thread[];
      next_cursor?: string;
      has_more: boolean;
    }>(path);

    return {
      items: data.threads,
      next_cursor: data.next_cursor,
      has_more: data.has_more,
    };
  }

  /**
   * Get thread by UUID
   */
  async getThread(contextUuid: string): Promise<Thread> {
    return this.fetch<Thread>(`/rest/threads/${contextUuid}`);
  }

  /**
   * Get thread by slug (URL-friendly identifier)
   */
  async getThreadBySlug(slug: string): Promise<Thread> {
    return this.fetch<Thread>(`/rest/threads/by-slug/${slug}`);
  }

  /**
   * Create new thread
   */
  async createThread(params: CreateThreadParams): Promise<Thread> {
    return this.fetch<Thread>("/rest/threads", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Update thread
   */
  async updateThread(params: UpdateThreadParams): Promise<Thread> {
    const { uuid, ...body } = params;
    return this.fetch<Thread>(`/rest/threads/${uuid}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete thread
   */
  async deleteThread(contextUuid: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/rest/threads/${contextUuid}`, {
      method: "DELETE",
    });
  }

  // ==========================================================================
  // ENTRIES
  // ==========================================================================

  /**
   * Get entry by UUID
   */
  async getEntry(backendUuid: string): Promise<Entry> {
    return this.fetch<Entry>(`/rest/entries/${backendUuid}`);
  }

  /**
   * List entries in a thread
   */
  async listThreadEntries(contextUuid: string): Promise<Entry[]> {
    const data = await this.fetch<{ entries: Entry[]; total: number }>(
      `/rest/threads/${contextUuid}/entries`
    );
    return data.entries;
  }

  /**
   * Update entry
   */
  async updateEntry(params: UpdateEntryParams): Promise<Entry> {
    const { backend_uuid, ...body } = params;
    return this.fetch<Entry>(`/rest/entries/${backend_uuid}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete entry
   */
  async deleteEntry(backendUuid: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/rest/entries/${backendUuid}`, {
      method: "DELETE",
    });
  }

  /**
   * Fork entry (create copy in new thread)
   */
  async forkEntry(params: ForkEntryParams): Promise<ForkResult> {
    const { backend_uuid, ...body } = params;
    return this.fetch<ForkResult>(`/rest/entries/${backend_uuid}/fork`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Like entry
   */
  async likeEntry(backendUuid: string): Promise<SocialInfo> {
    return this.fetch<SocialInfo>(`/rest/entries/${backendUuid}/like`, {
      method: "POST",
    });
  }

  /**
   * Unlike entry
   */
  async unlikeEntry(backendUuid: string): Promise<SocialInfo> {
    return this.fetch<SocialInfo>(`/rest/entries/${backendUuid}/like`, {
      method: "DELETE",
    });
  }

  /**
   * Get related queries for entry
   */
  async getRelatedQueries(backendUuid: string): Promise<string[]> {
    const data = await this.fetch<{ related_queries: string[] }>(
      `/rest/entries/${backendUuid}/related`
    );
    return data.related_queries;
  }

  // ==========================================================================
  // COLLECTIONS (Spaces)
  // ==========================================================================

  /**
   * List all collections
   */
  async listCollections(): Promise<Collection[]> {
    const data = await this.fetch<{ collections: Collection[] }>(
      "/rest/collections"
    );
    return data.collections;
  }

  /**
   * Get collection by UUID
   */
  async getCollection(uuid: string): Promise<Collection> {
    return this.fetch<Collection>(`/rest/collections/${uuid}`);
  }

  /**
   * Create collection
   */
  async createCollection(params: CreateCollectionParams): Promise<Collection> {
    return this.fetch<Collection>("/rest/collections", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Update collection
   */
  async updateCollection(params: UpdateCollectionParams): Promise<Collection> {
    const { uuid, ...body } = params;
    return this.fetch<Collection>(`/rest/collections/${uuid}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete collection
   */
  async deleteCollection(uuid: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/rest/collections/${uuid}`, {
      method: "DELETE",
    });
  }

  /**
   * Add thread to collection
   */
  async addThreadToCollection(
    collectionUuid: string,
    threadUuid: string
  ): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(
      `/rest/collections/${collectionUuid}/threads`,
      {
        method: "POST",
        body: JSON.stringify({ thread_uuid: threadUuid }),
      }
    );
  }

  /**
   * Remove thread from collection
   */
  async removeThreadFromCollection(
    collectionUuid: string,
    threadUuid: string
  ): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(
      `/rest/collections/${collectionUuid}/threads/${threadUuid}`,
      {
        method: "DELETE",
      }
    );
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createRestClient(config?: {
  baseUrl?: string;
  headers?: Record<string, string>;
}): PplxRestClient {
  return new PplxRestClient(config);
}

// Default export
export default PplxRestClient;