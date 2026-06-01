#!/bin/bash
# Pre-demo checklist — run before presenting to the committee
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS=$((ERRORS+1)); }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

ERRORS=0
API_URL="${VITE_API_URL:-http://localhost:3001}"

echo ""
echo "═══════════════════════════════════════"
echo "  Sweet Loyalty — Pre-Demo Checklist"
echo "═══════════════════════════════════════"
echo ""

# 1. Backend health
echo "1. Backend Health"
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
  ok "Backend is healthy at ${API_URL}"
else
  fail "Backend not reachable at ${API_URL}"
fi

# 2. Database
echo "2. Database"
cd "$(dirname "$0")/../backend"
if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
  ok "PostgreSQL connected"
else
  fail "PostgreSQL not reachable"
fi

# 3. Partners count
PARTNER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Partner\"" 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ "${PARTNER_COUNT:-0}" -ge 5 ]; then
  ok "${PARTNER_COUNT} partners in database"
else
  warn "Only ${PARTNER_COUNT:-0} partners — run: npm run db:seed:demo"
fi

# 4. TON Testnet API
echo "3. TON Testnet"
if curl -sf "https://testnet.tonapi.io/v2/status" > /dev/null 2>&1; then
  ok "TON Testnet API reachable"
else
  warn "TON Testnet API slow or unreachable"
fi

# 5. Frontend build
echo "4. Frontend"
cd "$(dirname "$0")/../frontend"
if npx tsc --noEmit > /dev/null 2>&1; then
  ok "TypeScript compiles without errors"
else
  fail "TypeScript compilation errors found"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}All checks passed! Ready for demo.${NC}"
else
  echo -e "${RED}${ERRORS} check(s) failed. Fix before demo.${NC}"
fi
echo ""
