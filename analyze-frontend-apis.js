#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const frontendDir = '/Users/wondr/Downloads/DEV NEW/ZABAVA_CODEBASE/zabava_frontend/zabava-lasermax/src';
const apiCalls = new Map();

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

function extractApiCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.relative(frontendDir, filePath);
  
  // Patterns to match API calls
  const patterns = [
    // fetch() calls with strings
    /fetch\s*\(\s*[`'"](.*?)[`'"]/g,
    // fetch() calls with template literals
    /fetch\s*\(\s*`([^`]*)`/g,
    // axios calls
    /axios\.[a-z]+\s*\(\s*[`'"](.*?)[`'"]/g,
    // API path references
    /[`'"]\/api\/([^`'"]+)[`'"]/g,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const apiPath = match[1] || match[0];
      
      // Clean up the path
      let cleanPath = apiPath;
      if (cleanPath.includes('${')) {
        // It's a template literal with variables
        cleanPath = cleanPath.replace(/\$\{[^}]+\}/g, ':variable');
      }
      
      // Extract just the API path
      if (cleanPath.includes('/api/')) {
        cleanPath = '/api/' + cleanPath.split('/api/')[1];
      } else if (!cleanPath.startsWith('/api/')) {
        cleanPath = '/api/' + cleanPath;
      }
      
      // Remove query parameters for grouping
      const pathWithoutQuery = cleanPath.split('?')[0];
      
      if (!apiCalls.has(pathWithoutQuery)) {
        apiCalls.set(pathWithoutQuery, []);
      }
      
      apiCalls.get(pathWithoutQuery).push({
        file: fileName,
        line: content.substring(0, match.index).split('\n').length,
        fullMatch: match[0]
      });
    }
  });
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js'))) {
      extractApiCalls(fullPath);
    }
  });
}

// Main execution
console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════╗
║     Frontend API Usage Analysis                    ║
╚════════════════════════════════════════════════════╝
${colors.reset}`);

console.log('Scanning frontend directory...\n');
scanDirectory(frontendDir);

// Sort and display results
const sortedApis = Array.from(apiCalls.entries()).sort((a, b) => a[0].localeCompare(b[0]));

console.log(`${colors.bright}${colors.cyan}Found ${sortedApis.length} unique API endpoints:${colors.reset}\n`);

// Group by category
const categories = {
  auth: [],
  bonus: [],
  admin: [],
  partner: [],
  qr: [],
  other: []
};

sortedApis.forEach(([apiPath, usages]) => {
  if (apiPath.includes('/auth/')) {
    categories.auth.push([apiPath, usages]);
  } else if (apiPath.includes('/bonus/')) {
    categories.bonus.push([apiPath, usages]);
  } else if (apiPath.includes('/admin/')) {
    categories.admin.push([apiPath, usages]);
  } else if (apiPath.includes('/partner/')) {
    categories.partner.push([apiPath, usages]);
  } else if (apiPath.includes('/qr/')) {
    categories.qr.push([apiPath, usages]);
  } else {
    categories.other.push([apiPath, usages]);
  }
});

// Display by category
Object.entries(categories).forEach(([category, endpoints]) => {
  if (endpoints.length > 0) {
    console.log(`\n${colors.bright}${colors.magenta}=== ${category.toUpperCase()} ENDPOINTS ===${colors.reset}`);
    
    endpoints.forEach(([apiPath, usages]) => {
      console.log(`\n${colors.green}${apiPath}${colors.reset}`);
      console.log(`  Used in ${usages.length} location(s):`);
      
      // Show first few usages
      usages.slice(0, 3).forEach(usage => {
        console.log(`    - ${usage.file}:${usage.line}`);
      });
      
      if (usages.length > 3) {
        console.log(`    ... and ${usages.length - 3} more`);
      }
    });
  }
});

// Summary
console.log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════╗
║                    SUMMARY                         ║
╚════════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`\nTotal API endpoints used: ${colors.cyan}${sortedApis.length}${colors.reset}`);
console.log(`Auth endpoints: ${colors.yellow}${categories.auth.length}${colors.reset}`);
console.log(`Bonus endpoints: ${colors.yellow}${categories.bonus.length}${colors.reset}`);
console.log(`Admin endpoints: ${colors.yellow}${categories.admin.length}${colors.reset}`);
console.log(`Partner endpoints: ${colors.yellow}${categories.partner.length}${colors.reset}`);
console.log(`QR endpoints: ${colors.yellow}${categories.qr.length}${colors.reset}`);
console.log(`Other endpoints: ${colors.yellow}${categories.other.length}${colors.reset}`);

// Export to JSON for further analysis
const outputPath = '/Users/wondr/Downloads/DEV NEW/ZABAVA_CODEBASE/frontend-api-usage.json';
const exportData = {
  timestamp: new Date().toISOString(),
  totalEndpoints: sortedApis.length,
  endpoints: sortedApis.map(([path, usages]) => ({
    path,
    usageCount: usages.length,
    usages: usages.map(u => ({
      file: u.file,
      line: u.line
    }))
  }))
};

fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
console.log(`\n${colors.green}✓ API usage data exported to: ${outputPath}${colors.reset}`);