/**
 * SSE Protocol Types for Perplexity AI
 * Extracted from pplx-stream-D3-uFWQX.js reverse engineering
 * Protocol version: 2.18
 */

/**
 * Stream lifecycle status
 */
export enum StreamStatus {
  PENDING = 'PENDING',
  RESUMING = 'RESUMING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
}

/**
 * User permission levels for collections/threads
 */
export enum UserPermission {
  NONE = 0,
  READER = 1,
  WRITER = 2,
  ADMIN = 3,
  OWNER = 4,
  EDITOR = 5,
  OWNER_DEFAULT_BOOKMARKS = 6,
  INVITED_READER = 11,
  INVITED_WRITER = 12,
  INVITED_ADMIN = 13,
  INVITED_EDITOR = 15,
}

/**
 * JSON Patch operation (RFC-6902)
 */
export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test'
  path: string // JSON Pointer (RFC-6901)
  value?: any
  from?: string // For move/copy operations
}

/**
 * Differential block update using JSON Patch
 */
export interface DiffBlock {
  field: string // Field name to patch (e.g., "text", "citations")
  patches: JsonPatchOp[]
}

/**
 * Citation in answer block
 */
export interface Citation {
  url: string
  title?: string
  snippet?: string
  index?: number
}

/**
 * Content block in entry
 */
export interface Block {
  intended_usage: string // Unique block identifier
  diff_block?: DiffBlock // Incremental update
  text?: string // Full text (if not using diff)
  citations?: Citation[]
  // Additional fields may exist
  [key: string]: any
}

/**
 * Collection (Space) metadata
 */
export interface CollectionInfo {
  uuid: string
  name: string
  user_permission: UserPermission
  // Additional collection fields
  [key: string]: any
}

/**
 * Social interaction metadata
 */
export interface SocialInfo {
  like_count: number
  view_count: number
  fork_count: number
  user_likes: boolean
}

/**
 * Parent thread information for forked queries
 */
export interface ParentInfo {
  title?: string
  url_slug?: string
  mode?: string
}

/**
 * Media item (image, chart, etc.)
 */
export interface MediaItem {
  type: string
  url?: string
  // Additional media fields
  [key: string]: any
}

/**
 * Widget data/intents
 */
export interface WidgetData {
  type: string
  // Widget-specific data
  [key: string]: any
}

/**
 * Entry = Single message/response in a thread
 * This is the core SSE chunk structure
 */
export interface Entry {
  // Identifiers
  uuid: string // frontend_uuid (client-side ID)
  backend_uuid: string // Server-assigned entry ID
  frontend_uuid: string // Same as uuid
  context_uuid: string // Thread ID
  frontend_context_uuid: string // Client thread ID

  // Query metadata
  query_str: string
  query_source?: string
  author_username?: string
  author_image?: string

  // Status
  status: StreamStatus
  reconnectable: boolean
  final: boolean
  cursor?: string // For resumption

  // Content
  blocks: Block[]
  text?: string // Initial text (may be JSON)
  plan?: any
  reasoning_plan?: any
  summary?: any
  form?: any

  // Search configuration
  search_focus: 'internet' | 'writing'
  search_recency_filter?: string
  sources: { sources: string[] }
  num_sources_display?: number
  personalized: boolean
  attachments: string[]

  // Model
  mode: 'CONCISE' | 'COPILOT'
  display_model: string
  model_preference?: string

  // Thread metadata
  thread_title?: string
  thread_url_slug?: string
  read_write_token?: string | null
  thread_access?: number
  privacy_state?: string
  updated_datetime?: string
  stream_created_at?: string
  expiry_time?: string

  // Parent/fork info
  parent_info?: ParentInfo

  // Social
  social_info: SocialInfo
  bookmark_state?: 'BOOKMARKED' | 'NOT_BOOKMARKED'

  // Collection
  collection_info?: CollectionInfo

