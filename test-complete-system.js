#!/usr/bin/env node

/**
 * Complete System Test - API, Frontend, Admin, and Partner Dashboards
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const API_BASE_URL = 'https://zabava-server.vercel.app';
const FRONTEND_URL = 'https://zabava-lasermax.vercel.app';

// Test data
const TEST_ADMIN_SECRET = 'test-admin-secret'; // You'll need to replace with actual
const TEST_TIMESTAMP = Date.now();
const TEST_USER = {
  email: `test_${TEST_TIMESTAMP}@example.com`,
  password: 'TestPass123!',
  name: 'Test User'
};
const TEST_PARTNER_ID = 'OSM001';
const EXISTING_USER_EMAIL = 'wondrcrown@gmail.com';

// Colors for output
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
const testSuite = {
  auth: { passed: 0, failed: 0, tests: [] },
  admin: { passed: 0, failed: 0, tests: [] },
  partner: { passed: 0, failed: 0, tests: [] },
  bonus: { passed: 0, failed: 0, tests: [] },
  frontend: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] }
};

// Helper to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    const postData = options.body ? JSON.stringify(options.body) : '';
    
    const requestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': FRONTEND_URL,
        ...options.headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json: (() => {
            try {
              return JSON.parse(data);
            } catch {
              return null;
            }
          })()
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (postData) req.write(postData);
    req.end();
  });
}

// Helper to check frontend page
function checkFrontendPage(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(FRONTEND_URL + path);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          hasContent: data.length > 0,
          containsReact: data.includes('root') || data.includes('React'),
          title: (data.match(/<title>(.*?)<\/title>/i) || [])[1] || 'No title'
        });
      });
    }).on('error', reject);
  });
}

// Test runner
async function runTest(category, name, testFn) {
  console.log(`  ${colors.cyan}Testing: ${name}${colors.reset}`);
  
  try {
    const result = await testFn();
    
    if (result.success) {
      console.log(`    ${colors.green}✓ ${result.message || 'Passed'}${colors.reset}`);
      testSuite[category].passed++;
      testSuite[category].tests.push({ name, status: 'passed', ...result });
    } else {
      console.log(`    ${colors.red}✗ ${result.message || 'Failed'}${colors.reset}`);
      if (result.details) console.log(`      ${colors.yellow}${result.details}${colors.reset}`);
      testSuite[category].failed++;
      testSuite[category].tests.push({ name, status: 'failed', ...result });
    }
  } catch (error) {
    console.log(`    ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    testSuite[category].failed++;
    testSuite[category].tests.push({ name, status: 'error', error: error.message });
  }
}

// === AUTH ENDPOINTS ===
async function testAuthEndpoints() {
  console.log(`\n${colors.bright}${colors.magenta}=== AUTHENTICATION ENDPOINTS ===${colors.reset}`);
  
  let authToken = null;
  
  // Test signup
  await runTest('auth', 'Signup', async () => {
    const res = await makeRequest('/api/auth/signup', {
      method: 'POST',
      body: TEST_USER
    });
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      authToken = res.json?.token;
      return { 
        success: true, 
        message: `User created successfully`,
        token: authToken ? 'Token received' : 'No token'
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error || res.json?.message
    };
  });
  
  // Test login
  await runTest('auth', 'Login', async () => {
    const res = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });
    
    if (res.statusCode === 200) {
      authToken = res.json?.token || authToken;
      return { 
        success: true, 
        message: 'Login successful',
        hasToken: !!res.json?.token
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  // Test profile
  await runTest('auth', 'Get Profile', async () => {
    const res = await makeRequest('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${authToken || 'dummy-token'}`
      }
    });
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: 'Profile retrieved',
        hasUser: !!res.json?.user
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  return authToken;
}

// === ADMIN ENDPOINTS ===
async function testAdminEndpoints() {
  console.log(`\n${colors.bright}${colors.magenta}=== ADMIN ENDPOINTS ===${colors.reset}`);
  
  // Test overview
  await runTest('admin', 'Admin Overview', async () => {
    const res = await makeRequest('/api/admin/overview', {
      headers: {
        'x-admin-secret': TEST_ADMIN_SECRET
      }
    });
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: 'Overview data retrieved',
        hasStats: !!res.json?.stats
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.statusCode === 401 ? 'Invalid admin secret' : res.json?.error
    };
  });
  
  // Test partners list
  await runTest('admin', 'List Partners', async () => {
    const res = await makeRequest('/api/admin/partners', {
      headers: {
        'x-admin-secret': TEST_ADMIN_SECRET
      }
    });
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: `Retrieved ${res.json?.partners?.length || 0} partners`,
        partnerCount: res.json?.partners?.length || 0
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  // Test analytics
  await runTest('admin', 'Analytics', async () => {
    const res = await makeRequest('/api/admin/analytics', {
      headers: {
        'x-admin-secret': TEST_ADMIN_SECRET
      }
    });
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: 'Analytics data retrieved',
        hasData: !!res.json?.totalUsers
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  // Test rewards management
  await runTest('admin', 'List Rewards', async () => {
    const res = await makeRequest('/api/admin/rewards', {
      headers: {
        'x-admin-secret': TEST_ADMIN_SECRET
      }
    });
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: `Retrieved ${res.json?.rewards?.length || 0} rewards`,
        rewardCount: res.json?.rewards?.length || 0
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  // Test invites
  await runTest('admin', 'Manage Invites', async () => {
    const res = await makeRequest('/api/admin/invites', {
      headers: {
        'x-admin-secret': TEST_ADMIN_SECRET
      }
    });
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: 'Invites endpoint accessible',
        hasData: !!res.json
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
}

// === PARTNER ENDPOINTS ===
async function testPartnerEndpoints() {
  console.log(`\n${colors.bright}${colors.magenta}=== PARTNER ENDPOINTS ===${colors.reset}`);
  
  // Test get partner by ID
  await runTest('partner', 'Get Partner Info', async () => {
    const res = await makeRequest(`/api/partner/${TEST_PARTNER_ID}`);
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: `Partner ${TEST_PARTNER_ID} info retrieved`,
        hasData: !!res.json?.partner
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  // Test partner visit
  await runTest('partner', 'Record Visit', async () => {
    const res = await makeRequest('/api/partner/visit', {
      method: 'POST',
      body: {
        partnerId: TEST_PARTNER_ID,
        visitData: {
          timestamp: new Date().toISOString(),
          source: 'test'
        }
      }
    });
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      return { 
        success: true, 
        message: 'Visit recorded successfully'
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error || res.json?.message
    };
  });
  
  // Test mark visited
  await runTest('partner', 'Mark User as Visited', async () => {
    const res = await makeRequest('/api/partner/mark-visited', {
      method: 'POST',
      body: {
        email: EXISTING_USER_EMAIL,
        partnerId: TEST_PARTNER_ID,
        pointsAwarded: 10
      }
    });
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: 'User marked as visited',
        pointsAwarded: res.json?.pointsAwarded
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
}

// === BONUS ENDPOINTS ===
async function testBonusEndpoints() {
  console.log(`\n${colors.bright}${colors.magenta}=== BONUS SYSTEM ENDPOINTS ===${colors.reset}`);
  
  // Test user points (original)
  await runTest('bonus', 'Get User Points (Original)', async () => {
    const res = await makeRequest(`/api/bonus/user-points?email=${EXISTING_USER_EMAIL}`);
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: `User has ${res.json?.user?.totalPoints || 0} points`,
        points: res.json?.user?.totalPoints || 0,
        visits: res.json?.visits?.length || 0
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  // Test user points (fixed)
  await runTest('bonus', 'Get User Points (Fixed)', async () => {
    const res = await makeRequest(`/api/bonus/user-points-fixed?email=${EXISTING_USER_EMAIL}`);
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: `User has ${res.json?.user?.totalPoints || 0} points`,
        points: res.json?.user?.totalPoints || 0,
        visits: res.json?.visits?.length || 0,
        partners: res.json?.statistics?.totalPartners || 0
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
  
  // Test debug endpoint
  await runTest('bonus', 'Debug User Data', async () => {
    const res = await makeRequest(`/api/bonus/debug-user?email=${EXISTING_USER_EMAIL}`);
    
    if (res.statusCode === 200) {
      return { 
        success: true, 
        message: 'Debug data retrieved',
        hasQrRecords: !!res.json?.qrRecords,
        partnerCount: res.json?.partnerMemberships?.length || 0
      };
    }
    return { 
      success: false, 
      message: `Status ${res.statusCode}`,
      details: res.json?.error
    };
  });
}

// === FRONTEND PAGES ===
async function testFrontendPages() {
  console.log(`\n${colors.bright}${colors.magenta}=== FRONTEND PAGES ===${colors.reset}`);
  
  const pages = [
    { path: '/', name: 'Home Page' },
    { path: '/bonus', name: 'Bonus Page' },
    { path: '/partner-dashboard', name: 'Partner Dashboard' },
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/auth/login', name: 'Login Page' },
    { path: '/auth/signup', name: 'Signup Page' }
  ];
  
  for (const page of pages) {
    await runTest('frontend', page.name, async () => {
      const res = await checkFrontendPage(page.path);
      
      if (res.statusCode === 200 && res.containsReact) {
        return { 
          success: true, 
          message: `Page loads successfully`,
          title: res.title
        };
      }
      return { 
        success: false, 
        message: `Status ${res.statusCode}`,
        details: !res.containsReact ? 'No React content detected' : 'Page load issue'
      };
    });
  }
}

// === INTEGRATION TESTS ===
async function testIntegration() {
  console.log(`\n${colors.bright}${colors.magenta}=== INTEGRATION TESTS ===${colors.reset}`);
  
  // Test complete registration flow
  await runTest('integration', 'Complete Registration Flow', async () => {
    const testEmail = `flow_test_${Date.now()}@example.com`;
    
    // 1. Register user
    const registerRes = await makeRequest('/api/register', {
      method: 'POST',
      body: {
        email: testEmail,
        partnerId: 'TX003',
        data: {
          ticket: 'VIP',
          numPeople: 2,
          totalPrice: 1000
        }
      }
    });
    
    if (registerRes.statusCode !== 200) {
      return { success: false, message: 'Registration failed' };
    }
    
    // 2. Check user points
    const pointsRes = await makeRequest(`/api/bonus/user-points-fixed?email=${testEmail}`);
    
    if (pointsRes.statusCode !== 200) {
      return { success: false, message: 'Could not retrieve points' };
    }
    
    // 3. Mark as visited
    const visitRes = await makeRequest('/api/partner/mark-visited', {
      method: 'POST',
      body: {
        email: testEmail,
        partnerId: 'TX003',
        pointsAwarded: 50
      }
    });
    
    if (visitRes.statusCode !== 200) {
      return { success: false, message: 'Could not mark as visited' };
    }
    
    // 4. Check updated points
    const updatedPointsRes = await makeRequest(`/api/bonus/user-points-fixed?email=${testEmail}`);
    
    if (updatedPointsRes.json?.user?.totalPoints === 50) {
      return { 
        success: true, 
        message: 'Complete flow successful',
        finalPoints: 50
      };
    }
    
    return { 
      success: false, 
      message: 'Points not updated correctly',
      details: `Expected 50, got ${updatedPointsRes.json?.user?.totalPoints}`
    };
  });
  
  // Test CORS headers
  await runTest('integration', 'CORS Configuration', async () => {
    const res = await makeRequest('/api/bonus/user-points-fixed?email=test@example.com');
    
    const corsHeader = res.headers['access-control-allow-origin'];
    if (corsHeader === '*' || corsHeader === FRONTEND_URL) {
      return { 
        success: true, 
        message: `CORS configured correctly: ${corsHeader}`
      };
    }
    
    return { 
      success: false, 
      message: 'CORS not properly configured',
      details: `Header: ${corsHeader || 'none'}`
    };
  });
  
  // Test API health
  await runTest('integration', 'API Health Check', async () => {
    const res = await makeRequest('/api');
    
    if (res.statusCode === 200 && res.json?.status === 'ok') {
      return { 
        success: true, 
        message: 'API is healthy'
      };
    }
    
    return { 
      success: false, 
      message: `API health check failed`,
      details: `Status: ${res.statusCode}`
    };
  });
}

// === FRONTEND COMPONENT ANALYSIS ===
async function analyzeFrontendComponents() {
  console.log(`\n${colors.bright}${colors.magenta}=== FRONTEND COMPONENT ANALYSIS ===${colors.reset}`);
  
  const componentsToCheck = [
    {
      name: 'BonusPage',
      file: '/src/pages/BonusPage.tsx',
      checks: [
        { pattern: 'user-points-fixed', description: 'Uses fixed endpoint' },
        { pattern: 'redeem-reward', description: 'Has reward redemption' },
        { pattern: 'useState', description: 'State management' }
      ]
    },
    {
      name: 'AdminDashboard',
      file: '/src/pages/admin/AdminDashboard.tsx',
      checks: [
        { pattern: '/api/admin/', description: 'Admin API calls' },
        { pattern: 'x-admin-secret', description: 'Admin authentication' },
        { pattern: 'analytics', description: 'Analytics integration' }
      ]
    },
    {
      name: 'PartnerDashboard',
      file: '/src/pages/PartnerDashboard.tsx',
      checks: [
        { pattern: '/api/partner/', description: 'Partner API calls' },
        { pattern: 'mark-visited', description: 'Visit confirmation' },
        { pattern: 'QR', description: 'QR functionality' }
      ]
    },
    {
      name: 'AuthContext',
      file: '/src/context/AuthContext.tsx',
      checks: [
        { pattern: 'login', description: 'Login functionality' },
        { pattern: 'signup', description: 'Signup functionality' },
        { pattern: 'localStorage', description: 'Token storage' }
      ]
    }
  ];
  
  const frontendPath = '/Users/wondr/Downloads/DEV NEW/ZABAVA_CODEBASE/zabava_frontend/zabava-lasermax';
  
  for (const component of componentsToCheck) {
    console.log(`\n  ${colors.cyan}Checking ${component.name}:${colors.reset}`);
    
    try {
      const filePath = path.join(frontendPath, component.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const check of component.checks) {
          if (content.includes(check.pattern)) {
            console.log(`    ${colors.green}✓ ${check.description}${colors.reset}`);
          } else {
            console.log(`    ${colors.yellow}⚠ Missing: ${check.description}${colors.reset}`);
          }
        }
      } else {
        console.log(`    ${colors.red}✗ File not found${colors.reset}`);
      }
    } catch (error) {
      console.log(`    ${colors.red}✗ Error reading file: ${error.message}${colors.reset}`);
    }
  }
}

// === MAIN TEST RUNNER ===
async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════╗
║          COMPLETE SYSTEM TEST SUITE                        ║
║  API: ${API_BASE_URL.padEnd(51)}║
║  Frontend: ${FRONTEND_URL.padEnd(47)}║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  // Run all test categories
  const authToken = await testAuthEndpoints();
  await testAdminEndpoints();
  await testPartnerEndpoints();
  await testBonusEndpoints();
  await testFrontendPages();
  await testIntegration();
  await analyzeFrontendComponents();
  
  // Print summary
  printSummary();
}

// === SUMMARY PRINTER ===
function printSummary() {
  console.log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Print results for each category
  for (const [category, results] of Object.entries(testSuite)) {
    const emoji = results.failed === 0 ? '✅' : results.passed > results.failed ? '⚠️' : '❌';
    console.log(`\n${colors.cyan}${category.toUpperCase()}:${colors.reset} ${emoji}`);
    console.log(`  Passed: ${colors.green}${results.passed}${colors.reset}`);
    console.log(`  Failed: ${colors.red}${results.failed}${colors.reset}`);
    
    // Show failed tests
    if (results.failed > 0) {
      const failedTests = results.tests.filter(t => t.status === 'failed' || t.status === 'error');
      console.log(`  ${colors.yellow}Issues:${colors.reset}`);
      failedTests.forEach(test => {
        console.log(`    - ${test.name}: ${test.message || test.error}`);
      });
    }
    
    totalPassed += results.passed;
    totalFailed += results.failed;
  }
  
  // Overall summary
  console.log(`\n${colors.bright}OVERALL RESULTS:${colors.reset}`);
  console.log(`Total Tests Run: ${totalPassed + totalFailed}`);
  console.log(`${colors.green}Passed: ${totalPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalFailed}${colors.reset}`);
  console.log(`Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`);
  
  // Recommendations
  console.log(`\n${colors.bright}${colors.magenta}RECOMMENDATIONS:${colors.reset}`);
  
  if (testSuite.auth.failed > 0) {
    console.log(`${colors.yellow}⚠ Auth Issues:${colors.reset}`);
    console.log(`  - Check JWT_SECRET environment variable`);
    console.log(`  - Verify password hashing is working`);
  }
  
  if (testSuite.admin.failed > 0) {
    console.log(`${colors.yellow}⚠ Admin Issues:${colors.reset}`);
    console.log(`  - Verify ADMIN_SECRET environment variable`);
    console.log(`  - Check admin authentication middleware`);
  }
  
  if (testSuite.partner.failed > 0) {
    console.log(`${colors.yellow}⚠ Partner Issues:${colors.reset}`);
    console.log(`  - Check partner data in KV store`);
    console.log(`  - Verify partner ID format`);
  }
  
  if (testSuite.frontend.failed > 0) {
    console.log(`${colors.yellow}⚠ Frontend Issues:${colors.reset}`);
    console.log(`  - Check deployment status`);
    console.log(`  - Verify routing configuration`);
  }
  
  // Critical systems check
  console.log(`\n${colors.bright}${colors.cyan}CRITICAL SYSTEMS STATUS:${colors.reset}`);
  
  const bonusWorking = testSuite.bonus.passed > 0;
  const corsWorking = testSuite.integration.tests.find(t => t.name === 'CORS Configuration')?.status === 'passed';
  const registrationWorking = testSuite.integration.tests.find(t => t.name === 'Complete Registration Flow')?.status === 'passed';
  
  console.log(`Bonus System: ${bonusWorking ? colors.green + '✓ Working' : colors.red + '✗ Not Working'}${colors.reset}`);
  console.log(`CORS: ${corsWorking ? colors.green + '✓ Configured' : colors.red + '✗ Not Configured'}${colors.reset}`);
  console.log(`Registration Flow: ${registrationWorking ? colors.green + '✓ Working' : colors.red + '✗ Not Working'}${colors.reset}`);
  
  // Final verdict
  console.log(`\n${colors.bright}FINAL VERDICT: ${colors.reset}`, end='');
  if (totalFailed === 0) {
    console.log(`${colors.green}SYSTEM FULLY OPERATIONAL ✅${colors.reset}`);
  } else if (totalPassed > totalFailed * 2) {
    console.log(`${colors.yellow}MOSTLY OPERATIONAL (${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}% passing)${colors.reset}`);
  } else {
    console.log(`${colors.red}NEEDS ATTENTION (${totalFailed} failures)${colors.reset}`);
  }
  
  // Export detailed report
  const reportPath = '/Users/wondr/Downloads/DEV NEW/ZABAVA_CODEBASE/system-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      successRate: Math.round((totalPassed / (totalPassed + totalFailed)) * 100)
    },
    results: testSuite,
    criticalSystems: {
      bonusSystem: bonusWorking,
      cors: corsWorking,
      registrationFlow: registrationWorking
    }
  }, null, 2));
  
  console.log(`\n${colors.green}✓ Detailed report saved to: ${reportPath}${colors.reset}`);
}

// Run the complete test suite
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});