// ============================================================================
// Perplexity OAuth Connectors Client
// NOTE: This is a stub. Full implementation tracked in Issue #1
// ============================================================================

export type ConnectorId = 
  | "google_drive"
  | "notion"
  | "microsoft_onedrive"
  | "microsoft_sharepoint"
  | "dropbox"
  | "box"
  | "confluence"
  | "slack"
  | "local_upload";

export type ConnectorStatus = "connected" | "disconnected" | "error";
export type SyncStatus = "syncing" | "idle" | "error";
export type PlanType = "free" | "pro" | "max";

export interface ConnectorDefinition {
  id: ConnectorId;
  name: string;
  oauth_provider: string | null;
  scopes: string[];
  plans: PlanType[];
}

export interface Connector {
  id: ConnectorId;
  name: string;
  status: ConnectorStatus;
  last_sync?: string;
  file_count?: number;
}

export interface ConnectorFile {
  id: string;
  name: string;
  size: number;
  mime_type?: string;
  modified_time?: string;
}

export interface AuthorizeResponse {
  auth_url: string;
  state: string;
}

export interface CallbackResponse {
  success: boolean;
  connector_id: ConnectorId;
}

export interface ConnectorStatusResponse {
  connector_id: ConnectorId;
  status: ConnectorStatus;
  sync_status: SyncStatus;
  file_count: number;
  last_sync?: string;
}

export interface FileListResponse {
  files: ConnectorFile[];
  cursor?: string;
  has_more: boolean;
}

export interface SyncResponse {
  sync_job_id: string;
  status: "queued" | "processing";
}

export interface PickerConfig {
  client_id: string;
  app_id?: string;
  developer_key?: string;
}

export const CONNECTOR_DEFINITIONS: Record<ConnectorId, ConnectorDefinition> = {
  google_drive: {
    id: "google_drive",
    name: "Google Drive",
    oauth_provider: "google",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    plans: ["pro", "max"]
  },
  notion: {
    id: "notion",
    name: "Notion",
    oauth_provider: "notion",
    scopes: ["read_content"],
    plans: ["pro", "max"]
  },
  microsoft_onedrive: {
    id: "microsoft_onedrive",
    name: "Microsoft OneDrive",
    oauth_provider: "microsoft",
    scopes: ["Files.Read.All"],
    plans: ["max"]
  },
  microsoft_sharepoint: {
    id: "microsoft_sharepoint",
    name: "Microsoft SharePoint",
    oauth_provider: "microsoft",
    scopes: ["Sites.Read.All"],
    plans: ["max"]
  },
  dropbox: {
    id: "dropbox",
    name: "Dropbox",
    oauth_provider: "dropbox",
    scopes: ["files.metadata.read", "files.content.read"],
    plans: ["max"]
  },
  box: {
    id: "box",
    name: "Box",
    oauth_provider: "box",
    scopes: ["root_readonly"],
    plans: ["max"]
  },
  confluence: {
    id: "confluence",
    name: "Confluence",
    oauth_provider: "atlassian",
    scopes: ["read:confluence-content.all"],
    plans: ["max"]
  },
  slack: {
    id: "slack",
    name: "Slack",
    oauth_provider: "slack",
    scopes: ["channels:read", "files:read"],
    plans: ["max"]
  },
  local_upload: {
    id: "local_upload",
    name: "Local Upload",
    oauth_provider: null,
    scopes: [],
    plans: ["free", "pro", "max"]
  }
};

export class PplxConnectorsClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config?: {
    baseUrl?: string;
    headers?: Record<string, string>;
  }) {
    this.baseUrl = config?.baseUrl || "https://www.perplexity.ai";
    this.headers = {
      "Content-Type": "application/json",
      ...config?.headers,
    };
    console.warn("PplxConnectorsClient: Full implementation pending (Issue #1)");
  }
  
  async listConnectors(): Promise<Connector[]> {
    throw new Error("Not implemented - see Issue #1");
  }
  
  async getConnectorStatus(connectorId: ConnectorId): Promise<ConnectorStatusResponse> {
    throw new Error("Not implemented - see Issue #1");
  }
  
  async authorize(connectorId: ConnectorId): Promise<AuthorizeResponse> {
    throw new Error("Not implemented - see Issue #1");
  }
  
  async handleCallback(code: string, state: string): Promise<CallbackResponse> {
    throw new Error("Not implemented - see Issue #1");
  }
  
  async listFiles(
    connectorId: ConnectorId,
    options?: { cursor?: string; limit?: number }
  ): Promise<FileListResponse> {
    throw new Error("Not implemented - see Issue #1");
  }
  
  async syncFiles(
    connectorId: ConnectorId,
    fileIds: string[],
    spaceUuid?: string
  ): Promise<SyncResponse> {
    throw new Error("Not implemented - see Issue #1");
  }
  
  async disconnect(connectorId: ConnectorId): Promise<{ success: boolean }> {
    throw new Error("Not implemented - see Issue #1");
  }
}

export function createConnectorsClient(config?: {
  baseUrl?: string;
  headers?: Record<string, string>;
}): PplxConnectorsClient {
  return new PplxConnectorsClient(config);
}

export class OAuthPopupManager {
  async authorize(
    authUrl: string,
    options?: {
      width?: number;
      height?: number;
      timeout?: number;
    }
  ): Promise<{ code: string; state: string }> {
    throw new Error("Not implemented - see Issue #1");
  }
}

export default PplxConnectorsClient;