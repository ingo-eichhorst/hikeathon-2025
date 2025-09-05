#!/usr/bin/env node

/**
 * Load Testing Script for HIKEathon 2025
 * Tests platform capacity at 150% expected load
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 50 },   // 50 concurrent users
    { duration: '5m', target: 100 },  // 100 concurrent users
    { duration: '10m', target: 150 }, // 150 concurrent users (150% capacity)
    { duration: '5m', target: 200 },  // Peak load
    { duration: '10m', target: 150 }, // Sustained load
    // Ramp down
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Error rate < 5%
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    errors: ['rate<0.05'],
    response_time: ['p(95)<2000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/hikeathon-2025';
const TEAM_CODES = ['TEAM0001', 'TEAM0002', 'TEAM0003', 'TEAM0004', 'TEAM0005'];

export function setup() {
  console.log('🏔️ Starting HIKEathon 2025 Load Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Expected concurrent users: 100`);
  console.log(`Testing at: 150% capacity (150 users)`);
  console.log('=====================================');
}

export default function () {
  const teamCode = TEAM_CODES[Math.floor(Math.random() * TEAM_CODES.length)];
  
  // Test different user workflows
  const workflow = Math.random();
  
  if (workflow < 0.4) {
    // 40% - Heavy chat users
    chatWorkflow(teamCode);
  } else if (workflow < 0.7) {
    // 30% - Image generation users
    imageWorkflow(teamCode);
  } else if (workflow < 0.9) {
    // 20% - Mixed usage
    mixedWorkflow(teamCode);
  } else {
    // 10% - Admin users
    adminWorkflow();
  }

  sleep(1 + Math.random() * 2); // Random sleep between 1-3 seconds
}

function chatWorkflow(teamCode) {
  const group = 'Chat Workflow';
  
  // Home page
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'home page loads': (r) => r.status === 200,
    'home page response time OK': (r) => r.timings.duration < 2000
  }) || errorRate.add(1);
  responseTime.add(response.timings.duration);

  sleep(1);

  // Login simulation (frontend only for static site)
  response = http.get(`${BASE_URL}/chat`);
  check(response, {
    'chat page loads': (r) => r.status === 200,
    'chat page response time OK': (r) => r.timings.duration < 2000
  }) || errorRate.add(1);
  responseTime.add(response.timings.duration);

  sleep(2);

  // Simulate multiple chat interactions
  for (let i = 0; i < 3; i++) {
    // Health check as proxy for API calls
    response = http.get(`${BASE_URL}/api/health`);
    check(response, {
      'API health check': (r) => r.status === 200,
      'API response time OK': (r) => r.timings.duration < 1000
    }) || errorRate.add(1);
    responseTime.add(response.timings.duration);

    sleep(5 + Math.random() * 10); // Simulate thinking/typing time
  }
}

function imageWorkflow(teamCode) {
  const group = 'Image Workflow';
  
  // Navigate to images page
  let response = http.get(`${BASE_URL}/images`);
  check(response, {
    'images page loads': (r) => r.status === 200,
    'images page response time OK': (r) => r.timings.duration < 2000
  }) || errorRate.add(1);
  responseTime.add(response.timings.duration);

  sleep(3);

  // Simulate image generation (longer process)
  response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    'image API health': (r) => r.status === 200
  }) || errorRate.add(1);
  responseTime.add(response.timings.duration);

  sleep(15 + Math.random() * 15); // Simulate image generation time
}

function mixedWorkflow(teamCode) {
  const group = 'Mixed Workflow';
  
  // Home page
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'home loads': (r) => r.status === 200
  }) || errorRate.add(1);
  
  sleep(2);

  // Chat
  response = http.get(`${BASE_URL}/chat`);
  check(response, {
    'chat loads': (r) => r.status === 200
  }) || errorRate.add(1);
  
  sleep(5);

  // Images
  response = http.get(`${BASE_URL}/images`);
  check(response, {
    'images loads': (r) => r.status === 200
  }) || errorRate.add(1);

  sleep(3);

  // Info page
  response = http.get(`${BASE_URL}/`);
  check(response, {
    'info loads': (r) => r.status === 200
  }) || errorRate.add(1);

  sleep(2);
}

function adminWorkflow() {
  const group = 'Admin Workflow';
  
  // Admin login page
  let response = http.get(`${BASE_URL}/admin/login`);
  check(response, {
    'admin login page loads': (r) => r.status === 200
  }) || errorRate.add(1);

  sleep(2);

  // Admin dashboard
  response = http.get(`${BASE_URL}/admin/dashboard`);
  check(response, {
    'admin dashboard loads': (r) => r.status === 200
  }) || errorRate.add(1);

  sleep(5);
}

export function teardown(data) {
  console.log('\n📊 Load Test Complete');
  console.log('====================');
}

// For standalone execution without k6
if (typeof __ENV === 'undefined') {
  console.log('🏔️ HIKEathon 2025 Load Test Configuration');
  console.log('==========================================');
  console.log('This script is designed to run with k6:');
  console.log('');
  console.log('Installation:');
  console.log('  # macOS');
  console.log('  brew install k6');
  console.log('');
  console.log('  # Ubuntu/Debian');
  console.log('  sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69');
  console.log('  echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list');
  console.log('  sudo apt-get update');
  console.log('  sudo apt-get install k6');
  console.log('');
  console.log('Usage:');
  console.log('  # Test local development');
  console.log('  k6 run scripts/load-test.js');
  console.log('');
  console.log('  # Test production');
  console.log('  BASE_URL=https://your-domain.github.io/hikeathon-2025 k6 run scripts/load-test.js');
  console.log('');
  console.log('  # Custom test parameters');
  console.log('  k6 run --vus 50 --duration 10m scripts/load-test.js');
  console.log('');
  console.log('Test Scenarios:');
  console.log('  - 40% Heavy chat users (multiple messages)');
  console.log('  - 30% Image generation users (longer sessions)');
  console.log('  - 20% Mixed usage (browsing multiple sections)');
  console.log('  - 10% Admin users (dashboard access)');
  console.log('');
  console.log('Success Criteria:');
  console.log('  - Error rate < 5%');
  console.log('  - 95th percentile response time < 2 seconds');
  console.log('  - System stable at 150% expected capacity');
  console.log('');
  console.log('Expected Load:');
  console.log('  - Normal: 100 concurrent users');
  console.log('  - Test: 150 concurrent users (150%)');
  console.log('  - Peak: 200 concurrent users (stress test)');
}