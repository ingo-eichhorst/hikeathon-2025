#!/usr/bin/env node

/**
 * Event Metrics Dashboard
 * Real-time dashboard for HIKEathon 2025 event metrics and management
 */

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONFIG = {
  supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
  baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000/hikeathon-2025',
  refreshInterval: 30000 // 30 seconds
};

class EventDashboard {
  constructor() {
    this.supabase = null;
    this.metrics = {};
    this.isRunning = false;
    this.startTime = Date.now();
  }

  async start() {
    console.log('🏔️ HIKEathon 2025 Event Dashboard');
    console.log('==================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log();

    try {
      await this.initialize();
      this.isRunning = true;
      this.setupSignalHandlers();
      await this.dashboardLoop();
    } catch (error) {
      console.error('❌ Dashboard startup failed:', error.message);
      process.exit(1);
    }
  }

  async initialize() {
    if (CONFIG.supabaseUrl && CONFIG.supabaseKey) {
      this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
      console.log('✅ Connected to Supabase');
    } else {
      console.log('⚠️ Supabase not configured - limited dashboard functionality');
    }
  }

  setupSignalHandlers() {
    process.on('SIGINT', () => {
      console.log('\n🛑 Dashboard shutdown requested');
      this.shutdown();
    });
  }

  async dashboardLoop() {
    while (this.isRunning) {
      try {
        await this.collectMetrics();
        this.displayDashboard();
        await this.sleep(CONFIG.refreshInterval);
      } catch (error) {
        console.error('Dashboard error:', error.message);
        await this.sleep(CONFIG.refreshInterval);
      }
    }
  }

  async collectMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    // Initialize metrics object
    this.metrics = {
      timestamp: now.toISOString(),
      system: await this.getSystemMetrics(),
      teams: await this.getTeamMetrics(),
      activity: await this.getActivityMetrics(oneHourAgo),
      performance: await this.getPerformanceMetrics(),
      usage: await this.getUsageMetrics(oneDayAgo)
    };
  }

  async getSystemMetrics() {
    const metrics = {
      uptime: Date.now() - this.startTime,
      health_status: 'unknown',
      response_time: null,
      error_count: 0
    };

    try {
      // Health check
      const start = Date.now();
      const response = await fetch(`${CONFIG.baseUrl}/api/health`);
      metrics.response_time = Date.now() - start;
      metrics.health_status = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      metrics.health_status = 'error';
      metrics.error_count++;
    }

    return metrics;
  }

  async getTeamMetrics() {
    if (!this.supabase) {
      return { total: 0, active: 0, status: 'no_data' };
    }

    try {
      // Total teams
      const { count: totalTeams } = await this.supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      // Active teams (with activity in last hour)
      const { data: activeTeams } = await this.supabase
        .from('telemetry')
        .select('team_code')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      const uniqueActiveTeams = new Set(activeTeams?.map(t => t.team_code) || []).size;

      return {
        total: totalTeams || 0,
        active: uniqueActiveTeams,
        status: 'connected'
      };
    } catch (error) {
      return { total: 0, active: 0, status: 'error', error: error.message };
    }
  }

  async getActivityMetrics(since) {
    if (!this.supabase) {
      return { total: 0, by_type: {}, status: 'no_data' };
    }

    try {
      const { data: activity } = await this.supabase
        .from('telemetry')
        .select('event_type')
        .gte('created_at', since.toISOString());

      const byType = {};
      activity?.forEach(event => {
        byType[event.event_type] = (byType[event.event_type] || 0) + 1;
      });

      return {
        total: activity?.length || 0,
        by_type: byType,
        status: 'connected'
      };
    } catch (error) {
      return { total: 0, by_type: {}, status: 'error', error: error.message };
    }
  }

