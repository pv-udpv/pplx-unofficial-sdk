// ============================================================================
// Service Worker Version Detector
// Auto-detects Service Worker version using multiple methods
// ============================================================================

import type { VersionInfo } from '../types';

/**
 * Service Worker version detector with multiple detection strategies
 */
export class ServiceWorkerVersionDetector {
  private baseUrl: string;
  private browser?: any; // Playwright browser instance (optional)

  constructor(baseUrl: string = 'https://www.perplexity.ai', browser?: any) {
    this.baseUrl = baseUrl;
    this.browser = browser;
  }

  /**
   * Detect Service Worker version using all available methods
   * Priority: API > JS Context > Query Parameter > Fallback
   */
  async detectVersion(): Promise<VersionInfo> {
    // Method 1: Try API endpoint
    const apiVersion = await this.tryAPIEndpoint();
    if (apiVersion) {
      return {
        version: apiVersion,
        swUrl: `${this.baseUrl}/service-worker.js?v=${apiVersion}`,
        detectionMethod: 'api',
      };
    }

    // Method 2: Try JS Context (requires browser/CDP)
    const jsVersion = await this.tryJSContext();
    if (jsVersion) {
      return {
        version: jsVersion,
        swUrl: `${this.baseUrl}/service-worker.js?v=${jsVersion}`,
        detectionMethod: 'js-context',
      };
    }

    // Method 3: Try Query Parameter from existing SW
    const queryVersion = await this.tryQueryParameter();
    if (queryVersion) {
      return {
        version: queryVersion.version,
        swUrl: queryVersion.url,
        detectionMethod: 'query-param',
      };
    }

    // Fallback: Use default URL without version
    console.warn('Could not auto-detect SW version, using fallback');
    return {
      version: 'unknown',
      swUrl: `${this.baseUrl}/sw.js`,
      detectionMethod: 'fallback',
    };
  }

  /**
   * Method 1: Try to get version from API endpoint
   */
  private async tryAPIEndpoint(): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`);
      if (res.ok) {
        const data = await res.json();
        return data.version || data.sw_version || data.build_id || null;
      }
    } catch (e) {
      console.debug('API version check failed:', e);
    }
    return null;
  }

  /**
   * Method 2: Try to get version from JS context (requires Playwright/Puppeteer)
   */
  private async tryJSContext(): Promise<string | null> {
    if (!this.browser) return null;

    try {
      const page = await this.browser.newPage();
      await page.goto(this.baseUrl);

      const version = await page.evaluate(() => {
        // @ts-ignore - window globals may not exist
        return window.__PPL_CONFIG__?.version ||
          // @ts-ignore
          window.__APP_CONFIG__?.swVersion ||
          // @ts-ignore
          window.__BUILD_ID__ ||
          null;
      });

      await page.close();
      return version || null;
    } catch (e) {
      console.debug('JS context check failed:', e);
      return null;
    }
  }

  /**
   * Method 3: Try to extract version from query parameter
   */
  private async tryQueryParameter(): Promise<{ version: string; url: string } | null> {
    try {
      // Fetch main page to find SW registration
      const html = await fetch(this.baseUrl).then(r => r.text());

      // Look for SW registration script
      const match = html.match(/navigator\.serviceWorker\.register\(['"]([^'"]+)['"]/);
      if (match?.[1]) {
        const swUrl = new URL(match[1], this.baseUrl);
        const version = swUrl.searchParams.get('v');

        if (version) {
          return { version, url: swUrl.href };
        }
      }
    } catch (e) {
      console.debug('Query param check failed:', e);
    }
    return null;
  }

  /**
   * Set browser instance for JS context detection
   */
  setBrowser(browser: any): void {
    this.browser = browser;
  }
}
