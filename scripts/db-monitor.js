#!/usr/bin/env node

/**
 * Tableau de bord de monitoring des performances DB - LogistiX
 * Interface CLI pour surveiller les performances en temps réel
 */

const { createInterface } = require('readline');
const { exec } = require('child_process');

class PerformanceDashboard {
  constructor() {
    this.isRunning = false;
    this.refreshInterval = 5000; // 5 secondes
    this.intervalId = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      'success': '✅',
      'error': '❌',
      'info': 'ℹ️',
      'warning': '⚠️',
      'critical': '🚨'
    }[type] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  clearScreen() {
    console.clear();
  }

  displayHeader() {
    console.log('🗄️  LogistiX - Database Performance Monitor');
    console.log('='.repeat(70));
    console.log(`Refresh: ${this.refreshInterval / 1000}s | Press 'h' for help | 'q' to quit`);
    console.log('');
  }

  async getDbStats() {
    // Simuler des métriques de performance (à connecter au vrai monitoring)
    return new Promise((resolve) => {
      // Dans une vraie implémentation, ceci ferait appel au service de monitoring
      const mockStats = {
        totalQueries: Math.floor(Math.random() * 1000) + 100,
        averageResponseTime: Math.floor(Math.random() * 50) + 10,
        errorRate: Math.random() * 0.05,
        slowQueryCount: Math.floor(Math.random() * 10),
        queriesPerSecond: Math.random() * 50 + 10,
        activeConnections: Math.floor(Math.random() * 10) + 1,
        memoryUsage: Math.random() * 100,
        topSlowQueries: [
          { operation: 'SELECT products', duration: 1200, service: 'ProductService' },
          { operation: 'JOIN parcelles', duration: 890, service: 'ParcelleService' },
          { operation: 'UPDATE users', duration: 650, service: 'UserService' },
        ],
        serviceStats: {
          'DatabaseService': { count: 45, avgDuration: 25, errorCount: 0 },
          'UserService': { count: 23, avgDuration: 18, errorCount: 1 },
          'ProductService': { count: 67, avgDuration: 42, errorCount: 2 },
          'ParcelleService': { count: 34, avgDuration: 31, errorCount: 0 },
        },
        alerts: [
          { 
            type: 'slow_query', 
            severity: 'medium',
            message: 'Slow query detected in ProductService',
            timestamp: new Date(Date.now() - 2 * 60 * 1000)
          }
        ]
      };
      
      setTimeout(() => resolve(mockStats), 100);
    });
  }

  formatDuration(ms) {
    return `${ms}ms`;
  }

  formatPercentage(value) {
    return `${(value * 100).toFixed(2)}%`;
  }

  formatNumber(num) {
    return num.toLocaleString();
  }

  getStatusColor(errorRate) {
    if (errorRate > 0.1) return '🔴'; // Rouge - Critique
    if (errorRate > 0.05) return '🟡'; // Jaune - Attention
    return '🟢'; // Vert - OK
  }

  displayMetrics(stats) {
    const status = this.getStatusColor(stats.errorRate);
    
    console.log(`${status} Database Status: ${stats.errorRate > 0.1 ? 'CRITICAL' : stats.errorRate > 0.05 ? 'WARNING' : 'HEALTHY'}`);
    console.log('');
    
    // Métriques principales
    console.log('📊 Main Metrics (Last Hour)');
    console.log('-'.repeat(40));
    console.log(`Total Queries:     ${this.formatNumber(stats.totalQueries)}`);
    console.log(`Avg Response Time: ${this.formatDuration(stats.averageResponseTime)}`);
    console.log(`Error Rate:        ${this.formatPercentage(stats.errorRate)}`);
    console.log(`Slow Queries:      ${stats.slowQueryCount}`);
    console.log(`QPS:              ${stats.queriesPerSecond.toFixed(1)}`);
    console.log(`Active Connections: ${stats.activeConnections}`);
    console.log(`Memory Usage:      ${stats.memoryUsage.toFixed(1)}%`);
    console.log('');
    
    // Top requêtes lentes
    if (stats.topSlowQueries.length > 0) {
      console.log('🐌 Slowest Queries');
      console.log('-'.repeat(40));
      stats.topSlowQueries.slice(0, 3).forEach((query, index) => {
        console.log(`${index + 1}. ${query.operation.padEnd(20)} ${this.formatDuration(query.duration).padStart(8)} (${query.service})`);
      });
      console.log('');
    }
    
    // Stats par service
    console.log('🏗️  Service Performance');
    console.log('-'.repeat(40));
    Object.entries(stats.serviceStats).forEach(([service, stat]) => {
      const errorRateService = stat.count > 0 ? stat.errorCount / stat.count : 0;
      const statusIcon = this.getStatusColor(errorRateService);
      console.log(`${statusIcon} ${service.padEnd(18)} ${stat.count.toString().padStart(4)} calls, ${this.formatDuration(stat.avgDuration).padStart(6)} avg, ${stat.errorCount} errors`);
    });
    console.log('');
    
    // Alertes récentes
    if (stats.alerts.length > 0) {
      console.log('🚨 Recent Alerts');
      console.log('-'.repeat(40));
      stats.alerts.slice(0, 3).forEach(alert => {
        const time = new Date(alert.timestamp).toLocaleTimeString();
        const severityIcon = {
          'low': '🟦',
          'medium': '🟡', 
          'high': '🟠',
          'critical': '🔴'
        }[alert.severity] || '⚪';
        
        console.log(`${severityIcon} [${time}] ${alert.message}`);
      });
      console.log('');
    }
  }

