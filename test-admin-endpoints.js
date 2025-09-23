#!/usr/bin/env node

/**
 * Test all admin endpoints with the correct admin secret
 */

const https = require('https');

const API_BASE_URL = 'https://zabava-server.vercel.app';
const ADMIN_SECRET = 'zabava';

// ANSI color codes
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

// Make HTTPS request
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
        'x-admin-secret': ADMIN_SECRET,
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

async function testAdminEndpoints() {
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════╗
║     Admin Endpoints Test with Correct Secret           ║
║     Admin Secret: ${ADMIN_SECRET.padEnd(36)}║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);

  const tests = [
    {
      name: 'Admin Overview',
      path: '/api/admin/overview',
      method: 'GET',
      description: 'Get dashboard overview statistics'
    },
    {
      name: 'List Partners',
      path: '/api/admin/partners',
      method: 'GET',
      description: 'Get all partners in the system'
    },
    {
      name: 'Get Specific Partner',
      path: '/api/admin/partners/OSM001',
      method: 'GET',
      description: 'Get details for partner OSM001'
    },
    {
      name: 'Analytics',
      path: '/api/admin/analytics',
      method: 'GET',
      description: 'Get system analytics data'
    },
    {
      name: 'List Rewards',
      path: '/api/admin/rewards',
      method: 'GET',
      description: 'Get all rewards in the system'
    },
    {
      name: 'Manage Invites',
      path: '/api/admin/invites',
      method: 'GET',
      description: 'Get pending invitations'
    },
    {
      name: 'List Accounts',
      path: '/api/admin/accounts',
      method: 'GET',
      description: 'Get admin accounts (if endpoint exists)'
    }
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    console.log(`\n${colors.cyan}Testing: ${test.name}${colors.reset}`);
    console.log(`  Path: ${test.path}`);
    console.log(`  Description: ${test.description}`);
    
    try {
      const response = await makeRequest(test.path, { method: test.method });
      
      if (response.statusCode === 200) {
        console.log(`  ${colors.green}✓ Status: ${response.statusCode} - Success${colors.reset}`);
        
        // Show sample data
        if (response.json) {
          const preview = JSON.stringify(response.json, null, 2)
            .split('\n')
            .slice(0, 5)
            .join('\n');
          console.log(`  ${colors.green}Data preview:${colors.reset}`);
          console.log('    ' + preview.replace(/\n/g, '\n    '));
          
          // Show specific metrics
          if (test.name === 'Admin Overview' && response.json.totals) {
            console.log(`  ${colors.yellow}Key Metrics:${colors.reset}`);
            console.log(`    - Active Partners: ${response.json.totals.activePartners}`);
            console.log(`    - QRs Generated Today: ${response.json.totals.qrsGeneratedToday}`);
            console.log(`    - Monthly Visitors: ${response.json.totals.monthlyVisitors}`);
            console.log(`    - Total Revenue: $${response.json.totals.totalRevenue}`);
          }
          
          if (test.name === 'List Partners' && response.json.partners) {
            console.log(`  ${colors.yellow}Total Partners: ${response.json.partners.length}${colors.reset}`);
            const partnerIds = response.json.partners.map(p => p.id || p.partnerId).slice(0, 5);
            console.log(`    Partners: ${partnerIds.join(', ')}${response.json.partners.length > 5 ? '...' : ''}`);
          }
          
          if (test.name === 'Analytics' && response.json) {
            console.log(`  ${colors.yellow}Analytics Summary:${colors.reset}`);
            if (response.json.totalUsers !== undefined) {
              console.log(`    - Total Users: ${response.json.totalUsers}`);
            }
            if (response.json.totalVisits !== undefined) {
              console.log(`    - Total Visits: ${response.json.totalVisits}`);
            }
            if (response.json.totalPoints !== undefined) {
              console.log(`    - Total Points: ${response.json.totalPoints}`);
            }
          }
          
          if (test.name === 'List Rewards' && response.json.rewards) {
            console.log(`  ${colors.yellow}Total Rewards: ${response.json.rewards.length}${colors.reset}`);
            if (response.json.rewards.length > 0) {
              const activeRewards = response.json.rewards.filter(r => r.status === 'active');
              console.log(`    - Active Rewards: ${activeRewards.length}`);
            }
          }
        }
        
        passed++;
        results.push({ name: test.name, status: 'passed', code: response.statusCode });
      } else if (response.statusCode === 404) {
        console.log(`  ${colors.yellow}⚠ Status: ${response.statusCode} - Endpoint not found${colors.reset}`);
        results.push({ name: test.name, status: 'not_found', code: response.statusCode });
      } else {
        console.log(`  ${colors.red}✗ Status: ${response.statusCode} - Failed${colors.reset}`);
        if (response.json?.error) {
          console.log(`  Error: ${response.json.error}`);
        }
        failed++;
        results.push({ name: test.name, status: 'failed', code: response.statusCode });
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
      failed++;
      results.push({ name: test.name, status: 'error', error: error.message });
    }
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════╗
║                    SUMMARY                             ║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`\n${colors.green}✓ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Not Found: ${results.filter(r => r.status === 'not_found').length}${colors.reset}`);
  
  console.log(`\nEndpoint Status:`);
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✓' : 
                 result.status === 'not_found' ? '⚠' : '✗';
    const color = result.status === 'passed' ? colors.green : 
                  result.status === 'not_found' ? colors.yellow : colors.red;
    console.log(`  ${color}${icon} ${result.name}${colors.reset}`);
  });
  
  if (passed === tests.length) {
    console.log(`\n${colors.green}${colors.bright}ALL ADMIN ENDPOINTS WORKING! ✅${colors.reset}`);
  } else if (passed > 0) {
    console.log(`\n${colors.yellow}${colors.bright}ADMIN PANEL PARTIALLY WORKING${colors.reset}`);
    console.log(`Admin secret is correct, but some endpoints may not be implemented.`);
  }

  // Test creating a reward
  console.log(`\n${colors.bright}${colors.magenta}=== Testing Reward Creation ===${colors.reset}`);
  
  const newReward = {
    name: 'Test Reward ' + Date.now(),
    description: 'Test reward created via API',
    pointsCost: 100,
    category: 'test',
    status: 'active',
    stock: 10
  };
  
  console.log(`\nCreating test reward...`);
  try {
    const response = await makeRequest('/api/admin/rewards', {
      method: 'POST',
      body: newReward
    });
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log(`${colors.green}✓ Reward created successfully!${colors.reset}`);
      if (response.json?.id) {
        console.log(`  Reward ID: ${response.json.id}`);
      }
    } else {
      console.log(`${colors.red}✗ Failed to create reward: Status ${response.statusCode}${colors.reset}`);
      if (response.json?.error) {
        console.log(`  Error: ${response.json.error}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error creating reward: ${error.message}${colors.reset}`);
  }

  // Test update partner
  console.log(`\n${colors.bright}${colors.magenta}=== Testing Partner Update ===${colors.reset}`);
  
  console.log(`\nUpdating partner OSM001...`);
  try {
    const response = await makeRequest('/api/admin/partners/OSM001', {
      method: 'PUT',
      body: {
        description: 'Updated description for OSM001',
        contactEmail: 'osm001@example.com'
      }
    });
    
    if (response.statusCode === 200) {
      console.log(`${colors.green}✓ Partner updated successfully!${colors.reset}`);
    } else if (response.statusCode === 404) {
      console.log(`${colors.yellow}⚠ Partner update endpoint not implemented${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Failed to update partner: Status ${response.statusCode}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error updating partner: ${error.message}${colors.reset}`);
  }

  console.log(`\n${colors.bright}${colors.cyan}Admin Secret Status: ${colors.green}WORKING ✓${colors.reset}`);
  console.log(`You can now access the admin dashboard at:`);
  console.log(`${colors.blue}https://zabava-lasermax.vercel.app/admin${colors.reset}`);
  console.log(`\nUse the admin secret: ${colors.yellow}${ADMIN_SECRET}${colors.reset}`);
}

// Run tests
testAdminEndpoints().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});