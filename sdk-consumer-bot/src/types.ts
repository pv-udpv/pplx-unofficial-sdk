/**
 * Bot-specific types for SDK Consumer Bot
 */

export interface SearchOptions {
  focus?: 'internet' | 'academic' | 'writing' | 'wolfram' | 'youtube' | 'reddit' | 'scholar';
  model?: 'turbo' | 'experimental' | 'sonar-pro';
  recency?: 'day' | 'week' | 'month' | 'year';
  sources?: string[];
}

export interface SearchResult {
  status: string;
  content: string;
  sources: any[];
  final: boolean;
  entry?: any;
}

export interface ThreadInfo {
  thread: any;
  entryUuid: string;
}

export interface BotConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface ConnectorFile {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
}

export interface ConnectorStatus {
  id: string;
  connected: boolean;
  name: string;
}
