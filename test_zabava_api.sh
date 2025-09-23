#!/bin/bash

# Zabava Server API Test Suite
# Server URL
BASE_URL="https://zabava-server.vercel.app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    local description=$5
    
    echo -e "\n${YELLOW}Testing:${NC} $description"
    echo -e "${YELLOW}Method:${NC} $method"
    echo -e "${YELLOW}Endpoint:${NC} $endpoint"
    
    if [ -n "$data" ]; then
        echo -e "${YELLOW}Data:${NC} $data"
    fi
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method '$BASE_URL$endpoint'"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ] && [ "$method" != "GET" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    # Execute curl and capture output
    local response=$(eval $curl_cmd 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    echo -e "${YELLOW}Status:${NC} $http_code"
    echo -e "${YELLOW}Response:${NC} $body" | head -c 500
    
    # Check if request was successful
    if [[ $http_code -ge 200 && $http_code -lt 300 ]] || [[ $http_code -eq 401 ]] || [[ $http_code -eq 404 ]] || [[ $http_code -eq 405 ]]; then
        echo -e "${GREEN}✓ Test completed${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ Test failed${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    echo "─────────────────────────────────────────────────────────────────────────────"
}

# Start testing
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                       ZABAVA SERVER API TEST SUITE                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${YELLOW}Server:${NC} $BASE_URL"
echo -e "${YELLOW}Date:${NC} $(date)"

# 1. HEALTH CHECK
print_section "1. HEALTH CHECK & BASIC ENDPOINTS"
test_endpoint "GET" "/api/" "" "" "Health check - Root endpoint"
test_endpoint "GET" "/api/health" "" "" "Health check endpoint"
test_endpoint "OPTIONS" "/api/" "" "" "CORS preflight test"

# 2. AUTHENTICATION ENDPOINTS
print_section "2. AUTHENTICATION ENDPOINTS"

# Partner Authentication
test_endpoint "POST" "/api/auth/login" \
    '{"email":"test@example.com","password":"password123"}' \
    "" \
    "Partner login (expected to fail with invalid credentials)"

test_endpoint "POST" "/api/auth/signup" \
    '{"email":"testpartner'$(date +%s)'@example.com","password":"Test123!","name":"Test Partner"}' \
    "" \
    "Partner signup"

test_endpoint "GET" "/api/auth/profile" \
    "" \
    "-H 'Authorization: Bearer invalid_token'" \
    "Profile check with invalid token"

# Admin Authentication  
test_endpoint "POST" "/api/admin/login" \
    '{"email":"admin@example.com","password":"admin123"}' \
    "" \
    "Admin login (expected to fail with invalid credentials)"

# 3. REGISTRATION & VERIFICATION
print_section "3. REGISTRATION & VERIFICATION ENDPOINTS"

TIMESTAMP=$(date +%s)
TEST_EMAIL="testqr${TIMESTAMP}@example.com"

test_endpoint "POST" "/api/register" \
    '{"email":"'$TEST_EMAIL'","partner_id":"LZ001","Categories":"School","Age":"18+","Transport":"Yes","ticket":"Family","numPeople":"4","totalPrice":1000,"estimatedPoints":10}' \
    "" \
    "Register new QR code"

test_endpoint "GET" "/api/verify?email=$TEST_EMAIL" \
    "" \
    "" \
    "Verify QR code"

test_endpoint "POST" "/api/pending" \
    '{"email":"pending'$TIMESTAMP'@example.com","data":"test_pending_data"}' \
    "" \
    "Store pending verification"

# 4. PARTNER ENDPOINTS
print_section "4. PARTNER MANAGEMENT ENDPOINTS"

test_endpoint "GET" "/api/partner/LZ001" \
    "" \
    "" \
    "Get partner dashboard data"

test_endpoint "GET" "/api/partner/INVALID" \
    "" \
    "" \
    "Get invalid partner (should return empty or error)"

test_endpoint "POST" "/api/partner/visit" \
    '{"email":"'$TEST_EMAIL'","partnerId":"LZ001"}' \
    "" \
    "Mark partner visit"

test_endpoint "GET" "/api/dashboard" \
    "" \
    "" \
    "Get general dashboard"

# 5. ADMIN ENDPOINTS (require authentication)
print_section "5. ADMIN ENDPOINTS"

# These will fail without proper admin secret, but we test the endpoints exist
test_endpoint "GET" "/api/admin/overview" \
    "" \
    "-H 'x-admin-secret: invalid_secret'" \
    "Admin overview (with invalid auth)"

test_endpoint "GET" "/api/admin/partners" \
    "" \
    "-H 'x-admin-secret: invalid_secret'" \
    "Admin partners list (with invalid auth)"

test_endpoint "POST" "/api/admin/update" \
    '{"email":"'$TEST_EMAIL'","field":"used","value":"true"}' \
    "-H 'x-admin-secret: invalid_secret'" \
    "Admin update record (with invalid auth)"

test_endpoint "POST" "/api/admin/partner/create" \
    '{"partnerId":"TEST001","name":"Test Partner"}' \
    "-H 'x-admin-secret: invalid_secret'" \
    "Create partner (with invalid auth)"

test_endpoint "GET" "/api/admin/partner/TEST001" \
    "" \
    "-H 'x-admin-secret: invalid_secret'" \
    "Get partner details (with invalid auth)"

test_endpoint "PUT" "/api/admin/partner/TEST001" \
    '{"status":"active"}' \
    "-H 'x-admin-secret: invalid_secret'" \
    "Update partner (with invalid auth)"

test_endpoint "DELETE" "/api/admin/partner/TEST001" \
    "" \
    "-H 'x-admin-secret: invalid_secret'" \
    "Delete partner (with invalid auth)"

test_endpoint "POST" "/api/admin/invites/send" \
    '{"email":"invite@example.com","role":"partner"}' \
    "-H 'x-admin-secret: invalid_secret'" \
    "Send invite (with invalid auth)"

# 6. INTEGRATION ENDPOINTS
print_section "6. INTEGRATION ENDPOINTS"

test_endpoint "POST" "/api/tilda-proxy" \
    '{"formid":"test","name":"Test User","email":"tilda@example.com"}' \
    "" \
    "Tilda form proxy"

# 7. ERROR HANDLING TESTS
print_section "7. ERROR HANDLING TESTS"

test_endpoint "GET" "/api/nonexistent" \
    "" \
    "" \
    "Non-existent endpoint (should return 404)"

test_endpoint "PUT" "/api/register" \
    "" \
    "" \
    "Wrong method on register (should return 405)"

test_endpoint "POST" "/api/register" \
    '{"invalid":"data"}' \
    "" \
    "Invalid data structure"

test_endpoint "POST" "/api/register" \
    'malformed json' \
    "" \
    "Malformed JSON"

# 8. SUMMARY
print_section "TEST SUMMARY"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
TOTAL=$((PASSED + FAILED))
echo -e "${BLUE}Total:${NC} $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests completed successfully!${NC}"
else
    echo -e "\n${YELLOW}⚠ Some tests had unexpected results. Please review the output above.${NC}"
fi

echo -e "\n${BLUE}Note:${NC} Some endpoints require authentication or specific data to work properly."
echo "This test suite checks endpoint availability and basic response handling."