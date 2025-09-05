#!/usr/bin/env node

/**
 * Real-time Event Monitoring Script
 * Continuously monitors platform health during HIKEathon 2025
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import fs from 'fs';

const CONFIG = {
  supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
  baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000/hikeathon-2025',
  checkInterval: 60000, // 1 minute
  alertThresholds: {
    responseTime: 3000,    // 3 seconds
    errorRate: 0.05,       // 5%
    activeTeams: 5,        // Minimum active teams
    diskSpace: 0.9         // 90% disk usage
  },
  alertChannels: {
    console: true,
    file: true,
    webhook: process.env.ALERT_WEBHOOK_URL
  }
};

class EventMonitor {
  constructor() {
    this.supabase = null;
    this.isRunning = false;
    this.metrics = {
      responseTime: [],
      errorCount: 0,
      totalRequests: 0,
      activeTeams: 0,
      lastHealthCheck: null
    };
    this.alerts = [];
    this.startTime = Date.now();
  }

  async start() {
    console.log('🏔️ HIKEathon 2025 Event Monitor');
    console.log('================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Check interval: ${CONFIG.checkInterval / 1000}s`);
    console.log(`Base URL: ${CONFIG.baseUrl}`);
    console.log();

    try {
      await this.initializeSupabase();
      this.isRunning = true;
      this.setupSignalHandlers();
      await this.monitoringLoop();
    } catch (error) {
      this.alert('CRITICAL', 'Monitor startup failed', error.message);
      process.exit(1);
    }
  }

  async initializeSupabase() {
    if (CONFIG.supabaseUrl && CONFIG.supabaseKey) {
      this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
      console.log('✅ Connected to Supabase for telemetry');
    } else {
      console.log('⚠️ Supabase not configured - telemetry monitoring disabled');
    }
  }

  setupSignalHandlers() {
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutdown signal received');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Terminate signal received');
      this.shutdown();
    });
  }

  async monitoringLoop() {
    while (this.isRunning) {
      try {
        await this.performChecks();
        await this.generatePeriodicReport();
        await this.sleep(CONFIG.checkInterval);
      } catch (error) {
        this.alert('ERROR', 'Monitoring loop error', error.message);
        await this.sleep(CONFIG.checkInterval);
      }
    }
  }

  async performChecks() {
    const timestamp = new Date().toISOString();
    
    // Health check
    await this.checkHealth();
    
    // Performance check
    await this.checkPerformance();
    
    // Database metrics (if available)
    if (this.supabase) {
      await this.checkDatabaseMetrics();
    }
    
    // System resources
    await this.checkSystemResources();
    
    // Update console status
    this.updateConsoleStatus();
  }

  async checkHealth() {
    try {
      const startTime = Date.now();
      const response = await this.httpRequest(`${CONFIG.baseUrl}/api/health`);
      const responseTime = Date.now() - startTime;
      
      this.metrics.responseTime.push(responseTime);
      this.metrics.totalRequests++;
      this.metrics.lastHealthCheck = {
        status: response.status,
        responseTime,
        timestamp: new Date().toISOString()
      };

      if (response.status !== 200) {
        this.metrics.errorCount++;
        this.alert('WARNING', 'Health check failed', `Status: ${response.status}`);
      }

      if (responseTime > CONFIG.alertThresholds.responseTime) {
        this.alert('WARNING', 'Slow response time', `${responseTime}ms (threshold: ${CONFIG.alertThresholds.responseTime}ms)`);
      }

      // Keep only last 100 response times
      if (this.metrics.responseTime.length > 100) {
        this.metrics.responseTime = this.metrics.responseTime.slice(-100);
      }

    } catch (error) {
      this.metrics.errorCount++;
      this.alert('ERROR', 'Health check failed', error.message);
    }
  }

  async checkPerformance() {
    try {
      // Check multiple endpoints
      const endpoints = [
        '/',
        '/chat',
        '/images',
        '/admin'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        try {
          const response = await this.httpRequest(`${CONFIG.baseUrl}${endpoint}`);
          const responseTime = Date.now() - startTime;
          
          this.metrics.totalRequests++;
          
          if (response.status !== 200) {
            this.metrics.errorCount++;
            this.alert('WARNING', `${endpoint} endpoint failed`, `Status: ${response.status}`);
          }
        } catch (error) {
          this.metrics.errorCount++;
          this.alert('ERROR', `${endpoint} endpoint error`, error.message);
        }
      }
    } catch (error) {
      this.alert('ERROR', 'Performance check failed', error.message);
    }
  }

  async checkDatabaseMetrics() {
    try {
      // Count active teams (teams with recent activity)
      const { count: activeTeams, error: teamsError } = await this.supabase
        .from('telemetry')
        .select('team_code', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .not('team_code', 'is', null);

      if (teamsError) {
        this.alert('ERROR', 'Database query failed', teamsError.message);
        return;
      }

      this.metrics.activeTeams = activeTeams || 0;

      if (this.metrics.activeTeams < CONFIG.alertThresholds.activeTeams) {
        this.alert('WARNING', 'Low team activity', `Only ${this.metrics.activeTeams} active teams`);
      }

      // Check for error events in telemetry
      const { data: recentErrors, error: errorsError } = await this.supabase
        .from('telemetry')
        .select('*')
        .eq('event_type', 'error')
        .gte('created_at', new Date(Date.now() - 600000).toISOString()) // Last 10 minutes
        .limit(10);

      if (errorsError) {
        this.alert('ERROR', 'Error telemetry query failed', errorsError.message);
      } else if (recentErrors && recentErrors.length > 5) {
        this.alert('WARNING', 'High error rate detected', `${recentErrors.length} errors in last 10 minutes`);
      }

    } catch (error) {
      this.alert('ERROR', 'Database metrics check failed', error.message);
    }
  }

  async checkSystemResources() {
    try {
      // Check disk space (if running on server)
      const { exec } = require('child_process');
      
      exec('df -h /', (error, stdout, stderr) => {
        if (!error) {
          const lines = stdout.split('\n');
          const rootLine = lines.find(line => line.includes('/'));
          if (rootLine) {
            const usage = rootLine.split(/\s+/)[4];
            const usagePercent = parseInt(usage.replace('%', '')) / 100;
            
            if (usagePercent > CONFIG.alertThresholds.diskSpace) {
              this.alert('CRITICAL', 'Disk space critical', `${Math.round(usagePercent * 100)}% used`);
            }
          }
        }
      });

      // Memory check
      exec('free -m', (error, stdout, stderr) => {
        if (!error) {
          const lines = stdout.split('\n');
          const memLine = lines[1];
          if (memLine) {
            const parts = memLine.split(/\s+/);
            const total = parseInt(parts[1]);
            const used = parseInt(parts[2]);
            const usagePercent = used / total;
            
            if (usagePercent > 0.9) {
              this.alert('CRITICAL', 'Memory usage critical', `${Math.round(usagePercent * 100)}% used`);
            }
          }
        }
      });

    } catch (error) {
      // System resource checks are optional
      console.log('System resource check not available (normal for client-side monitoring)');
    }
  }

  updateConsoleStatus() {
    const errorRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.errorCount / this.metrics.totalRequests) : 0;
    
    const avgResponseTime = this.metrics.responseTime.length > 0 ?
      this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length : 0;

    const uptime = Date.now() - this.startTime;
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);

    // Clear console and show status
    console.clear();
    console.log('🏔️ HIKEathon 2025 Event Monitor - LIVE STATUS');
    console.log('==============================================');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log(`🕐 Uptime: ${uptimeHours}h ${uptimeMinutes}m`);
    console.log();
    console.log('📊 METRICS');
    console.log(`   Response Time: ${Math.round(avgResponseTime)}ms avg`);
    console.log(`   Error Rate: ${(errorRate * 100).toFixed(2)}%`);
    console.log(`   Active Teams: ${this.metrics.activeTeams}`);
    console.log(`   Total Requests: ${this.metrics.totalRequests}`);
    console.log();
    console.log('🚥 SYSTEM STATUS');
    
    const healthStatus = this.metrics.lastHealthCheck?.status === 200 ? '✅ HEALTHY' : '❌ UNHEALTHY';
    const performanceStatus = avgResponseTime < CONFIG.alertThresholds.responseTime ? '✅ GOOD' : '⚠️ SLOW';
    const errorStatus = errorRate < CONFIG.alertThresholds.errorRate ? '✅ LOW' : '❌ HIGH';
    
    console.log(`   Health: ${healthStatus}`);
    console.log(`   Performance: ${performanceStatus}`);
    console.log(`   Errors: ${errorStatus}`);
    console.log();
    
    if (this.alerts.length > 0) {
      console.log('🚨 RECENT ALERTS');
      this.alerts.slice(-5).forEach(alert => {
        const icon = alert.level === 'CRITICAL' ? '🔥' : alert.level === 'ERROR' ? '❌' : '⚠️';
        console.log(`   ${icon} ${alert.timestamp.toLocaleTimeString()} - ${alert.message}`);
      });
      console.log();
    }
    
    console.log('Press Ctrl+C to stop monitoring');
  }

  async generatePeriodicReport() {
    const now = Date.now();
    const reportInterval = 3600000; // 1 hour
    
    if (now - this.startTime > reportInterval && (now - this.startTime) % reportInterval < CONFIG.checkInterval) {
      await this.generateHourlyReport();
    }
  }

  async generateHourlyReport() {
    const errorRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.errorCount / this.metrics.totalRequests) : 0;
    
    const avgResponseTime = this.metrics.responseTime.length > 0 ?
      this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length : 0;

    const report = {
      timestamp: new Date().toISOString(),
      uptime_hours: Math.floor((Date.now() - this.startTime) / 3600000),
      metrics: {
        total_requests: this.metrics.totalRequests,
        error_count: this.metrics.errorCount,
        error_rate: errorRate,
        avg_response_time: avgResponseTime,
        active_teams: this.metrics.activeTeams
      },
      alerts_count: this.alerts.length,
      status: errorRate < CONFIG.alertThresholds.errorRate && 
              avgResponseTime < CONFIG.alertThresholds.responseTime ? 'healthy' : 'degraded'
    };

    console.log('\n📊 HOURLY REPORT');
    console.log(JSON.stringify(report, null, 2));

    // Save to file
    if (CONFIG.alertChannels.file) {
      const filename = `event-monitor-${new Date().toISOString().split('T')[0]}.log`;
      fs.appendFileSync(filename, JSON.stringify(report) + '\n');
    }
  }

  alert(level, title, message) {
    const alert = {
      level,
      title,
      message,
      timestamp: new Date()
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log to console
    if (CONFIG.alertChannels.console) {
      const icon = level === 'CRITICAL' ? '🔥' : level === 'ERROR' ? '❌' : '⚠️';
      console.log(`${icon} [${level}] ${title}: ${message}`);
    }

    // Log to file
    if (CONFIG.alertChannels.file) {
      const filename = `alerts-${new Date().toISOString().split('T')[0]}.log`;
      const logEntry = `${alert.timestamp.toISOString()} [${level}] ${title}: ${message}\n`;
      fs.appendFileSync(filename, logEntry);
    }

    // Send webhook alert
    if (CONFIG.alertChannels.webhook && level === 'CRITICAL') {
      this.sendWebhookAlert(alert);
    }
  }

  async sendWebhookAlert(alert) {
    try {
      const payload = {
        text: `🔥 HIKEathon 2025 Alert`,
        attachments: [{
          color: alert.level === 'CRITICAL' ? 'danger' : 'warning',
          title: alert.title,
          text: alert.message,
          timestamp: alert.timestamp.toISOString(),
          fields: [
            {
              title: 'Level',
              value: alert.level,
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp.toLocaleString(),
              short: true
            }
          ]
        }]
      };

      await this.httpRequest(CONFIG.alertChannels.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.log('Failed to send webhook alert:', error.message);
    }
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const request = https.request(url, options, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => resolve({
          status: response.statusCode,
          headers: response.headers,
          body
        }));
      });

      request.on('error', reject);
      
      if (options.body) {
        request.write(options.body);
      }
      
      request.end();
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shutdown() {
    console.log('\n📊 Final Report');
    console.log('================');
    
    const uptime = Date.now() - this.startTime;
    const errorRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.errorCount / this.metrics.totalRequests) : 0;

    console.log(`Uptime: ${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`);
    console.log(`Total Requests: ${this.metrics.totalRequests}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}%`);
    console.log(`Alerts Generated: ${this.alerts.length}`);
    
    this.isRunning = false;
    process.exit(0);
  }
}

// Run monitor
const monitor = new EventMonitor();
monitor.start().catch(console.error);