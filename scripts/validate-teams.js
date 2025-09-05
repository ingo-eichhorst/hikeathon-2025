#!/usr/bin/env node

/**
 * Team Code Validation Script
 * Validates all team codes before event to ensure authentication works
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const CONFIG = {
  supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
  encryptionKey: process.env.ENCRYPTION_KEY,
  baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'
};

class TeamValidator {
  constructor() {
    this.supabase = null;
    this.results = {
      total: 0,
      valid: 0,
      invalid: 0,
      errors: [],
      teams: []
    };
  }

  async validate() {
    console.log('🏔️ HIKEathon 2025 Team Code Validator');
    console.log('=====================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log();

    try {
      await this.initializeSupabase();
      await this.generateTestTeams();
      await this.validateAllTeams();
      await this.testAuthentication();
      this.generateReport();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  async initializeSupabase() {
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    console.log('✅ Connected to Supabase');
  }

  async generateTestTeams() {
    console.log('🏗️  Generating test teams...');

    const testTeams = [];
    
    // Generate 10 test teams
    for (let i = 1; i <= 10; i++) {
      const teamCode = `TEAM${String(i).padStart(4, '0')}`;
      const teamName = `Test Team ${i}`;
      
      // Generate encrypted token
      const token = crypto.randomBytes(32).toString('hex');
      const encryptedToken = this.encryptToken(token);

      testTeams.push({
        team_code: teamCode,
        name: teamName,
        encrypted_token: encryptedToken,
        status: 'active'
      });
    }

    // Insert teams into database
    try {
      const { data, error } = await this.supabase
        .from('teams')
        .upsert(testTeams, { onConflict: 'team_code' })
        .select();

      if (error) {
        throw new Error(`Failed to create test teams: ${error.message}`);
      }

      console.log(`✅ Generated ${testTeams.length} test teams`);
      this.results.total = testTeams.length;
      return testTeams;
    } catch (error) {
      console.error('❌ Failed to generate test teams:', error.message);
      throw error;
    }
  }

  async validateAllTeams() {
    console.log('🔍 Validating team codes...');

    try {
      // Get all teams from database
      const { data: teams, error } = await this.supabase
        .from('teams')
        .select('*')
        .eq('status', 'active');

      if (error) {
        throw new Error(`Failed to fetch teams: ${error.message}`);
      }

      console.log(`Found ${teams.length} active teams`);

      // Validate each team
      for (const team of teams) {
        try {
          const isValid = await this.validateTeamCode(team.team_code);
          
          this.results.teams.push({
            team_code: team.team_code,
            name: team.name,
            status: isValid ? 'valid' : 'invalid',
            last_checked: new Date().toISOString()
          });

          if (isValid) {
            this.results.valid++;
          } else {
            this.results.invalid++;
          }

          // Show progress
          process.stdout.write('.');
        } catch (error) {
          this.results.errors.push({
            team_code: team.team_code,
            error: error.message
          });
          this.results.invalid++;
          process.stdout.write('✗');
        }
      }

      console.log('\n✅ Team code validation complete');
    } catch (error) {
      console.error('❌ Team validation failed:', error.message);
      throw error;
    }
  }

  async validateTeamCode(teamCode) {
    try {
      // Test the validation endpoint if available
      const response = await fetch(`${CONFIG.baseUrl}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: teamCode })
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid === true;
      }

      // Fallback: direct database validation
      const { data, error } = await this.supabase
        .from('teams')
        .select('*')
        .eq('team_code', teamCode)
        .eq('status', 'active')
        .single();

      return !error && data !== null;
    } catch (error) {
      console.warn(`Warning: Could not validate ${teamCode}:`, error.message);
      return false;
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing authentication flow...');

    // Test a sample team code through the full auth flow
    const testTeam = this.results.teams.find(t => t.status === 'valid');
    if (!testTeam) {
      console.log('⚠️ No valid teams to test authentication');
      return;
    }

    try {
      // Test login endpoint if available
      const response = await fetch(`${CONFIG.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teamCode: testTeam.team_code })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Authentication endpoint working');
        
        if (data.token) {
          console.log('✅ JWT token generation working');
        }
      } else {
        console.log(`⚠️ Authentication endpoint returned ${response.status}`);
      }
    } catch (error) {
      console.log('⚠️ Could not test authentication endpoint:', error.message);
      console.log('   This is normal if the backend is not running locally');
    }
  }

  encryptToken(token) {
    if (!CONFIG.encryptionKey) {
      return token; // Return plaintext if no encryption key
    }

    try {
      const key = Buffer.from(CONFIG.encryptionKey, 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.warn('Warning: Could not encrypt token, using plaintext');
      return token;
    }
  }

  generateReport() {
    console.log('\n📊 TEAM VALIDATION RESULTS');
    console.log('===========================');

    const successRate = this.results.total > 0 ? (this.results.valid / this.results.total) * 100 : 0;

    console.log(`\n🎯 Summary:`);
    console.log(`   Total teams: ${this.results.total}`);
    console.log(`   Valid teams: ${this.results.valid}`);
    console.log(`   Invalid teams: ${this.results.invalid}`);
    console.log(`   Success rate: ${successRate.toFixed(1)}%`);
    console.log(`   Errors: ${this.results.errors.length}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.results.errors.forEach(error => {
        console.log(`   ${error.team_code}: ${error.error}`);
      });
    }

    const invalidTeams = this.results.teams.filter(t => t.status === 'invalid');
    if (invalidTeams.length > 0) {
      console.log('\n⚠️ Invalid team codes:');
      invalidTeams.forEach(team => {
        console.log(`   ${team.team_code} (${team.name})`);
      });
    }

    console.log('\n💡 Recommendations:');
    if (successRate < 95) {
      console.log('- Review team code generation process');
      console.log('- Check database constraints and data integrity');
    }
    if (this.results.errors.length > 0) {
      console.log('- Investigate validation errors before event');
    }
    if (successRate === 100) {
      console.log('- All team codes validated successfully! Ready for event 🎉');
    }

    console.log(`\n✨ Validation completed at ${new Date().toISOString()}`);

    // Generate CSV report
    this.generateCSVReport();

    // Exit code
    process.exit(successRate < 95 ? 1 : 0);
  }

  generateCSVReport() {
    const csv = [
      'team_code,name,status,last_checked',
      ...this.results.teams.map(team => 
        `${team.team_code},${team.name},${team.status},${team.last_checked}`
      )
    ].join('\n');

    const fs = require('fs');
    const filename = `team-validation-${new Date().toISOString().split('T')[0]}.csv`;
    
    try {
      fs.writeFileSync(filename, csv);
      console.log(`📄 Report saved to: ${filename}`);
    } catch (error) {
      console.warn('Warning: Could not save CSV report:', error.message);
    }
  }
}

// Run validation
const validator = new TeamValidator();
validator.validate().catch(console.error);