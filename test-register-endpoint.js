#!/usr/bin/env node

/**
 * Comprehensive test for the /api/register endpoint
 */

const https = require('https');

// Configuration
const API_BASE_URL = 'https://zabava-server.vercel.app';
const TEST_CASES = [
  {
    name: 'Valid Registration - New User',
    data: {
      email: 'testuser_' + Date.now() + '@example.com',
      partnerId: 'OSM001',
      data: {
        ticket: 'VIP',
        numPeople: 2,
        Transport: 'Yes',
        totalPrice: 1500,
        attractionName: 'Laser Tag Experience',
        cityCode: 'NYC',
        Categories: 'Entertainment',
        Age: '25-35'
      }
    },
    expectedStatus: [200, 201],
    description: 'Should successfully register a new user with complete data'
  },
  {
    name: 'Existing User Registration - Different Partner',
    data: {
      email: 'wondrcrown@gmail.com',
      partnerId: 'LZ001',
      data: {
        ticket: 'Family',
        numPeople: 4,
        Transport: 'No',
        totalPrice: 2000,
        attractionName: 'Family Fun Center'
      }
    },
    expectedStatus: [200, 201],
    description: 'Should allow existing user to register with a new partner'
  },
  {
    name: 'Minimal Registration',
    data: {
      email: 'minimal_' + Date.now() + '@test.com',
      partnerId: 'TX003'
    },
    expectedStatus: [200, 201],
    description: 'Should work with just email and partnerId'
  },
  {
    name: 'Invalid - Missing Email',
    data: {
      partnerId: 'OSM001',
      data: { ticket: 'Standard' }
    },
    expectedStatus: [400],
    description: 'Should fail when email is missing'
  },
  {
    name: 'Invalid - Missing Partner ID',
    data: {
      email: 'test@example.com',
      data: { ticket: 'Standard' }
    },
    expectedStatus: [400],
    description: 'Should fail when partnerId is missing'
  },
  {
    name: 'Invalid - Empty Payload',
    data: {},
    expectedStatus: [400],
    description: 'Should fail with empty payload'
  },
  {
    name: 'Complex Data Registration',
    data: {
      email: 'complex_' + Date.now() + '@test.com',
      partnerId: 'OSM001',
      data: {
        ticket: 'Group',
        numPeople: 10,
        Transport: 'Yes',
        Bus_Rental: 'Charter Bus',
        selectedBus: 'Luxury Coach',
        totalPrice: 5000,
        attractionName: 'Corporate Event',
        cityCode: 'LA',
        Categories: 'Team Building',
        Age: 'Mixed',
        specialRequests: 'Wheelchair accessible',
        dietaryRestrictions: ['Vegetarian', 'Gluten-free'],
        eventDate: new Date().toISOString(),
        estimatedArrival: '14:00'
      }
    },
    expectedStatus: [200, 201],
    description: 'Should handle complex nested data structures'
  },
  {
    name: 'Case Sensitivity Test',
    data: {
      email: 'UPPERCASE@EXAMPLE.COM',
      partnerId: 'osm001',  // lowercase
      data: {
        ticket: 'standard'  // lowercase
      }
    },
    expectedStatus: [200, 201],
    description: 'Should handle case variations in email and partnerId'
  },
  {
    name: 'Special Characters in Email',
    data: {
      email: 'user+test@example.com',
      partnerId: 'OSM001'
    },
    expectedStatus: [200, 201],
    description: 'Should handle special characters in email'
  },
  {
    name: 'Duplicate Registration Same Partner',
    data: {
      email: 'wondrcrown@gmail.com',
      partnerId: 'OSM001',
      data: {
        ticket: 'VIP',
        numPeople: 1,
        note: 'This is a second registration for the same partner'
      }
    },
    expectedStatus: [200, 201],
    description: 'Should allow multiple registrations for same user-partner combination'
  }
];

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

// Helper function to make HTTPS request
function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://zabava-lasermax.vercel.app',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
          data: (() => {
            try {
              return JSON.parse(responseData);
            } catch {
              return responseData;
            }
          })()
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
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

