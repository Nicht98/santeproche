#!/bin/bash
# ============================================================
# SanteProche Facility + Booking API Test Suite
# Tests: facilities listing, detail, slots, and booking flow
# ============================================================

set -e

API_BASE="${API_BASE:-http://localhost:3000/api/v1}"

echo "=============================================="
echo "🏥 Facility + Booking API Test Suite"
echo "API_BASE: $API_BASE"
echo "=============================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${YELLOW}ℹ️  INFO${NC}: $1"; }

TOTAL_PASSES=0
TOTAL_TESTS=0

check() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if eval "$2"; then
    pass "$1"
    TOTAL_PASSES=$((TOTAL_PASSES + 1))
  else
    fail "$1"
  fi
}

# ============================================================
# 1. LIST FACILITIES
# ============================================================
echo ""
echo "→ Step 1: GET /facilities (list all)"
FACILITIES=$(curl -s "$API_BASE/facilities?limit=10")
echo "Response: $FACILITIES"

check "Facilities list returns data array" 'echo "$FACILITIES" | grep -q "data"
check "At least 1 facility seeded" 'echo "$FACILITIES" | grep -q "id"

# Extract first facility ID
FIRST_FACILITY_ID=$(echo "$FACILITIES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
info "First facility ID: $FIRST_FACILITY_ID"

# ============================================================
# 2. FILTER BY KIND
# ============================================================
echo ""
echo "→ Step 2: GET /facilities?kind=pharmacy"
PHARMS=$(curl -s "$API_BASE/facilities?kind=pharmacy")
echo "Response: $PHARMS"

check "Pharmacy filter works" 'echo "$PHARMS" | grep -q "pharmacy"

# ============================================================
# 3. SEARCH BY NAME
# ============================================================
echo ""
echo "→ Step 3: GET /facilities?search=Bonapriso"
SEARCH=$(curl -s "$API_BASE/facilities?search=Bonapriso")
echo "Response: $SEARCH"

check "Search by name works" 'echo "$SEARCH" | grep -q "Bonapriso"

# ============================================================
# 4. FILTER BY CITY
# ============================================================
echo ""
echo "→ Step 4: GET /facilities?cityId=1 (Douala)"
DOUALA=$(curl -s "$API_BASE/facilities?cityId=1")
echo "Response: $DOUALA"

check "City filter works" 'echo "$DOUALA" | grep -q "Douala\|Bonapriso\|Akwa"

# ============================================================
# 5. GET FACILITY DETAIL
# ============================================================
echo ""
echo "→ Step 5: GET /facilities/$FIRST_FACILITY_ID"
DETAIL=$(curl -s "$API_BASE/facilities/$FIRST_FACILITY_ID")
echo "Response: $DETAIL"

check "Facility detail has name" 'echo "$DETAIL" | grep -q "name"
check "Facility detail has cityName" 'echo "$DETAIL" | grep -q "cityName"
check "Facility detail has providers array" 'echo "$DETAIL" | grep -q "providers"

# ============================================================
# 6. GET AVAILABLE SLOTS
# ============================================================
echo ""
echo "→ Step 6: GET /facilities/$FIRST_FACILITY_ID/available-slots?date=2026-05-25"
SLOTS=$(curl -s "$API_BASE/facilities/$FIRST_FACILITY_ID/available-slots?date=2026-05-25")
echo "Response: $SLOTS"

check "Slots endpoint returns" 'echo "$SLOTS" | grep -q "slots"

# ============================================================
# 7. GET SLOTS WITH INVALID DATE
# ============================================================
echo ""
echo "→ Step 7: GET /facilities/$FIRST_FACILITY_ID/available-slots?date=invalid"
INVALID_SLOTS=$(curl -s "$API_BASE/facilities/$FIRST_FACILITY_ID/available-slots?date=invalid")
echo "Response: $INVALID_SLOTS"

check "Invalid date returns error" 'echo "$INVALID_SLOTS" | grep -q "INVALID_DATE"

# ============================================================
# 8. ADMIN HEALTH CHECK
# ============================================================
echo ""
echo "→ Step 8: GET /admin/health/db"
ADMIN_HEALTH=$(curl -s "$API_BASE/admin/health/db" -H "x-admin-secret: dev-admin-secret")
echo "Response: $ADMIN_HEALTH"

check "Admin health shows facilities" 'echo "$ADMIN_HEALTH" | grep -q "userCount"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "=============================================="
if [ $TOTAL_PASSES -eq $TOTAL_TESTS ]; then
  echo -e "${GREEN}🎉 ALL $TOTAL_TESTS TESTS PASSED!${NC}"
else
  echo -e "${RED}⚠️  $TOTAL_PASSES/$TOTAL_TESTS tests passed${NC}"
fi
echo "=============================================="

# ============================================================
# PATIENT BOOKING FLOW (requires auth)
# ============================================================
echo ""
echo "---"
echo "To test the booking flow (POST /appointments), you need a patient token."
echo "Run these steps manually:"
echo ""
echo "1. Request OTP:"
echo "   curl -X POST $API_BASE/auth/otp/request -H 'Content-Type: application/json' -d '{\"phone\":\"+237123456799\"}'"
echo ""
echo "2. Verify OTP (use code from logs):"
echo "   curl -X POST $API_BASE/auth/otp/verify -H 'Content-Type: application/json' -d '{\"phone\":\"+237123456799\",\"code\":\"XXXXXX\"}'"
echo ""
echo "3. Register patient:"
echo "   curl -X POST $API_BASE/patients/register -H 'Content-Type: application/json' -H 'Authorization: Bearer <TOKEN>' -d '{\"firstName\":\"Test\",\"lastName\":\"User\",\"gender\":\"male\"}'"
echo ""
echo "4. Book appointment:"
echo "   curl -X POST $API_BASE/appointments -H 'Content-Type: application/json' -H 'Authorization: Bearer <TOKEN>' -d '{\"providerId\":\"550e8400-e29b-41d4-a716-446655440000\",\"facilityId\":\"$FIRST_FACILITY_ID\",\"scheduledAt\":\"2026-05-25T10:00:00Z\",\"reason\":\"Consultation\"}'"
echo ""
echo "5. List my appointments:"
echo "   curl $API_BASE/appointments/me -H 'Authorization: Bearer <TOKEN>'"
echo ""
