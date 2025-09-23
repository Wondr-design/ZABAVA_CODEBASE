#!/usr/bin/env node

/**
 * API Endpoint Test Script
 * Tests all Zabava server endpoints and checks CORS configuration
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'https://zabava-server.vercel.app';
const FRONTEND_ORIGIN = 'https://zabava-lasermax.vercel.app';
const TEST_EMAIL = 'wondrcrown@gmail.com';
const TEST_PARTNER_ID = 'OSM001';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.hostname.includes('localhost') ? http : https;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test endpoint function
async function testEndpoint(name, method, path, options = {}) {
  console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);
  console.log(`  Method: ${method}`);
  console.log(`  Path: ${path}`);
  
  const url = new URL(API_BASE_URL + path);
  const requestOptions = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: method,
    headers: {
      'Origin': FRONTEND_ORIGIN,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
  };
  
  try {
    // Test the actual request
    const response = await makeRequest(requestOptions, options.body);
    
    // Check status code
    const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
    const hasAuthError = response.statusCode === 401 || response.statusCode === 403;
    const hasNotFound = response.statusCode === 404;
    
    // Check CORS headers
    const hasCorsHeaders = response.headers['access-control-allow-origin'];
    const corsAllowsOrigin = hasCorsHeaders && (
      response.headers['access-control-allow-origin'] === '*' || 
      response.headers['access-control-allow-origin'] === FRONTEND_ORIGIN
    );
    
    // Parse body if JSON
    let bodyData = null;
    try {
      if (response.body && response.body.trim()) {
        // Check if response is HTML (authentication page)
        if (response.body.trim().startsWith('<!doctype html>') || response.body.includes('Authentication Required')) {
          console.log(`  ${colors.red}✗ Authentication protection enabled${colors.reset}`);
          testResults.failed.push({
            endpoint: name,
            issue: 'Vercel authentication protection is blocking the endpoint'
          });
          return;
        }
        bodyData = JSON.parse(response.body);
      }
    } catch (e) {
      // Not JSON, that's okay
    }
    
    // Report results
    if (hasAuthError) {
      console.log(`  ${colors.red}✗ Authentication/Authorization error (${response.statusCode})${colors.reset}`);
      testResults.failed.push({
        endpoint: name,
        issue: `Authentication error: ${response.statusCode}`
      });
    } else if (hasNotFound) {
      console.log(`  ${colors.red}✗ Endpoint not found (404)${colors.reset}`);
      testResults.failed.push({
        endpoint: name,
        issue: 'Endpoint not found (404)'
      });
    } else if (isSuccess) {
      console.log(`  ${colors.green}✓ Request successful (${response.statusCode})${colors.reset}`);
      
      if (!hasCorsHeaders) {
        console.log(`  ${colors.yellow}⚠ No CORS headers present${colors.reset}`);
        testResults.warnings.push({
          endpoint: name,
          issue: 'No CORS headers'
        });
      } else if (!corsAllowsOrigin) {
        console.log(`  ${colors.yellow}⚠ CORS doesn't allow frontend origin${colors.reset}`);
        testResults.warnings.push({
          endpoint: name,
          issue: `CORS doesn't allow ${FRONTEND_ORIGIN}`
        });
      } else {
        console.log(`  ${colors.green}✓ CORS properly configured${colors.reset}`);
        testResults.passed.push(name);
      }
      
      // Show sample response for debugging
      if (bodyData && options.showResponse) {
        console.log(`  Response preview:`, JSON.stringify(bodyData).substring(0, 200) + '...');
      }
    } else {
      console.log(`  ${colors.red}✗ Request failed (${response.statusCode})${colors.reset}`);
      if (bodyData && bodyData.error) {
        console.log(`  Error: ${bodyData.error}`);
      }
      testResults.failed.push({
        endpoint: name,
        issue: `HTTP ${response.statusCode}: ${bodyData?.error || 'Unknown error'}`
      });
    }
    
  } catch (error) {
    console.log(`  ${colors.red}✗ Request error: ${error.message}${colors.reset}`);
    testResults.failed.push({
      endpoint: name,
      issue: error.message
    });
  }
}

// Test OPTIONS preflight
async function testPreflight(path) {
  console.log(`  ${colors.blue}Testing preflight...${colors.reset}`);
  
  const url = new URL(API_BASE_URL + path);
  const requestOptions = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: 'OPTIONS',
    headers: {
      'Origin': FRONTEND_ORIGIN,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'content-type'
    }
  };
  
  try {
    const response = await makeRequest(requestOptions);
    const hasCors = response.headers['access-control-allow-origin'];
    const allowsMethods = response.headers['access-control-allow-methods'];
    const allowsHeaders = response.headers['access-control-allow-headers'];
    
    if (response.statusCode === 200 || response.statusCode === 204) {
      if (hasCors && allowsMethods && allowsHeaders) {
        console.log(`  ${colors.green}✓ Preflight successful${colors.reset}`);
      } else {
        console.log(`  ${colors.yellow}⚠ Preflight incomplete (missing headers)${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.red}✗ Preflight failed (${response.statusCode})${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Preflight error: ${error.message}${colors.reset}`);
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════╗
║     Zabava API Endpoint Test Suite                 ║
║     Testing: ${API_BASE_URL.padEnd(37)}║
║     Frontend: ${FRONTEND_ORIGIN.padEnd(36)}║
╚════════════════════════════════════════════════════╝
${colors.reset}`);
  
  // Public endpoints (should work without auth)
  console.log(`\n${colors.bright}${colors.magenta}=== PUBLIC ENDPOINTS ===${colors.reset}`);
  
  // Registration and verification
  await testEndpoint('Register', 'POST', '/api/register', {
    body: JSON.stringify({
      email: TEST_EMAIL,
      partnerId: TEST_PARTNER_ID
    })
  });
  
  await testEndpoint('Verify', 'GET', `/api/verify?email=${TEST_EMAIL}`);
  
  await testEndpoint('Pending', 'GET', '/api/pending');
  
  // Bonus endpoints
  console.log(`\n${colors.bright}${colors.magenta}=== BONUS SYSTEM ENDPOINTS ===${colors.reset}`);
  
  await testEndpoint('User Points (Original)', 'GET', `/api/bonus/user-points?email=${TEST_EMAIL}`, {
    showResponse: true
  });
  
  await testEndpoint('User Points (Fixed)', 'GET', `/api/bonus/user-points-fixed?email=${TEST_EMAIL}`, {
    showResponse: true
  });
  
  await testEndpoint('Debug User', 'GET', `/api/bonus/debug-user?email=${TEST_EMAIL}`);
  
  // Partner endpoints
  console.log(`\n${colors.bright}${colors.magenta}=== PARTNER ENDPOINTS ===${colors.reset}`);
  
  await testEndpoint('Get Partner by ID', 'GET', `/api/partner/${TEST_PARTNER_ID}`);
  
  await testEndpoint('Partner Visit', 'POST', '/api/partner/visit', {
    body: JSON.stringify({
      partnerId: TEST_PARTNER_ID
    })
  });
  
  await testEndpoint('Mark Visited', 'POST', '/api/partner/mark-visited', {
    body: JSON.stringify({
      email: TEST_EMAIL,
      partnerId: TEST_PARTNER_ID
    })
  });
  
  // Auth endpoints
  console.log(`\n${colors.bright}${colors.magenta}=== AUTH ENDPOINTS ===${colors.reset}`);
  
  await testEndpoint('Login', 'POST', '/api/auth/login', {
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123'
    })
  });
  
  await testEndpoint('Signup', 'POST', '/api/auth/signup', {
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123',
      name: 'Test User'
    })
  });
  
  await testEndpoint('Profile', 'GET', '/api/auth/profile', {
    headers: {
      'Authorization': 'Bearer dummy-token'
    }
  });
  
  // Admin endpoints (require admin secret)
  console.log(`\n${colors.bright}${colors.magenta}=== ADMIN ENDPOINTS (Protected) ===${colors.reset}`);
  
  await testEndpoint('Admin Overview', 'GET', '/api/admin/overview', {
    headers: {
      'x-admin-secret': 'test-secret'
    }
  });
  
  await testEndpoint('Admin Partners', 'GET', '/api/admin/partners', {
    headers: {
      'x-admin-secret': 'test-secret'
    }
  });
  
  await testEndpoint('Admin Analytics', 'GET', '/api/admin/analytics', {
    headers: {
      'x-admin-secret': 'test-secret'
    }
  });
  
  await testEndpoint('Admin Rewards', 'GET', '/api/admin/rewards', {
    headers: {
      'x-admin-secret': 'test-secret'
    }
  });
  
  // QR endpoints
  console.log(`\n${colors.bright}${colors.magenta}=== QR ENDPOINTS ===${colors.reset}`);
  
  await testEndpoint('QR Register', 'POST', '/api/qr/register', {
    body: JSON.stringify({
      email: TEST_EMAIL,
      partnerId: TEST_PARTNER_ID,
      data: {
        ticket: 'Standard',
        numPeople: 1
      }
    })
  });
  
  // Test preflight for critical endpoints
  console.log(`\n${colors.bright}${colors.magenta}=== PREFLIGHT TESTS ===${colors.reset}`);
  
  console.log(`\n${colors.cyan}Preflight for /api/bonus/user-points-fixed${colors.reset}`);
  await testPreflight('/api/bonus/user-points-fixed');
  
  console.log(`\n${colors.cyan}Preflight for /api/register${colors.reset}`);
  await testPreflight('/api/register');
  
  // Print summary
  printSummary();
}

// Print test summary
function printSummary() {
  console.log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════╗
║                   TEST SUMMARY                     ║
╚════════════════════════════════════════════════════╝
${colors.reset}`);
  
  console.log(`\n${colors.green}✓ Passed: ${testResults.passed.length} endpoints${colors.reset}`);
  if (testResults.passed.length > 0) {
    testResults.passed.forEach(endpoint => {
      console.log(`  - ${endpoint}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ Warnings: ${testResults.warnings.length} endpoints${colors.reset}`);
    testResults.warnings.forEach(warning => {
      console.log(`  - ${warning.endpoint}: ${warning.issue}`);
    });
  }
  
  if (testResults.failed.length > 0) {
    console.log(`\n${colors.red}✗ Failed: ${testResults.failed.length} endpoints${colors.reset}`);
    testResults.failed.forEach(failure => {
      console.log(`  - ${failure.endpoint}: ${failure.issue}`);
    });
  }
  
  // Overall status
  console.log(`\n${colors.bright}Overall Status: ${colors.reset}`, end='');
  if (testResults.failed.length === 0 && testResults.warnings.length === 0) {
    console.log(`${colors.green}ALL TESTS PASSED ✓${colors.reset}`);
  } else if (testResults.failed.length === 0) {
    console.log(`${colors.yellow}PASSED WITH WARNINGS${colors.reset}`);
  } else {
    console.log(`${colors.red}FAILED - ${testResults.failed.length} endpoints need attention${colors.reset}`);
    
    // Check for common issues
    const authProtected = testResults.failed.filter(f => 
      f.issue.includes('authentication protection') || 
      f.issue.includes('Authentication Required')
    );
    
    if (authProtected.length > 0) {
      console.log(`\n${colors.bright}${colors.red}⚠ CRITICAL ISSUE DETECTED:${colors.reset}`);
      console.log(`${colors.yellow}Vercel Deployment Protection is enabled!${colors.reset}`);
      console.log(`\nTo fix this:`);
      console.log(`1. Go to https://vercel.com`);
      console.log(`2. Navigate to the zabava-server project`);
      console.log(`3. Go to Settings → Deployment Protection`);
      console.log(`4. Disable protection for Production deployments`);
      console.log(`5. Save changes and redeploy`);
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});