  async getPerformanceMetrics() {
    const metrics = {
      cpu_usage: null,
      memory_usage: null,
      disk_usage: null,
      load_average: null
    };

    try {
      // Get system performance metrics (Linux/macOS)
      const { stdout: cpuInfo } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1 | cut -d'u' -f2");
      metrics.cpu_usage = parseFloat(cpuInfo.trim()) || null;

      const { stdout: memInfo } = await execAsync("free | grep Mem | awk '{printf \"%.1f\", ($3/$2) * 100.0}'");
      metrics.memory_usage = parseFloat(memInfo.trim()) || null;

      const { stdout: diskInfo } = await execAsync("df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1");
      metrics.disk_usage = parseFloat(diskInfo.trim()) || null;

      const { stdout: loadInfo } = await execAsync("uptime | awk -F'load average:' '{ print $2 }' | awk '{print $1}' | tr -d ','");
      metrics.load_average = parseFloat(loadInfo.trim()) || null;
    } catch (error) {
      // System metrics not available (normal for client-side or Windows)
    }

    return metrics;
  }

  async getUsageMetrics(since) {
    if (!this.supabase) {
      return { hourly: {}, total_events: 0, status: 'no_data' };
    }

    try {
      const { data: events } = await this.supabase
        .from('telemetry')
        .select('created_at, event_type')
        .gte('created_at', since.toISOString());

      const hourly = {};
      events?.forEach(event => {
        const hour = new Date(event.created_at).toISOString().substr(0, 13);
        hourly[hour] = (hourly[hour] || 0) + 1;
      });

      return {
        hourly,
        total_events: events?.length || 0,
        status: 'connected'
      };
    } catch (error) {
      return { hourly: {}, total_events: 0, status: 'error', error: error.message };
    }
  }

  displayDashboard() {
    // Clear screen
    console.clear();
    
    const uptime = Date.now() - this.startTime;
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);

    // Header
    console.log('🏔️ HIKEathon 2025 - LIVE EVENT DASHBOARD');
    console.log('=========================================');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log(`🕐 Dashboard Uptime: ${uptimeHours}h ${uptimeMinutes}m`);
    console.log();

    // System Status
    console.log('🚥 SYSTEM STATUS');
    console.log('----------------');
    const healthIcon = this.metrics.system.health_status === 'healthy' ? '✅' : 
                      this.metrics.system.health_status === 'error' ? '❌' : '⚠️';
    console.log(`   Health: ${healthIcon} ${this.metrics.system.health_status.toUpperCase()}`);
    
    if (this.metrics.system.response_time) {
      console.log(`   Response Time: ${this.metrics.system.response_time}ms`);
    }
    
    if (this.metrics.performance.cpu_usage !== null) {
      console.log(`   CPU Usage: ${this.metrics.performance.cpu_usage}%`);
    }
    
    if (this.metrics.performance.memory_usage !== null) {
      console.log(`   Memory Usage: ${this.metrics.performance.memory_usage}%`);
    }
    
    if (this.metrics.performance.disk_usage !== null) {
      console.log(`   Disk Usage: ${this.metrics.performance.disk_usage}%`);
    }
    console.log();

    // Team Metrics
    console.log('👥 TEAM METRICS');
    console.log('---------------');
    console.log(`   Total Teams: ${this.metrics.teams.total}`);
    console.log(`   Active Teams (last hour): ${this.metrics.teams.active}`);
    
    if (this.metrics.teams.total > 0) {
      const activePercentage = ((this.metrics.teams.active / this.metrics.teams.total) * 100).toFixed(1);
      console.log(`   Activity Rate: ${activePercentage}%`);
    }
    console.log();

    // Activity Metrics
    console.log('📊 ACTIVITY (Last Hour)');
    console.log('------------------------');
    console.log(`   Total Events: ${this.metrics.activity.total}`);
    
    Object.entries(this.metrics.activity.by_type).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log();

    // Usage Trends
    console.log('📈 USAGE TRENDS (Last 24 Hours)');
    console.log('--------------------------------');
    console.log(`   Total Events: ${this.metrics.usage.total_events}`);
    
