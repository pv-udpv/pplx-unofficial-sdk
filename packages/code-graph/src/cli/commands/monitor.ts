// ============================================================================
// Monitor Command
// CLI command to monitor Service Worker version changes
// ============================================================================

import { VersionMonitor } from '../../monitoring/version-monitor';

interface MonitorOptions {
  interval?: string;
  webhook?: string;
}

export async function monitorCommand(options: MonitorOptions): Promise<void> {
  try {
    const interval = parseInt(options.interval || '300000', 10);

    console.log('🔄 Monitoring SW version changes...\n');
    console.log(`Check interval: ${interval / 1000}s`);
    if (options.webhook) {
      console.log(`Webhook: ${options.webhook}`);
    }
    console.log('');

    const monitor = new VersionMonitor(
      'https://www.perplexity.ai',
      async (update) => {
        console.log('\n🆕 NEW VERSION DETECTED!');
        console.log(`   ${update.oldVersion} → ${update.newVersion}`);
        
        if (update.changes) {
          console.log('\n📊 Manifest Changes:');
          console.log(`   Added: ${update.changes.added.length} files`);
          console.log(`   Removed: ${update.changes.removed.length} files`);
          console.log(`   Modified: ${update.changes.modified.length} files`);
        }

        // Send webhook notification if configured
        if (options.webhook) {
          try {
            await fetch(options.webhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
            });
            console.log('\n📧 Notification sent to webhook');
          } catch (e) {
            console.error('❌ Failed to send webhook:', e);
          }
        }

        console.log('\n[Continue monitoring...]');
      }
    );

    await monitor.startMonitoring(interval);

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n\n⏹️  Stopping monitor...');
      monitor.stopMonitoring();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
