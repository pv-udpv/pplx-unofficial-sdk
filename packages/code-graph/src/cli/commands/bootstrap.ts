// ============================================================================
// Bootstrap Command
// CLI command to analyze application bootstrap sequence
// ============================================================================

import * as fs from 'fs/promises';
import { BootstrapAnalyzer } from '../../core/bootstrap-analyzer';
import { MarkdownExporter } from '../../exporters/markdown-exporter';
import { MermaidExporter } from '../../exporters/mermaid-exporter';

interface BootstrapOptions {
  swUrl?: string;
  autoDetect?: boolean;
  output?: string;
  format?: 'json' | 'markdown' | 'mermaid';
}

export async function bootstrapCommand(options: BootstrapOptions): Promise<void> {
  try {
    console.log('🔍 Analyzing application bootstrap sequence...\n');

    const analyzer = new BootstrapAnalyzer();
    const analysis = await analyzer.analyzeBootstrap({
      swUrl: options.swUrl,
      autoDetectVersion: options.autoDetect !== false,
    });

    console.log('\n📊 Bootstrap Endpoints:', analysis.criticalPath.initialEndpoints.length);
    analysis.criticalPath.initialEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });

    // Export analysis
    let output: string;
    const format = options.format || 'json';

    switch (format) {
      case 'markdown': {
        const exporter = new MarkdownExporter();
        output = exporter.exportBootstrapAnalysis(analysis);
        break;
      }
      case 'mermaid': {
        const exporter = new MermaidExporter();
        output = exporter.exportBootstrapFlow(analysis);
        break;
      }
      case 'json':
      default:
        output = JSON.stringify(analysis, null, 2);
        break;
    }

    // Save to file
    const outputPath = options.output || `bootstrap-analysis.${format}`;
    await fs.writeFile(outputPath, output, 'utf-8');

    console.log(`\n💾 Analysis saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
