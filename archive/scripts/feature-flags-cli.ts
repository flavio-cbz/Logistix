#!/usr/bin/env tsx

/**
 * Feature Flags CLI Management Tool
 * 
 * This script provides command-line management of feature flags for the Logistix application.
 * It allows administrators to enable/disable flags, adjust rollout percentages, and manage A/B tests.
 * 
 * Requirements: 6.1, 6.4
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { FeatureFlagsConfigSchema, type FeatureFlagsConfig, type FeatureFlag } from '../lib/config/feature-flags.js';

class FeatureFlagsCLI {
  private configPath: string;
  private config: FeatureFlagsConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), 'config', 'feature-flags.json');
    this.config = this.loadConfig();
  }

  /**
   * Load feature flags configuration from file
   */
  private loadConfig(): FeatureFlagsConfig {
    try {
      if (!existsSync(this.configPath)) {
        console.warn(`Config file not found at ${this.configPath}, using defaults`);
        return FeatureFlagsConfigSchema.parse({});
      }

      const fileContent = readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      return FeatureFlagsConfigSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to load feature flags configuration:', error);
      process.exit(1);
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      const content = JSON.stringify(this.config, null, 2);
      writeFileSync(this.configPath, content, 'utf-8');
      console.log(`✓ Configuration saved to ${this.configPath}`);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      process.exit(1);
    }
  }

  /**
   * List all feature flags
   */
  public list(): void {
    console.log('Feature Flags Status:');
    console.log('====================');
    
    const flags = Object.entries(this.config) as [keyof FeatureFlagsConfig, FeatureFlag][];
    
    if (flags.length === 0) {
      console.log('No feature flags configured.');
      return;
    }

    for (const [name, flag] of flags) {
      const status = flag.enabled ? '✓ Enabled' : '✗ Disabled';
      const rollout = flag.rolloutPercentage < 100 ? ` (${flag.rolloutPercentage}%)` : '';
      const groups = flag.userGroups.length > 0 ? ` [${flag.userGroups.join(', ')}]` : '';
      
      console.log(`${name}: ${status}${rollout}${groups}`);
      if (flag.description) {
        console.log(`  Description: ${flag.description}`);
      }
      if (flag.startDate || flag.endDate) {
        const dates = [
          flag.startDate ? `Start: ${flag.startDate}` : null,
          flag.endDate ? `End: ${flag.endDate}` : null
        ].filter(Boolean).join(', ');
        console.log(`  Schedule: ${dates}`);
      }
      console.log('');
    }
  }

  /**
   * Show detailed information about a specific flag
   */
  public show(flagName: string): void {
    const flag = this.config[flagName as keyof FeatureFlagsConfig];
    
    if (!flag) {
      console.error(`Feature flag '${flagName}' not found.`);
      process.exit(1);
    }

    console.log(`Feature Flag: ${flagName}`);
    console.log('========================');
    console.log(`Enabled: ${flag.enabled}`);
    console.log(`Rollout Percentage: ${flag.rolloutPercentage}%`);
    console.log(`User Groups: ${flag.userGroups.length > 0 ? flag.userGroups.join(', ') : 'None'}`);
    console.log(`Exclude Groups: ${flag.excludeUserGroups.length > 0 ? flag.excludeUserGroups.join(', ') : 'None'}`);
    
    if (flag.startDate) {
      console.log(`Start Date: ${flag.startDate}`);
    }
    
    if (flag.endDate) {
      console.log(`End Date: ${flag.endDate}`);
    }
    
    if (flag.description) {
      console.log(`Description: ${flag.description}`);
    }
    
    if (Object.keys(flag.metadata).length > 0) {
      console.log('Metadata:');
      for (const [key, value] of Object.entries(flag.metadata)) {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  /**
   * Enable a feature flag
   */
  public enable(flagName: string, rolloutPercentage?: number): void {
    if (!this.config[flagName as keyof FeatureFlagsConfig]) {
      console.error(`Feature flag '${flagName}' not found.`);
      process.exit(1);
    }

    const flag = this.config[flagName as keyof FeatureFlagsConfig]!;
    flag.enabled = true;
    
    if (rolloutPercentage !== undefined) {
      if (rolloutPercentage < 0 || rolloutPercentage > 100) {
        console.error('Rollout percentage must be between 0 and 100.');
        process.exit(1);
      }
      flag.rolloutPercentage = rolloutPercentage;
    }

    this.saveConfig();
    console.log(`✓ Feature flag '${flagName}' enabled${rolloutPercentage !== undefined ? ` with ${rolloutPercentage}% rollout` : ''}`);
  }

  /**
   * Disable a feature flag
   */
  public disable(flagName: string): void {
    if (!this.config[flagName as keyof FeatureFlagsConfig]) {
      console.error(`Feature flag '${flagName}' not found.`);
      process.exit(1);
    }

    this.config[flagName as keyof FeatureFlagsConfig]!.enabled = false;
    this.saveConfig();
    console.log(`✓ Feature flag '${flagName}' disabled`);
  }

  /**
   * Set rollout percentage for a feature flag
   */
  public setRollout(flagName: string, percentage: number): void {
    if (!this.config[flagName as keyof FeatureFlagsConfig]) {
      console.error(`Feature flag '${flagName}' not found.`);
      process.exit(1);
    }

    if (percentage < 0 || percentage > 100) {
      console.error('Rollout percentage must be between 0 and 100.');
      process.exit(1);
    }

    this.config[flagName as keyof FeatureFlagsConfig]!.rolloutPercentage = percentage;
    this.saveConfig();
    console.log(`✓ Feature flag '${flagName}' rollout set to ${percentage}%`);
  }

  /**
   * Add user groups to a feature flag
   */
  public addGroups(flagName: string, groups: string[]): void {
    if (!this.config[flagName as keyof FeatureFlagsConfig]) {
      console.error(`Feature flag '${flagName}' not found.`);
      process.exit(1);
    }

    const flag = this.config[flagName as keyof FeatureFlagsConfig]!;
    const newGroups = groups.filter(group => !flag.userGroups.includes(group));
    
    if (newGroups.length === 0) {
      console.log('All specified groups are already included.');
      return;
    }

    flag.userGroups.push(...newGroups);
    this.saveConfig();
    console.log(`✓ Added groups to '${flagName}': ${newGroups.join(', ')}`);
  }

  /**
   * Remove user groups from a feature flag
   */
  public removeGroups(flagName: string, groups: string[]): void {
    if (!this.config[flagName as keyof FeatureFlagsConfig]) {
      console.error(`Feature flag '${flagName}' not found.`);
      process.exit(1);
    }

    const flag = this.config[flagName as keyof FeatureFlagsConfig]!;
    const originalLength = flag.userGroups.length;
    
    flag.userGroups = flag.userGroups.filter(group => !groups.includes(group));
    
    if (flag.userGroups.length === originalLength) {
      console.log('No matching groups found to remove.');
      return;
    }

    this.saveConfig();
    console.log(`✓ Removed groups from '${flagName}': ${groups.join(', ')}`);
  }

  /**
   * Set schedule for a feature flag
   */
  public setSchedule(flagName: string, startDate?: string, endDate?: string): void {
    if (!this.config[flagName as keyof FeatureFlagsConfig]) {
      console.error(`Feature flag '${flagName}' not found.`);
      process.exit(1);
    }

    const flag = this.config[flagName as keyof FeatureFlagsConfig]!;
    
    if (startDate) {
      // Validate date format
      if (isNaN(Date.parse(startDate))) {
        console.error('Invalid start date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).');
        process.exit(1);
      }
      flag.startDate = startDate;
    }
    
    if (endDate) {
      // Validate date format
      if (isNaN(Date.parse(endDate))) {
        console.error('Invalid end date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).');
        process.exit(1);
      }
      flag.endDate = endDate;
    }

    this.saveConfig();
    console.log(`✓ Schedule updated for '${flagName}'`);
  }

  /**
   * Create a deployment plan showing which flags will be affected
   */
  public deploymentPlan(): void {
    console.log('Deployment Plan - Feature Flags Impact:');
    console.log('======================================');
    
    const flags = Object.entries(this.config) as [keyof FeatureFlagsConfig, FeatureFlag][];
    const enabledFlags = flags.filter(([, flag]) => flag.enabled);
    const gradualRolloutFlags = enabledFlags.filter(([, flag]) => flag.rolloutPercentage < 100);
    const scheduledFlags = flags.filter(([, flag]) => flag.startDate || flag.endDate);
    
    console.log(`Total Feature Flags: ${flags.length}`);
    console.log(`Enabled Flags: ${enabledFlags.length}`);
    console.log(`Gradual Rollout Flags: ${gradualRolloutFlags.length}`);
    console.log(`Scheduled Flags: ${scheduledFlags.length}`);
    console.log('');
    
    if (enabledFlags.length > 0) {
      console.log('Enabled Features:');
      for (const [name, flag] of enabledFlags) {
        const rollout = flag.rolloutPercentage < 100 ? ` (${flag.rolloutPercentage}% rollout)` : '';
        const risk = flag.metadata.riskLevel ? ` [${flag.metadata.riskLevel} risk]` : '';
        console.log(`  - ${name}${rollout}${risk}`);
      }
      console.log('');
    }
    
    if (gradualRolloutFlags.length > 0) {
      console.log('Gradual Rollout (A/B Testing):');
      for (const [name, flag] of gradualRolloutFlags) {
        console.log(`  - ${name}: ${flag.rolloutPercentage}% of users`);
      }
      console.log('');
    }
    
    if (scheduledFlags.length > 0) {
      console.log('Scheduled Changes:');
      for (const [name, flag] of scheduledFlags) {
        const schedule = [
          flag.startDate ? `Start: ${flag.startDate}` : null,
          flag.endDate ? `End: ${flag.endDate}` : null
        ].filter(Boolean).join(', ');
        console.log(`  - ${name}: ${schedule}`);
      }
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const cli = new FeatureFlagsCLI();

  try {
    switch (command) {
      case 'list':
        cli.list();
        break;
      
      case 'show':
        const flagName = process.argv[3];
        if (!flagName) {
          console.error('Usage: tsx feature-flags-cli.ts show <flag-name>');
          process.exit(1);
        }
        cli.show(flagName);
        break;
      
      case 'enable':
        const enableFlagName = process.argv[3];
        const rolloutPercentage = process.argv[4] ? parseInt(process.argv[4]) : undefined;
        if (!enableFlagName) {
          console.error('Usage: tsx feature-flags-cli.ts enable <flag-name> [rollout-percentage]');
          process.exit(1);
        }
        cli.enable(enableFlagName, rolloutPercentage);
        break;
      
      case 'disable':
        const disableFlagName = process.argv[3];
        if (!disableFlagName) {
          console.error('Usage: tsx feature-flags-cli.ts disable <flag-name>');
          process.exit(1);
        }
        cli.disable(disableFlagName);
        break;
      
      case 'rollout':
        const rolloutFlagName = process.argv[3];
        const percentage = parseInt(process.argv[4]);
        if (!rolloutFlagName || isNaN(percentage)) {
          console.error('Usage: tsx feature-flags-cli.ts rollout <flag-name> <percentage>');
          process.exit(1);
        }
        cli.setRollout(rolloutFlagName, percentage);
        break;
      
      case 'add-groups':
        const addGroupsFlagName = process.argv[3];
        const groupsToAdd = process.argv.slice(4);
        if (!addGroupsFlagName || groupsToAdd.length === 0) {
          console.error('Usage: tsx feature-flags-cli.ts add-groups <flag-name> <group1> [group2] ...');
          process.exit(1);
        }
        cli.addGroups(addGroupsFlagName, groupsToAdd);
        break;
      
      case 'remove-groups':
        const removeGroupsFlagName = process.argv[3];
        const groupsToRemove = process.argv.slice(4);
        if (!removeGroupsFlagName || groupsToRemove.length === 0) {
          console.error('Usage: tsx feature-flags-cli.ts remove-groups <flag-name> <group1> [group2] ...');
          process.exit(1);
        }
        cli.removeGroups(removeGroupsFlagName, groupsToRemove);
        break;
      
      case 'schedule':
        const scheduleFlagName = process.argv[3];
        const startDate = process.argv[4];
        const endDate = process.argv[5];
        if (!scheduleFlagName) {
          console.error('Usage: tsx feature-flags-cli.ts schedule <flag-name> [start-date] [end-date]');
          process.exit(1);
        }
        cli.setSchedule(scheduleFlagName, startDate, endDate);
        break;
      
      case 'deployment-plan':
        cli.deploymentPlan();
        break;
      
      default:
        console.log('Feature Flags CLI - Logistix');
        console.log('============================');
        console.log('');
        console.log('Usage:');
        console.log('  tsx feature-flags-cli.ts list                              - List all feature flags');
        console.log('  tsx feature-flags-cli.ts show <flag-name>                  - Show detailed flag info');
        console.log('  tsx feature-flags-cli.ts enable <flag-name> [percentage]   - Enable a flag with optional rollout');
        console.log('  tsx feature-flags-cli.ts disable <flag-name>               - Disable a flag');
        console.log('  tsx feature-flags-cli.ts rollout <flag-name> <percentage>  - Set rollout percentage');
        console.log('  tsx feature-flags-cli.ts add-groups <flag-name> <groups>   - Add user groups to flag');
        console.log('  tsx feature-flags-cli.ts remove-groups <flag-name> <groups> - Remove user groups from flag');
        console.log('  tsx feature-flags-cli.ts schedule <flag-name> [start] [end] - Set flag schedule');
        console.log('  tsx feature-flags-cli.ts deployment-plan                   - Show deployment impact');
        console.log('');
        console.log('Examples:');
        console.log('  tsx feature-flags-cli.ts enable newProductFormUi 50       - Enable A/B test at 50%');
        console.log('  tsx feature-flags-cli.ts add-groups debugMode developers  - Add developers to debug mode');
        console.log('  tsx feature-flags-cli.ts schedule maintenanceMode 2024-01-01T02:00:00 2024-01-01T04:00:00');
        process.exit(1);
    }
  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  }
}

export { FeatureFlagsCLI };