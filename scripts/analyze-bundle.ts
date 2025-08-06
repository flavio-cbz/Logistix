#!/usr/bin/env ts-node

/**
 * Bundle Analysis Script
 * Analyzes the Next.js bundle and provides optimization recommendations
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  recommendations: string[];
}

interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
}

class BundleAnalyzer {
  private buildDir: string;
  private statsFile: string;

  constructor() {
    this.buildDir = path.join(process.cwd(), '.next');
    this.statsFile = path.join(this.buildDir, 'analyze', 'bundle-stats.json');
  }

  async analyze(): Promise<BundleStats> {
    console.log('🔍 Analyzing bundle...');

    // Build the application with analysis
    await this.buildWithAnalysis();

    // Parse the bundle stats
    const stats = await this.parseStats();

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats);

    return {
      ...stats,
      recommendations
    };
  }

  private async buildWithAnalysis(): Promise<void> {
    console.log('📦 Building application with bundle analysis...');
    
    try {
      // Set environment variable for bundle analysis
      process.env.ANALYZE = 'true';
      
      // Run the build command
      execSync('npm run build:analyze', { 
        stdio: 'inherit',
        env: { ...process.env, ANALYZE: 'true' }
      });
      
      console.log('✅ Build completed with analysis');
    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }

  private async parseStats(): Promise<Omit<BundleStats, 'recommendations'>> {
    try {
      // Read Next.js build output
      const buildManifest = await this.readBuildManifest();
      const chunks = await this.analyzeChunks();

      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      const gzippedSize = chunks.reduce((sum, chunk) => sum + chunk.gzippedSize, 0);

      return {
        totalSize,
        gzippedSize,
        chunks
      };
    } catch (error) {
      console.error('❌ Failed to parse bundle stats:', error);
      throw error;
    }
  }

  private async readBuildManifest(): Promise<any> {
    const manifestPath = path.join(this.buildDir, 'build-manifest.json');
    
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(manifestContent);
    } catch (error) {
      console.warn('⚠️  Could not read build manifest');
      return {};
    }
  }

  private async analyzeChunks(): Promise<ChunkInfo[]> {
    const staticDir = path.join(this.buildDir, 'static');
    const chunks: ChunkInfo[] = [];

    try {
      // Analyze JavaScript chunks
      const jsDir = path.join(staticDir, 'chunks');
      if (await this.directoryExists(jsDir)) {
        const jsChunks = await this.analyzeJavaScriptChunks(jsDir);
        chunks.push(...jsChunks);
      }

      // Analyze CSS chunks
      const cssDir = path.join(staticDir, 'css');
      if (await this.directoryExists(cssDir)) {
        const cssChunks = await this.analyzeCSSChunks(cssDir);
        chunks.push(...cssChunks);
      }

      return chunks;
    } catch (error) {
      console.error('❌ Failed to analyze chunks:', error);
      return [];
    }
  }

  private async analyzeJavaScriptChunks(jsDir: string): Promise<ChunkInfo[]> {
    const chunks: ChunkInfo[] = [];
    
    try {
      const files = await fs.readdir(jsDir);
      const jsFiles = files.filter(file => file.endsWith('.js'));

      for (const file of jsFiles) {
        const filePath = path.join(jsDir, file);
        const stats = await fs.stat(filePath);
        
        // Estimate gzipped size (roughly 30% of original size)
        const gzippedSize = Math.round(stats.size * 0.3);

        chunks.push({
          name: file,
          size: stats.size,
          gzippedSize,
          modules: await this.extractModules(filePath)
        });
      }
    } catch (error) {
      console.warn('⚠️  Could not analyze JavaScript chunks:', error);
    }

    return chunks;
  }

  private async analyzeCSSChunks(cssDir: string): Promise<ChunkInfo[]> {
    const chunks: ChunkInfo[] = [];
    
    try {
      const files = await fs.readdir(cssDir);
      const cssFiles = files.filter(file => file.endsWith('.css'));

      for (const file of cssFiles) {
        const filePath = path.join(cssDir, file);
        const stats = await fs.stat(filePath);
        
        // CSS compresses better, roughly 20% of original size
        const gzippedSize = Math.round(stats.size * 0.2);

        chunks.push({
          name: file,
          size: stats.size,
          gzippedSize,
          modules: []
        });
      }
    } catch (error) {
      console.warn('⚠️  Could not analyze CSS chunks:', error);
    }

    return chunks;
  }

  private async extractModules(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Simple regex to extract module names (this is a basic implementation)
      const moduleRegex = /\/\*\s*webpack:\/\/\/(.+?)\s*\*\//g;
      const modules: string[] = [];
      let match;

      while ((match = moduleRegex.exec(content)) !== null) {
        modules.push(match[1]);
      }

      return [...new Set(modules)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private generateRecommendations(stats: Omit<BundleStats, 'recommendations'>): string[] {
    const recommendations: string[] = [];

    // Check total bundle size
    const totalSizeMB = stats.totalSize / (1024 * 1024);
    if (totalSizeMB > 5) {
      recommendations.push(`Bundle size is ${totalSizeMB.toFixed(2)}MB, consider code splitting or removing unused dependencies`);
    }

    // Check individual chunk sizes
    const largeChunks = stats.chunks.filter(chunk => chunk.size > 500 * 1024); // 500KB
    if (largeChunks.length > 0) {
      recommendations.push(`Found ${largeChunks.length} large chunks (>500KB): ${largeChunks.map(c => c.name).join(', ')}`);
    }

    // Check for duplicate modules
    const allModules = stats.chunks.flatMap(chunk => chunk.modules);
    const duplicateModules = this.findDuplicates(allModules);
    if (duplicateModules.length > 0) {
      recommendations.push(`Found duplicate modules: ${duplicateModules.slice(0, 5).join(', ')}${duplicateModules.length > 5 ? '...' : ''}`);
    }

    // Check compression ratio
    const compressionRatio = stats.gzippedSize / stats.totalSize;
    if (compressionRatio > 0.4) {
      recommendations.push(`Poor compression ratio (${(compressionRatio * 100).toFixed(1)}%), consider optimizing assets`);
    }

    // Check for common optimization opportunities
    const hasLodash = allModules.some(module => module.includes('lodash'));
    if (hasLodash) {
      recommendations.push('Consider using lodash-es or individual lodash functions to reduce bundle size');
    }

    const hasMoment = allModules.some(module => module.includes('moment'));
    if (hasMoment) {
      recommendations.push('Consider replacing moment.js with date-fns or dayjs for smaller bundle size');
    }

    if (recommendations.length === 0) {
      recommendations.push('Bundle looks well optimized! 🎉');
    }

    return recommendations;
  }

  private findDuplicates(array: string[]): string[] {
    const counts = array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).filter(key => counts[key] > 1);
  }

  async generateReport(stats: BundleStats): Promise<void> {
    const reportPath = path.join(process.cwd(), 'bundle-analysis-report.md');
    
    const report = `# Bundle Analysis Report

Generated on: ${new Date().toISOString()}

## Summary

- **Total Size**: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB
- **Gzipped Size**: ${(stats.gzippedSize / 1024 / 1024).toFixed(2)} MB
- **Compression Ratio**: ${((stats.gzippedSize / stats.totalSize) * 100).toFixed(1)}%
- **Number of Chunks**: ${stats.chunks.length}

## Chunks

${stats.chunks
  .sort((a, b) => b.size - a.size)
  .map(chunk => `- **${chunk.name}**: ${(chunk.size / 1024).toFixed(1)} KB (${(chunk.gzippedSize / 1024).toFixed(1)} KB gzipped)`)
  .join('\n')}

## Recommendations

${stats.recommendations.map(rec => `- ${rec}`).join('\n')}

## Largest Chunks

${stats.chunks
  .sort((a, b) => b.size - a.size)
  .slice(0, 10)
  .map((chunk, index) => `${index + 1}. **${chunk.name}**: ${(chunk.size / 1024).toFixed(1)} KB`)
  .join('\n')}

## Bundle Size Trends

To track bundle size over time, consider:
- Setting up bundle size monitoring in CI/CD
- Using tools like bundlesize or size-limit
- Regular bundle analysis as part of the development process

## Next Steps

1. Review the recommendations above
2. Consider implementing code splitting for large chunks
3. Analyze and remove unused dependencies
4. Optimize images and other assets
5. Consider using dynamic imports for non-critical code
`;

    await fs.writeFile(reportPath, report);
    console.log(`📊 Bundle analysis report saved to: ${reportPath}`);
  }
}

// CLI execution
async function main() {
  try {
    const analyzer = new BundleAnalyzer();
    
    console.log('🚀 Starting bundle analysis...\n');
    
    const stats = await analyzer.analyze();
    
    console.log('\n📊 Bundle Analysis Results:');
    console.log('==========================');
    console.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Gzipped Size: ${(stats.gzippedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compression Ratio: ${((stats.gzippedSize / stats.totalSize) * 100).toFixed(1)}%`);
    console.log(`Number of Chunks: ${stats.chunks.length}`);
    
    console.log('\n🔍 Recommendations:');
    stats.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    // Generate detailed report
    await analyzer.generateReport(stats);
    
    console.log('\n✅ Bundle analysis completed!');
    
  } catch (error) {
    console.error('❌ Error during bundle analysis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { BundleAnalyzer, type BundleStats, type ChunkInfo };