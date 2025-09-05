#!/usr/bin/env node

/**
 * Comprehensive System Health Check Script
 * Validates all HIKEathon 2025 platform components before event
 */

import https from 'https';
import { createClient } from '@supabase/supabase-js';

const CONFIG = {
  baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000/hikeathon-2025',
  supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
  ionosApiUrl: 'https://ai-proxy.ionos.com',
  timeout: 30000
};

class HealthChecker {
  constructor() {
    this.results = {
      frontend: { status: 'unknown', details: [] },
      backend: { status: 'unknown', details: [] },
      database: { status: 'unknown', details: [] },
      apis: { status: 'unknown', details: [] },
      security: { status: 'unknown', details: [] }
    };
    this.startTime = Date.now();
  }

  async checkAll() {
    console.log('🏔️ HIKEathon 2025 System Health Check');
    console.log('==========================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log();

    try {
      await Promise.all([
        this.checkFrontend(),
        this.checkBackend(),
        this.checkDatabase(),
        this.checkAPIs(),
        this.checkSecurity()
      ]);

      this.generateReport();
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  }

  async checkFrontend() {
    console.log('🖥️  Checking Frontend...');
    
    try {
      // Check main page loads
      const mainResponse = await this.httpRequest(`${CONFIG.baseUrl}/`);
      this.results.frontend.details.push({
        check: 'Main page loads',
        status: mainResponse.status === 200 ? 'pass' : 'fail',
        response_time: mainResponse.time
      });

      // Check critical pages
      const pages = ['/chat', '/images', '/admin'];
      for (const page of pages) {
        try {
          const response = await this.httpRequest(`${CONFIG.baseUrl}${page}`);
          this.results.frontend.details.push({
            check: `${page} page loads`,
            status: response.status === 200 ? 'pass' : 'fail',
            response_time: response.time
          });
        } catch (error) {
          this.results.frontend.details.push({
            check: `${page} page loads`,
            status: 'fail',
            error: error.message
          });
        }
      }

      // Check static assets
      const assets = ['/favicon.ico', '/manifest.json', '/sw.js'];
      for (const asset of assets) {
        try {
          const response = await this.httpRequest(`${CONFIG.baseUrl}${asset}`);
          this.results.frontend.details.push({
            check: `Static asset ${asset}`,
            status: response.status === 200 ? 'pass' : 'fail',
            response_time: response.time
          });
        } catch (error) {
          this.results.frontend.details.push({
            check: `Static asset ${asset}`,
            status: 'fail',
            error: error.message
          });
        }
      }

      this.results.frontend.status = this.results.frontend.details.every(d => d.status === 'pass') ? 'healthy' : 'unhealthy';
    } catch (error) {
      this.results.frontend.status = 'error';
      this.results.frontend.error = error.message;
    }
  }

  async checkBackend() {
    console.log('⚙️  Checking Backend Services...');

    try {
      // Check health endpoint
      const healthResponse = await this.httpRequest(`${CONFIG.baseUrl}/api/health`);
      const healthData = JSON.parse(healthResponse.body);
      
      this.results.backend.details.push({
        check: 'Health endpoint',
        status: healthResponse.status === 200 ? 'pass' : 'fail',
        response_time: healthResponse.time,
        services: healthData.services
      });

      // Check if it's a real backend vs static site
      if (healthData.services) {
        this.results.backend.details.push({
          check: 'Database connection',
          status: healthData.services.database === 'connected' ? 'pass' : 'fail'
        });
        
        this.results.backend.details.push({
          check: 'Storage availability',
          status: healthData.services.storage === 'available' ? 'pass' : 'fail'
        });
      }

      this.results.backend.status = this.results.backend.details.every(d => d.status === 'pass') ? 'healthy' : 'unhealthy';
    } catch (error) {
      this.results.backend.status = 'error';
      this.results.backend.error = error.message;
    }
  }

  async checkDatabase() {
    console.log('🗄️  Checking Database...');

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
      this.results.database.status = 'skipped';
      this.results.database.details.push({
        check: 'Database connection',
        status: 'skipped',
        reason: 'Supabase credentials not configured'
      });
      return;
    }

    try {
      const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

      // Test connection with a simple query
      const { data, error } = await supabase
        .from('teams')
        .select('count(*)')
        .limit(1);

      this.results.database.details.push({
        check: 'Supabase connection',
        status: error ? 'fail' : 'pass',
        error: error?.message
      });

      // Check critical tables exist
      const tables = ['teams', 'telemetry', 'todos', 'broadcasts', 'settings'];
      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          this.results.database.details.push({
            check: `Table ${table} exists`,
            status: error ? 'fail' : 'pass',
            error: error?.message
          });
        } catch (err) {
          this.results.database.details.push({
            check: `Table ${table} exists`,
            status: 'fail',
            error: err.message
          });
        }
      }

      this.results.database.status = this.results.database.details.every(d => d.status === 'pass') ? 'healthy' : 'unhealthy';
    } catch (error) {
      this.results.database.status = 'error';
      this.results.database.error = error.message;
    }
  }

  async checkAPIs() {
    console.log('🔗 Checking External APIs...');

    try {
      // Check IONOS API (if available)
      try {
        const response = await this.httpRequest(CONFIG.ionosApiUrl + '/health', { timeout: 5000 });
        this.results.apis.details.push({
          check: 'IONOS API connectivity',
          status: response.status < 500 ? 'pass' : 'fail',
          response_time: response.time
        });
      } catch (error) {
        this.results.apis.details.push({
          check: 'IONOS API connectivity',
          status: 'warning',
          error: 'Cannot test without API key'
        });
      }

      // Test DNS resolution
      try {
        const response = await this.httpRequest('https://supabase.com/health');
        this.results.apis.details.push({
          check: 'External DNS resolution',
          status: 'pass',
          response_time: response.time
        });
      } catch (error) {
        this.results.apis.details.push({
          check: 'External DNS resolution',
          status: 'fail',
          error: error.message
        });
      }

      this.results.apis.status = this.results.apis.details.filter(d => d.status === 'fail').length === 0 ? 'healthy' : 'unhealthy';
    } catch (error) {
      this.results.apis.status = 'error';
      this.results.apis.error = error.message;
    }
  }

  async checkSecurity() {
    console.log('🔒 Checking Security Configuration...');

    try {
      // Check HTTPS redirect
      if (CONFIG.baseUrl.startsWith('https://')) {
        const httpUrl = CONFIG.baseUrl.replace('https://', 'http://');
        try {
          const response = await this.httpRequest(httpUrl);
          this.results.security.details.push({
            check: 'HTTPS redirect',
            status: response.status === 301 || response.status === 302 ? 'pass' : 'warning',
            response_code: response.status
          });
        } catch (error) {
          this.results.security.details.push({
            check: 'HTTPS redirect',
            status: 'warning',
            error: 'Cannot test HTTP redirect'
          });
        }
      }

      // Check security headers
      const securityResponse = await this.httpRequest(CONFIG.baseUrl);
      const securityHeaders = [
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options'
      ];

      securityHeaders.forEach(header => {
        this.results.security.details.push({
          check: `Security header: ${header}`,
          status: securityResponse.headers[header] ? 'pass' : 'warning',
          value: securityResponse.headers[header] || 'missing'
        });
      });

      // Check for sensitive data exposure
      const sensitivePatterns = ['password', 'secret', 'key', 'token'];
      const hasExposedData = sensitivePatterns.some(pattern => 
        securityResponse.body.toLowerCase().includes(pattern + ':')
      );

      this.results.security.details.push({
        check: 'No sensitive data in source',
        status: hasExposedData ? 'fail' : 'pass'
      });

      this.results.security.status = this.results.security.details.filter(d => d.status === 'fail').length === 0 ? 'healthy' : 'warning';
    } catch (error) {
      this.results.security.status = 'error';
      this.results.security.error = error.message;
    }
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = options.timeout || CONFIG.timeout;

      const request = https.get(url, { timeout }, (response) => {
        let body = '';
        
        response.on('data', chunk => {
          body += chunk;
        });

        response.on('end', () => {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body,
            time: Date.now() - startTime
          });
        });
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });
    });
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    console.log('\n📊 HEALTH CHECK RESULTS');
    console.log('========================');

    // Overall status
    const allStatuses = Object.values(this.results).map(r => r.status);
    const overallHealthy = allStatuses.every(s => s === 'healthy' || s === 'warning');
    const hasErrors = allStatuses.some(s => s === 'error');

    console.log(`\n🎯 Overall Status: ${hasErrors ? '❌ CRITICAL' : overallHealthy ? '✅ HEALTHY' : '⚠️  WARNING'}`);
    console.log(`⏱️  Total Duration: ${duration}ms`);

    // Detailed results
    Object.entries(this.results).forEach(([category, result]) => {
      const icon = result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : result.status === 'error' ? '❌' : '⏭️';
      console.log(`\n${icon} ${category.toUpperCase()}: ${result.status.toUpperCase()}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }

      result.details?.forEach(detail => {
        const detailIcon = detail.status === 'pass' ? '  ✅' : detail.status === 'warning' ? '  ⚠️' : detail.status === 'fail' ? '  ❌' : '  ⏭️';
        console.log(`${detailIcon} ${detail.check}`);
        if (detail.response_time) console.log(`     Response time: ${detail.response_time}ms`);
        if (detail.error) console.log(`     Error: ${detail.error}`);
        if (detail.value) console.log(`     Value: ${detail.value}`);
      });
    });

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');

    if (this.results.frontend.status !== 'healthy') {
      console.log('- Check frontend deployment and static asset availability');
    }
    if (this.results.backend.status !== 'healthy') {
      console.log('- Verify backend services and health endpoint');
    }
    if (this.results.database.status !== 'healthy' && this.results.database.status !== 'skipped') {
      console.log('- Check Supabase connection and table schemas');
    }
    if (this.results.apis.status !== 'healthy') {
      console.log('- Verify external API connectivity and credentials');
    }
    if (this.results.security.status !== 'healthy') {
      console.log('- Review security headers and HTTPS configuration');
    }

    console.log(`\n✨ Health check completed at ${new Date().toISOString()}`);
    console.log('Run this script regularly during the event to monitor system health.');

    // Exit code
    process.exit(hasErrors ? 1 : 0);
  }
}

// Run health check
const checker = new HealthChecker();
checker.checkAll().catch(console.error);