#!/bin/bash

# Test script for Bonus/Rewards endpoints
BASE_URL="https://zabava-server.vercel.app"
ADMIN_SECRET="your-admin-secret-here" # Replace with actual admin secret

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Testing Bonus/Rewards API Endpoints${NC}"
echo -e "${BLUE}====================================${NC}"

# Test 1: User Points (GET) - with CORS preflight
echo -e "\n${YELLOW}1. Testing User Points Endpoint (CORS Preflight)${NC}"
echo "Testing OPTIONS request first..."
curl -X OPTIONS "$BASE_URL/api/bonus/user-points" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"

echo -e "\n${YELLOW}Testing actual GET request...${NC}"
curl -X GET "$BASE_URL/api/bonus/user-points?email=test@example.com" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | python3 -m json.tool 2>/dev/null || echo "Response received"

# Test 2: Redeem Reward (POST) - with CORS preflight
echo -e "\n${YELLOW}2. Testing Redeem Reward Endpoint (CORS Preflight)${NC}"
echo "Testing OPTIONS request first..."
curl -X OPTIONS "$BASE_URL/api/bonus/redeem-reward" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"

echo -e "\n${YELLOW}Testing actual POST request...${NC}"
curl -X POST "$BASE_URL/api/bonus/redeem-reward" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","rewardId":"test-reward"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | python3 -m json.tool 2>/dev/null || echo "Response received"

# Test 3: Admin Get Rewards (GET) - with CORS preflight
echo -e "\n${YELLOW}3. Testing Admin Get Rewards (CORS Preflight)${NC}"
echo "Testing OPTIONS request first..."
curl -X OPTIONS "$BASE_URL/api/admin/rewards" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,x-admin-secret" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"

echo -e "\n${YELLOW}Testing actual GET request...${NC}"
curl -X GET "$BASE_URL/api/admin/rewards" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | python3 -m json.tool 2>/dev/null || echo "Response received"

# Test 4: Admin Create Reward (POST)
echo -e "\n${YELLOW}4. Testing Admin Create Reward${NC}"
curl -X POST "$BASE_URL/api/admin/rewards" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{
    "name": "Test Reward",
    "description": "A test reward for 100 points",
    "pointsCost": 100,
    "category": "discount",
    "availableFor": []
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | python3 -m json.tool 2>/dev/null || echo "Response received"

# Test 5: Test existing endpoints still work
echo -e "\n${YELLOW}5. Testing Existing Endpoints (Sanity Check)${NC}"
echo "Testing root endpoint..."
curl -X GET "$BASE_URL/api/" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n${YELLOW}Testing register endpoint CORS...${NC}"
curl -X OPTIONS "$BASE_URL/api/register" \
  -H "Origin: https://zabava-lasermax.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"

echo -e "\n${GREEN}====================================${NC}"
echo -e "${GREEN}Test Complete!${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "\n${BLUE}Note:${NC} Check for 'Access-Control-Allow-Origin' headers in responses."
echo "If missing, CORS is not properly configured for these endpoints."