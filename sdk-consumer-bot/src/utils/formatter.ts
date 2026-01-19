/**
 * Output formatter utilities
 */

export class Formatter {
  /**
   * Format text blocks into readable content
   */
  static formatBlocks(blocks: any[]): string {
    if (!blocks || blocks.length === 0) {
      return '';
    }
    
    return blocks
      .filter(b => b && b.text)
      .map(b => b.text)
      .join('\n');
  }

  /**
   * Format sources list
   */
  static formatSources(sources: any[]): string {
    if (!sources || sources.length === 0) {
      return 'No sources available';
    }
    
    return sources
      .map((s, i) => `  [${i + 1}] ${s.title || s.name || 'Unknown'} - ${s.url || s.snippet || ''}`)
      .join('\n');
  }

  /**
   * Format connector results
   */
  static formatConnectorSources(sources: any[]): string {
    const connectorSources = sources.filter(s => s.is_attachment);
    
    if (connectorSources.length === 0) {
      return 'No connector sources found';
    }
    
    return connectorSources
      .map(s => `  📄 ${s.title || s.name} (from connector)`)
      .join('\n');
  }

  /**
   * Truncate long text
   */
  static truncate(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format timestamp
   */
  static formatTimestamp(timestamp: number | Date): string {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  }
}