  displayHelp() {
    this.clearScreen();
    console.log('🗄️  LogistiX Performance Monitor - Help');
    console.log('='.repeat(50));
    console.log('Commands:');
    console.log('  r - Refresh now');
    console.log('  s - Show service details');  
    console.log('  a - Show all alerts');
    console.log('  e - Export metrics');
    console.log('  t - Toggle auto-refresh');
    console.log('  + - Increase refresh rate');
    console.log('  - - Decrease refresh rate');
    console.log('  h - Show this help');
    console.log('  q - Quit');
    console.log('');
    console.log('Legend:');
    console.log('  🟢 Healthy   🟡 Warning   🔴 Critical');
    console.log('');
    console.log('Press any key to continue...');
  }

  async exportMetrics() {
    const stats = await this.getDbStats();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-metrics-${timestamp}.json`;
    
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(stats, null, 2));
    
    this.log(`Metrics exported to: ${filename}`, 'success');
  }

  async start() {
    this.isRunning = true;
    
    // Configuration du readline pour les commandes clavier
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Masquer le prompt par défaut
    rl.setPrompt('');
    
    // Gérer les touches
    process.stdin.on('keypress', async (str, key) => {
      if (!key) return;
      
      switch (key.name) {
        case 'q':
          this.stop();
          rl.close();
          process.exit(0);
          break;
          
        case 'r':
          await this.refresh();
          break;
          
        case 'h':
          this.displayHelp();
          setTimeout(async () => {
            await this.refresh();
          }, 3000);
          break;
          
        case 't':
          this.toggleAutoRefresh();
          break;
          
        case 'equal': // + key
          this.refreshInterval = Math.max(1000, this.refreshInterval - 1000);
          this.log(`Refresh interval: ${this.refreshInterval / 1000}s`);
          this.restartAutoRefresh();
          break;
          
        case 'minus': // - key  
          this.refreshInterval = Math.min(30000, this.refreshInterval + 1000);
          this.log(`Refresh interval: ${this.refreshInterval / 1000}s`);
          this.restartAutoRefresh();
          break;
          
        case 'e':
          await this.exportMetrics();
          break;
          
        case 'a':
          await this.showAllAlerts();
          break;
      }
    });
    
    // Activer le mode raw pour capturer les touches
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    
    // Premier affichage
    await this.refresh();
    
    // Démarrer l'auto-refresh
    this.startAutoRefresh();
    
    this.log('Performance Monitor started. Press "h" for help, "q" to quit.');
  }

  async refresh() {
    try {
      const stats = await this.getDbStats();
      
      this.clearScreen();
      this.displayHeader();
      this.displayMetrics(stats);
      
    } catch (error) {
      this.log(`Failed to refresh: ${error.message}`, 'error');
    }
  }

  startAutoRefresh() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(async () => {
      await this.refresh();
    }, this.refreshInterval);
  }

  stopAutoRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  toggleAutoRefresh() {
    if (this.intervalId) {
      this.stopAutoRefresh();
      this.log('Auto-refresh disabled', 'warning');
    } else {
      this.startAutoRefresh();
      this.log('Auto-refresh enabled', 'success');
    }
  }

  restartAutoRefresh() {
    this.stopAutoRefresh();
    this.startAutoRefresh();
  }

  async showAllAlerts() {
    const stats = await this.getDbStats();
    
    this.clearScreen();
    console.log('🚨 All Recent Alerts');
    console.log('='.repeat(50));
    
    if (stats.alerts.length === 0) {
      console.log('No alerts in the last 24 hours.');
    } else {
      stats.alerts.forEach((alert, index) => {
        const time = new Date(alert.timestamp).toLocaleString();
        const severityIcon = {
          'low': '🟦',
          'medium': '🟡',
          'high': '🟠', 
          'critical': '🔴'
        }[alert.severity] || '⚪';
        
        console.log(`${index + 1}. ${severityIcon} [${time}] ${alert.type.toUpperCase()}`);
        console.log(`   ${alert.message}`);
        console.log('');
      });
    }
    
    console.log('Press any key to return to dashboard...');
    
    setTimeout(async () => {
      await this.refresh();
    }, 5000);
  }

  stop() {
    this.isRunning = false;
    this.stopAutoRefresh();
    
    // Restaurer le mode normal du terminal
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    
    this.log('Performance Monitor stopped.');
  }
}

// =============================================================================
// MAIN 
// =============================================================================

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'dashboard':
    case 'monitor':
    default:
      console.log('Starting Performance Monitor Dashboard...');
      
      // Activer keypress events
      if (process.stdin.setRawMode) {
        process.stdin.resume();
        require('readline').emitKeypressEvents(process.stdin);
      }
      
      const dashboard = new PerformanceDashboard();
      
      // Gérer l'arrêt propre
      process.on('SIGINT', () => {
        dashboard.stop();
        process.exit(0);
      });
      
      await dashboard.start();
      break;
      
    case 'export':
      const dashboard2 = new PerformanceDashboard();
      await dashboard2.exportMetrics();
      break;
      
    case 'help':
      console.log('');
      console.log('🗄️  LogistiX Database Performance Monitor');
      console.log('='.repeat(50));
      console.log('Commands:');
      console.log('  monitor    - Start interactive dashboard (default)');
      console.log('  export     - Export current metrics to JSON');
      console.log('  help       - Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  npm run db:monitor');
      console.log('  npm run db:monitor:export');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PerformanceDashboard };