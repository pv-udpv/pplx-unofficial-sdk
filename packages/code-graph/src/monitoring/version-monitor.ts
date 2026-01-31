// ============================================================================
// Version Monitor
// Monitors Service Worker version changes and triggers updates
// ============================================================================

import type { UpdateInfo, ManifestDiff, PrecacheEntry } from '../types';
import { ServiceWorkerVersionDetector } from '../analyzers/version-detector';

/**
 * Monitors Service Worker version changes
 */
export class VersionMonitor {
  private lastKnownVersion: string | null = null;
  private lastManifest: PrecacheEntry[] | null = null;
  private detector: ServiceWorkerVersionDetector;
  private intervalId?: NodeJS.Timeout;

  constructor(
    baseUrl: string = 'https://www.perplexity.ai',
    private onUpdate?: (update: UpdateInfo) => void | Promise<void>
  ) {
    this.detector = new ServiceWorkerVersionDetector(baseUrl);
  }

  /**
   * Check for version updates
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    const versionInfo = await this.detector.detectVersion();

    if (this.lastKnownVersion && versionInfo.version !== this.lastKnownVersion) {
      const changes = await this.diffManifests(
        this.lastKnownVersion,
        versionInfo.version
      );

      const updateInfo: UpdateInfo = {
        hasUpdate: true,
        oldVersion: this.lastKnownVersion,
        newVersion: versionInfo.version,
        changes,
      };

      // Trigger callback if provided
      if (this.onUpdate) {
        await this.onUpdate(updateInfo);
      }

      this.lastKnownVersion = versionInfo.version;
      return updateInfo;
    }

    this.lastKnownVersion = versionInfo.version;
    return { hasUpdate: false };
  }

  /**
   * Start monitoring for version changes
   */
  async startMonitoring(intervalMs: number = 300000): Promise<void> {
    // Initial check
    await this.checkForUpdates();

    // Schedule periodic checks
    this.intervalId = setInterval(async () => {
      const update = await this.checkForUpdates();
      if (update.hasUpdate) {
        console.log(`🆕 Version update: ${update.oldVersion} → ${update.newVersion}`);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Diff manifests between two versions
   */
  private async diffManifests(
    oldVersion: string,
    newVersion: string
  ): Promise<ManifestDiff> {
    // Placeholder implementation
    // In real implementation, this would fetch and compare actual manifests
    return {
      added: [],
      removed: [],
      modified: [],
    };
  }

  /**
   * Set browser instance for JS context detection
   */
  setBrowser(browser: any): void {
    this.detector.setBrowser(browser);
  }
}