    const hours = Object.keys(this.metrics.usage.hourly).sort().slice(-6); // Last 6 hours
    console.log('   Recent Activity:');
    hours.forEach(hour => {
      const time = new Date(hour + ':00:00Z').toLocaleTimeString();
      const count = this.metrics.usage.hourly[hour];
      const bar = '█'.repeat(Math.min(Math.floor(count / 10), 20));
      console.log(`     ${time}: ${count.toString().padStart(4)} ${bar}`);
    });
    console.log();

    // Event Phase Indicator
    const eventPhase = this.determineEventPhase();
    console.log(`🎯 EVENT PHASE: ${eventPhase.name} (${eventPhase.description})`);
    console.log();

    // Quick Actions
    console.log('⚡ QUICK ACTIONS');
    console.log('----------------');
    console.log('   Ctrl+C: Exit dashboard');
    console.log('   Other scripts: health-check.js, validate-teams.js, event-monitor.js');
    console.log();

    // Alerts
    this.displayAlerts();
  }

  displayAlerts() {
    const alerts = [];

    // Check for issues
    if (this.metrics.system.health_status !== 'healthy') {
      alerts.push(`🚨 System health: ${this.metrics.system.health_status}`);
    }

    if (this.metrics.system.response_time && this.metrics.system.response_time > 3000) {
      alerts.push(`⚠️ Slow response time: ${this.metrics.system.response_time}ms`);
    }

    if (this.metrics.performance.cpu_usage && this.metrics.performance.cpu_usage > 80) {
      alerts.push(`⚠️ High CPU usage: ${this.metrics.performance.cpu_usage}%`);
    }

    if (this.metrics.performance.memory_usage && this.metrics.performance.memory_usage > 85) {
      alerts.push(`⚠️ High memory usage: ${this.metrics.performance.memory_usage}%`);
    }

    if (this.metrics.teams.active === 0 && this.metrics.teams.total > 0) {
      alerts.push(`⚠️ No active teams detected`);
    }

    if (alerts.length > 0) {
      console.log('🚨 ALERTS');
      console.log('----------');
      alerts.forEach(alert => console.log(`   ${alert}`));
      console.log();
    } else {
      console.log('✅ No alerts - All systems operational');
      console.log();
    }
  }

  determineEventPhase() {
    const hour = new Date().getHours();
    
    // This is a simplified example - in reality you'd check against event start time
    if (hour >= 0 && hour < 12) {
      return { name: 'STARTUP', description: 'Teams getting started' };
    } else if (hour >= 12 && hour < 18) {
      return { name: 'ACTIVE', description: 'High development activity' };
    } else if (hour >= 18 && hour < 22) {
      return { name: 'EVENING', description: 'Continued development' };
    } else {
      return { name: 'LATE_NIGHT', description: 'Late night coding sessions' };
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shutdown() {
    console.log('\n📊 Dashboard shutdown complete');
    console.log(`Total uptime: ${Math.floor((Date.now() - this.startTime) / 60000)} minutes`);
    this.isRunning = false;
    process.exit(0);
  }
}

// Command line interface
if (process.argv[2] === '--help') {
  console.log('🏔️ HIKEathon 2025 Event Dashboard');
  console.log('=================================');
  console.log();
  console.log('Real-time monitoring dashboard for event metrics.');
  console.log();
  console.log('Usage:');
  console.log('  node scripts/event-dashboard.js         # Start dashboard');
  console.log('  node scripts/event-dashboard.js --help  # Show this help');
  console.log();
  console.log('Environment Variables:');
  console.log('  NUXT_PUBLIC_SUPABASE_URL      # Supabase project URL');
  console.log('  NUXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anonymous key');
  console.log('  NUXT_PUBLIC_BASE_URL          # Platform base URL');
  console.log();
  console.log('Features:');
  console.log('  - Real-time system health monitoring');
  console.log('  - Team activity tracking');
  console.log('  - Performance metrics');
  console.log('  - Usage trends and analytics');
  console.log('  - Automated alerting');
  console.log();
  process.exit(0);
}

// Run dashboard
const dashboard = new EventDashboard();
dashboard.start().catch(console.error);