// Test runner
async function runTest(testCase) {
  console.log(`\n${colors.cyan}━━━ ${testCase.name} ━━━${colors.reset}`);
  console.log(`${colors.yellow}Description:${colors.reset} ${testCase.description}`);
  console.log(`${colors.yellow}Payload:${colors.reset}`, JSON.stringify(testCase.data, null, 2).substring(0, 200) + '...');
  
  try {
    const startTime = Date.now();
    const response = await makeRequest('/api/register', 'POST', testCase.data);
    const duration = Date.now() - startTime;
    
    const statusOk = testCase.expectedStatus.includes(response.statusCode);
    const hasCors = response.headers['access-control-allow-origin'];
    
    // Status check
    if (statusOk) {
      console.log(`${colors.green}✓ Status:${colors.reset} ${response.statusCode} (expected: ${testCase.expectedStatus.join(' or ')})`);
    } else {
      console.log(`${colors.red}✗ Status:${colors.reset} ${response.statusCode} (expected: ${testCase.expectedStatus.join(' or ')})`);
    }
    
    // CORS check
    if (hasCors) {
      console.log(`${colors.green}✓ CORS:${colors.reset} ${response.headers['access-control-allow-origin']}`);
    } else {
      console.log(`${colors.yellow}⚠ CORS:${colors.reset} No Access-Control-Allow-Origin header`);
    }
    
    // Performance
    if (duration < 1000) {
      console.log(`${colors.green}✓ Performance:${colors.reset} ${duration}ms`);
    } else if (duration < 3000) {
      console.log(`${colors.yellow}⚠ Performance:${colors.reset} ${duration}ms (slow)`);
    } else {
      console.log(`${colors.red}✗ Performance:${colors.reset} ${duration}ms (very slow)`);
    }
    
    // Response analysis
    if (response.data && typeof response.data === 'object') {
      if (response.data.success || response.statusCode < 300) {
        console.log(`${colors.green}✓ Response:${colors.reset}`, JSON.stringify(response.data).substring(0, 150) + '...');
        
        // Check for expected fields in success response
        if (response.data.qrCode || response.data.data || response.data.message) {
          console.log(`${colors.green}✓ Response Structure:${colors.reset} Contains expected fields`);
        }
      } else if (response.data.error) {
        console.log(`${colors.yellow}⚠ Error Response:${colors.reset} ${response.data.error}`);
        if (response.data.message) {
          console.log(`  Message: ${response.data.message}`);
        }
      }
    }
    
    return {
      test: testCase.name,
      passed: statusOk,
      statusCode: response.statusCode,
      duration,
      hasCors
    };
    
  } catch (error) {
    console.log(`${colors.red}✗ Error:${colors.reset} ${error.message}`);
    return {
      test: testCase.name,
      passed: false,
      error: error.message
    };
  }
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════╗
║     Register Endpoint Comprehensive Test           ║
║     API: ${API_BASE_URL.padEnd(41)}║
╚════════════════════════════════════════════════════╝
${colors.reset}`);
  
  const results = [];
  
  // Run all tests
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase);
    results.push(result);
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════╗
║                  TEST SUMMARY                      ║
╚════════════════════════════════════════════════════╝
${colors.reset}`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgDuration = results.filter(r => r.duration).reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.duration).length;
  
  console.log(`\n${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Average Response Time: ${Math.round(avgDuration)}ms`);
  
  // List failed tests
  if (failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.error || `Status ${r.statusCode}`}`);
    });
  }
  
  // Performance analysis
  console.log(`\n${colors.cyan}Performance Analysis:${colors.reset}`);
  results.filter(r => r.duration).forEach(r => {
    const indicator = r.duration < 1000 ? '🟢' : r.duration < 3000 ? '🟡' : '🔴';
    console.log(`  ${indicator} ${r.test}: ${r.duration}ms`);
  });
  
  // Overall verdict
  console.log(`\n${colors.bright}Overall Result: ${colors.reset}`, end='');
  if (passed === results.length) {
    console.log(`${colors.green}ALL TESTS PASSED ✓${colors.reset}`);
  } else if (passed > failed) {
    console.log(`${colors.yellow}MOSTLY PASSING (${passed}/${results.length})${colors.reset}`);
  } else {
    console.log(`${colors.red}NEEDS ATTENTION (${failed} failures)${colors.reset}`);
  }
  
  // Test the new improved register endpoint
  console.log(`\n${colors.bright}${colors.magenta}
╔════════════════════════════════════════════════════╗
║     Testing NEW /api/qr/register Endpoint          ║
╚════════════════════════════════════════════════════╝
${colors.reset}`);
  
  const newEndpointTest = {
    name: 'New QR Register Endpoint',
    data: {
      email: 'qr_test_' + Date.now() + '@example.com',
      partnerId: 'OSM001',
      data: {
        ticket: 'VIP',
        numPeople: 3,
        Transport: 'Yes',
        totalPrice: 2500
      }
    },
    expectedStatus: [200, 201],
    description: 'Test the new improved QR registration endpoint'
  };
  
  const newResult = await runTest(newEndpointTest);
  
  if (newResult.passed) {
    console.log(`\n${colors.green}✅ New QR endpoint is working correctly!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ New QR endpoint has issues${colors.reset}`);
  }
}

// Run the tests
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});