  // Additional content
  related_queries: any[]
  media_items: MediaItem[]
  widget_data: WidgetData[]
  widget_intents: any[]
  knowledge_cards: any[]
  sources_list: any[]
  related_query_items: any[]
  answer_modes: any[]
  structured_answer_block_usages: any[]
  image_completions?: any[]

  // Metadata
  is_related_query_result?: boolean
  is_nav_suggestions_disabled?: boolean
  should_index?: boolean
  message_mode?: string
  final_sse_message?: boolean
  attachment_processing_progress?: any[]

  // Side-by-side metadata (experimental)
  side_by_side_metadata?: any

  // Source metadata (optional)
  source?: string

  // Connector auth info (optional)
  connector_auth_info?: any
}

/**
 * Thread = Conversation containing multiple entries
 */
export interface Thread {
  id: string // context_uuid
  entryIds: string[] // List of backend_uuids
}

/**
 * Active stream state
 */
export interface Stream {
  id: { description: string } // frontend_uuid
  promise: Promise<void> | null
  abortController: AbortController | null
  isReconnect: boolean
  entryId?: string // backend_uuid
  threadId?: string // context_uuid
  extraEntryId?: string // Additional entry UUID
  params?: RequestParams
  timer?: PerformanceTimer
  placeholderChunk?: Entry
}

/**
 * Stream creation parameters
 */
export interface SubmitParams {
  // Query
  query_str?: string

  // Identifiers
  frontend_uuid?: string
  frontend_context_uuid?: string
  existing_entry_uuid?: string // For retries
  resume_entry_uuid?: string // For reconnection
  cursor?: string // Resume position

  // Configuration
  version: string // "2.18"
  query_source?: 'default_search' | 'retry' | 'create-stream' | string
  search_focus?: 'internet' | 'writing'
  display_model?: string
  model_preference_submit?: string
  sources?: string[]
  final_sources?: string[]
  final_recency?: string

  // Content
  attachments?: string[]
  personalized?: boolean
  is_copilot?: boolean
  is_nav_suggestions_disabled?: boolean

  // Thread context
  existing_uuid?: string
  existing_frontend_context_uuid?: string
  fork?: boolean
  is_related_query?: boolean
  submit_from_article_override?: any

  // Collection
  collection?: CollectionInfo

  // Metadata
  thread_metadata_title?: string
  thread_metadata_thread_url_slug?: string
  side_by_side_metadata?: any
}

/**
 * Reconnect parameters
 */
export interface ReconnectParams {
  resume_entry_uuid: string
  cursor?: string
}

/**
 * Union of all request params
 */
export type RequestParams = SubmitParams | ReconnectParams

/**
 * Performance timer
 */
export interface PerformanceTimer {
  start: number
  end?: number
  duration?: number
}

/**
 * Error details
 */
export interface StreamErrorDetails {
  request_id: string
  backend_uuid?: string
  status?: number
  message?: string
}

/**
 * Stream event types
 */
export type StreamEvent =
  | {
      type: 'created'
      stream: Stream
      thread: Entry[]
      message: Entry | undefined
      query: string
      params: RequestParams
    }
  | {
      type: 'progress'
      stream: Stream
      thread: Entry[]
      message: Entry
      isFirstMessage: boolean
    }
  | {
      type: 'completed'
      stream: Stream
      thread: Entry[]
      message: Entry | undefined
    }
  | {
      type: 'error'
      stream: Stream
      thread: Entry[]
      message: Entry | undefined
      error: Error
      messageStreamMeta?: MessageStreamMeta
    }
  | {
      type: 'aborted'
      stream: Stream
      thread: Entry[]
      message: Entry | undefined
    }

/**
 * Message stream metadata for debugging
 */
export interface MessageStreamMeta {
  start: number
  latest: number
  attempts: number
}

/**
 * Event handler signature
 */
export type EventHandler<T extends StreamEvent = StreamEvent> = (
  event: T
) => void

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number // seconds
}

/**
 * SSE message handler
 */
export interface SSEHandlers {
  message: (entry: Entry) => Promise<void> | void
  error?: (error: Error) => void
  open?: () => void
  close?: () => void
}
