#!/usr/bin/env node

/**
 * Data Export and Archival System
 * Exports all HIKEathon 2025 data for post-event analysis and archival
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  exportDir: './exports',
  archiveDir: './archive',
  eventStart: process.env.EVENT_START_DATE || '2025-09-01T00:00:00Z',
  eventEnd: process.env.EVENT_END_DATE || '2025-09-03T00:00:00Z'
};

class DataExporter {
  constructor() {
    this.supabase = null;
    this.adminClient = null;
    this.results = {
      teams: 0,
      telemetry: 0,
      todos: 0,
      broadcasts: 0,
      settings: 0,
      errors: []
    };
  }

  async export() {
    console.log('🏔️ HIKEathon 2025 Data Export & Archive');
    console.log('=======================================');
    console.log(`Export period: ${CONFIG.eventStart} to ${CONFIG.eventEnd}`);
    console.log(`Export directory: ${CONFIG.exportDir}`);
    console.log();

    try {
      await this.initialize();
      await this.createDirectories();
      await this.exportAllData();
      await this.generateReports();
      await this.createArchive();
      this.generateSummary();
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  }

  async initialize() {
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    
    if (CONFIG.serviceRoleKey) {
      this.adminClient = createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey);
      console.log('✅ Initialized with admin privileges');
    } else {
      console.log('⚠️ No service role key - limited export capabilities');
    }

    console.log('✅ Connected to Supabase');
  }

  async createDirectories() {
    const dirs = [CONFIG.exportDir, CONFIG.archiveDir, path.join(CONFIG.exportDir, 'reports')];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });
  }

  async exportAllData() {
    console.log('📊 Exporting data...');
    
    await Promise.all([
      this.exportTeams(),
      this.exportTelemetry(),
      this.exportTodos(),
      this.exportBroadcasts(),
      this.exportSettings()
    ]);
  }

  async exportTeams() {
    try {
      console.log('👥 Exporting teams data...');
      
      const { data: teams, error } = await this.supabase
        .from('teams')
        .select('team_code, name, status, created_at, updated_at')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Teams export failed: ${error.message}`);
      }

      // Export as CSV
      const csvData = this.convertToCSV(teams, [
        'team_code',
        'name', 
        'status',
        'created_at',
        'updated_at'
      ]);
      
      fs.writeFileSync(path.join(CONFIG.exportDir, 'teams.csv'), csvData);
      
      // Export as JSON (full data)
      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'teams.json'),
        JSON.stringify(teams, null, 2)
      );

      this.results.teams = teams.length;
      console.log(`✅ Exported ${teams.length} teams`);
    } catch (error) {
      this.results.errors.push(`Teams export: ${error.message}`);
      console.error('❌ Teams export failed:', error.message);
    }
  }

  async exportTelemetry() {
    try {
      console.log('📈 Exporting telemetry data...');
      
      // Export in chunks to handle large datasets
      let allTelemetry = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: telemetryChunk, error } = await this.supabase
          .from('telemetry')
          .select('*')
          .gte('created_at', CONFIG.eventStart)
          .lte('created_at', CONFIG.eventEnd)
          .order('created_at', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          throw new Error(`Telemetry export failed: ${error.message}`);
        }

        if (telemetryChunk.length === 0) break;
        
        allTelemetry = allTelemetry.concat(telemetryChunk);
        page++;
        
        console.log(`  Exported ${allTelemetry.length} telemetry records...`);
      }

      // Anonymize sensitive data
      const anonymizedTelemetry = allTelemetry.map(record => ({
        ...record,
        team_code: record.team_code ? record.team_code.substr(0, 4) + '****' : null,
        ip_address: record.ip_address ? 'xxx.xxx.xxx.xxx' : null,
        session_id: record.session_id ? 'session_' + Math.random().toString(36).substr(2, 9) : null
      }));

      // Export full data (for admin use)
      if (this.adminClient) {
        fs.writeFileSync(
          path.join(CONFIG.exportDir, 'telemetry_full.json'),
          JSON.stringify(allTelemetry, null, 2)
        );
      }

      // Export anonymized data
      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'telemetry_anonymized.json'),
        JSON.stringify(anonymizedTelemetry, null, 2)
      );

      // Export summary CSV
      const summaryData = this.generateTelemetrySummary(allTelemetry);
      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'telemetry_summary.csv'),
        this.convertToCSV(summaryData)
      );

      this.results.telemetry = allTelemetry.length;
      console.log(`✅ Exported ${allTelemetry.length} telemetry records`);
    } catch (error) {
      this.results.errors.push(`Telemetry export: ${error.message}`);
      console.error('❌ Telemetry export failed:', error.message);
    }
  }

  async exportTodos() {
    try {
      console.log('📝 Exporting todos data...');
      
      // Global todos
      const { data: todos, error: todosError } = await this.supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: true });

      if (todosError) {
        throw new Error(`Todos export failed: ${todosError.message}`);
      }

      // Team todos
      const { data: teamTodos, error: teamTodosError } = await this.supabase
        .from('team_todos')
        .select('*')
        .order('created_at', { ascending: true });

      if (teamTodosError) {
        throw new Error(`Team todos export failed: ${teamTodosError.message}`);
      }

      // Export todos
      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'todos.json'),
        JSON.stringify(todos, null, 2)
      );

      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'team_todos.json'),
        JSON.stringify(teamTodos, null, 2)
      );

      // Export as CSV
      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'todos.csv'),
        this.convertToCSV(todos)
      );

      this.results.todos = todos.length;
      console.log(`✅ Exported ${todos.length} todos and ${teamTodos.length} team todos`);
    } catch (error) {
      this.results.errors.push(`Todos export: ${error.message}`);
      console.error('❌ Todos export failed:', error.message);
    }
  }

  async exportBroadcasts() {
    try {
      console.log('📢 Exporting broadcasts data...');
      
      const { data: broadcasts, error } = await this.supabase
        .from('broadcasts')
        .select('*')
        .gte('created_at', CONFIG.eventStart)
        .lte('created_at', CONFIG.eventEnd)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Broadcasts export failed: ${error.message}`);
      }

      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'broadcasts.json'),
        JSON.stringify(broadcasts, null, 2)
      );

      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'broadcasts.csv'),
        this.convertToCSV(broadcasts)
      );

      this.results.broadcasts = broadcasts.length;
      console.log(`✅ Exported ${broadcasts.length} broadcasts`);
    } catch (error) {
      this.results.errors.push(`Broadcasts export: ${error.message}`);
      console.error('❌ Broadcasts export failed:', error.message);
    }
  }

  async exportSettings() {
    try {
      console.log('⚙️ Exporting settings data...');
      
      const { data: settings, error } = await this.supabase
        .from('settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) {
        throw new Error(`Settings export failed: ${error.message}`);
      }

      // Remove sensitive settings
      const publicSettings = settings.filter(setting => 
        !setting.key.toLowerCase().includes('key') &&
        !setting.key.toLowerCase().includes('secret') &&
        !setting.key.toLowerCase().includes('password')
      );

      fs.writeFileSync(
        path.join(CONFIG.exportDir, 'settings.json'),
        JSON.stringify(publicSettings, null, 2)
      );

      this.results.settings = publicSettings.length;
      console.log(`✅ Exported ${publicSettings.length} settings`);
    } catch (error) {
      this.results.errors.push(`Settings export: ${error.message}`);
      console.error('❌ Settings export failed:', error.message);
    }
  }

  generateTelemetrySummary(telemetry) {
    const summary = {};
    
    telemetry.forEach(record => {
      const key = `${record.team_code}_${record.event_type}`;
      if (!summary[key]) {
        summary[key] = {
          team_code: record.team_code,
          event_type: record.event_type,
          count: 0,
          first_occurrence: record.created_at,
          last_occurrence: record.created_at
        };
      }
      
      summary[key].count++;
      if (record.created_at < summary[key].first_occurrence) {
        summary[key].first_occurrence = record.created_at;
      }
      if (record.created_at > summary[key].last_occurrence) {
        summary[key].last_occurrence = record.created_at;
      }
    });

    return Object.values(summary);
  }

  async generateReports() {
    console.log('📊 Generating analysis reports...');
    
    try {
      // Team activity report
      await this.generateTeamActivityReport();
      
      // Platform usage report
      await this.generatePlatformUsageReport();
      
      // Performance report
      await this.generatePerformanceReport();
      
      console.log('✅ Generated analysis reports');
    } catch (error) {
      this.results.errors.push(`Report generation: ${error.message}`);
      console.error('❌ Report generation failed:', error.message);
    }
  }

  async generateTeamActivityReport() {
    const { data: teamActivity, error } = await this.supabase
      .from('telemetry')
      .select('team_code, event_type, created_at')
      .gte('created_at', CONFIG.eventStart)
      .lte('created_at', CONFIG.eventEnd);

    if (error) return;

    const activity = {};
    teamActivity.forEach(record => {
      if (!activity[record.team_code]) {
        activity[record.team_code] = {
          team_code: record.team_code,
          total_events: 0,
          chat_messages: 0,
          image_generations: 0,
          first_activity: record.created_at,
          last_activity: record.created_at
        };
      }
      
      const team = activity[record.team_code];
      team.total_events++;
      
      if (record.event_type === 'chat_message') team.chat_messages++;
      if (record.event_type === 'image_generation') team.image_generations++;
      
      if (record.created_at < team.first_activity) team.first_activity = record.created_at;
      if (record.created_at > team.last_activity) team.last_activity = record.created_at;
    });

    fs.writeFileSync(
      path.join(CONFIG.exportDir, 'reports', 'team_activity.json'),
      JSON.stringify(Object.values(activity), null, 2)
    );

    fs.writeFileSync(
      path.join(CONFIG.exportDir, 'reports', 'team_activity.csv'),
      this.convertToCSV(Object.values(activity))
    );
  }

  async generatePlatformUsageReport() {
    const { data: usage, error } = await this.supabase
      .from('telemetry')
      .select('event_type, created_at')
      .gte('created_at', CONFIG.eventStart)
      .lte('created_at', CONFIG.eventEnd);

    if (error) return;

    const hourlyUsage = {};
    const eventTypes = {};
    
    usage.forEach(record => {
      const hour = new Date(record.created_at).toISOString().substr(0, 13);
      
      if (!hourlyUsage[hour]) hourlyUsage[hour] = 0;
      hourlyUsage[hour]++;
      
      if (!eventTypes[record.event_type]) eventTypes[record.event_type] = 0;
      eventTypes[record.event_type]++;
    });

    const report = {
      total_events: usage.length,
      hourly_breakdown: hourlyUsage,
      event_type_breakdown: eventTypes,
      peak_hour: Object.keys(hourlyUsage).reduce((a, b) => 
        hourlyUsage[a] > hourlyUsage[b] ? a : b
      ),
      generated_at: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(CONFIG.exportDir, 'reports', 'platform_usage.json'),
      JSON.stringify(report, null, 2)
    );
  }

  async generatePerformanceReport() {
    // This would analyze response times, error rates, etc.
    // For now, create a placeholder structure
    const performanceReport = {
      analysis_period: {
        start: CONFIG.eventStart,
        end: CONFIG.eventEnd
      },
      summary: {
        total_teams: this.results.teams,
        total_events: this.results.telemetry,
        error_count: this.results.errors.length,
        export_timestamp: new Date().toISOString()
      },
      errors: this.results.errors
    };

    fs.writeFileSync(
      path.join(CONFIG.exportDir, 'reports', 'performance.json'),
      JSON.stringify(performanceReport, null, 2)
    );
  }

  convertToCSV(data, columns = null) {
    if (!data || data.length === 0) return '';
    
    const headers = columns || Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  async createArchive() {
    console.log('📦 Creating archive...');
    
    try {
      const { exec } = require('child_process');
      const archiveName = `hikeathon-2025-data-${new Date().toISOString().split('T')[0]}.tar.gz`;
      const archivePath = path.join(CONFIG.archiveDir, archiveName);
      
      await new Promise((resolve, reject) => {
        exec(`tar -czf "${archivePath}" -C "${CONFIG.exportDir}" .`, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });

      const stats = fs.statSync(archivePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ Created archive: ${archiveName} (${fileSizeMB} MB)`);
    } catch (error) {
      console.error('❌ Archive creation failed:', error.message);
      this.results.errors.push(`Archive creation: ${error.message}`);
    }
  }

  generateSummary() {
    console.log('\n📊 EXPORT SUMMARY');
    console.log('==================');
    console.log(`Teams exported: ${this.results.teams}`);
    console.log(`Telemetry records: ${this.results.telemetry}`);
    console.log(`Todos exported: ${this.results.todos}`);
    console.log(`Broadcasts exported: ${this.results.broadcasts}`);
    console.log(`Settings exported: ${this.results.settings}`);
    console.log(`Errors encountered: ${this.results.errors.length}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log(`\n📁 Export location: ${CONFIG.exportDir}`);
    console.log(`📦 Archive location: ${CONFIG.archiveDir}`);
    console.log(`\n✨ Export completed at ${new Date().toISOString()}`);
    
    // Exit code
    process.exit(this.results.errors.length > 0 ? 1 : 0);
  }
}

// Run export
const exporter = new DataExporter();
exporter.export().catch(console.error);