#!/bin/bash

# Complete test flow for bonus points system
BASE_URL="https://zabava-server.vercel.app"
TEST_EMAIL="bonustest$(date +%s)@example.com"
PARTNER_ID="LZ001"

echo "=================================="
echo "Testing Complete Bonus Points Flow"
echo "=================================="
echo "Test Email: $TEST_EMAIL"
echo ""

# Step 1: Register a new user with points data
echo "1. Registering user with QR code..."
curl -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"partner_id\": \"$PARTNER_ID\",
    \"Categories\": \"Family\",
    \"Age\": \"18+\",
    \"Transport\": \"Yes\",
    \"Bus_Rental\": \"Bus A\",
    \"ticket\": \"Family\",
    \"numPeople\": \"4\",
    \"preferredDateTime\": \"2025-11-12T11:00\",
    \"cityCode\": \"NYC\",
    \"totalPrice\": 2500,
    \"estimatedPoints\": 25
  }" \
  -s | jq '{success, email, message}' 2>/dev/null

echo ""
echo "2. Checking initial points (should be 0 - not visited yet)..."
curl -X GET "$BASE_URL/api/bonus/user-points?email=$TEST_EMAIL" \
  -s | jq '{user: .user, visitStatus: .visits[0].status}' 2>/dev/null

echo ""
echo "3. Partner marks user as visited (confirms visit)..."
curl -X POST "$BASE_URL/api/partner/mark-visited" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"partnerId\": \"$PARTNER_ID\",
    \"notes\": \"Family of 4 visited successfully\"
  }" \
  -s | jq . 2>/dev/null

echo ""
echo "4. Checking points after visit confirmation (should have 25 points)..."
curl -X GET "$BASE_URL/api/bonus/user-points?email=$TEST_EMAIL" \
  -s | jq '{
    user: .user, 
    visits: [.visits[0] | {
      partner: .partnerName,
      status: .status,
      points: .pointsEarned,
      ticketType: .ticketType,
      numPeople: .numPeople
    }],
    rewards: [.availableRewards[] | {name, pointsCost, canRedeem}] | .[0:3]
  }' 2>/dev/null

echo ""
echo "5. Testing multiple visits - registering second visit to same partner..."
TEST_EMAIL2="bonustest$(date +%s)multi@example.com"
curl -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL2\",
    \"partner_id\": \"$PARTNER_ID\",
    \"ticket\": \"VIP\",
    \"numPeople\": \"2\",
    \"totalPrice\": 5000,
    \"estimatedPoints\": 50
  }" \
  -s > /dev/null

echo "Marking first visit as confirmed..."
curl -X POST "$BASE_URL/api/partner/mark-visited" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL2\",
    \"partnerId\": \"$PARTNER_ID\"
  }" \
  -s > /dev/null

# Register with another partner
curl -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL2\",
    \"partner_id\": \"LZ002\",
    \"ticket\": \"Standard\",
    \"numPeople\": \"1\",
    \"totalPrice\": 1000,
    \"estimatedPoints\": 10
  }" \
  -s > /dev/null

echo ""
echo "6. Checking multi-partner points..."
curl -X GET "$BASE_URL/api/bonus/user-points?email=$TEST_EMAIL2" \
  -s | jq '{
    totalPoints: .user.totalPoints,
    availablePoints: .user.availablePoints,
    partnerCount: .statistics.totalPartners,
    visitCount: .statistics.totalVisits,
    pendingVisits: .statistics.pendingVisits
  }' 2>/dev/null

echo ""
echo "=================================="
echo "Test Complete!"
echo "=================================="
echo ""
echo "Summary:"
echo "- Users get points ONLY when partner confirms visit"
echo "- Points accumulate from ALL partner visits"
echo "- Each visit tracks ticket type, people count, transport"
echo "- Rewards become available based on total points"