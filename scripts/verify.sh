#!/bin/bash
set -e

echo "=== The Leaf: verify ==="
echo ""

echo "1) Type check (project code)..."
npx tsc --noEmit 2>&1 | grep -v "server/replit_integrations/" | grep -v "^$" > /tmp/tsc_errors.txt || true
ERROR_COUNT=$(grep -c "error TS" /tmp/tsc_errors.txt 2>/dev/null || true)
ERROR_COUNT=${ERROR_COUNT:-0}
if [ "$ERROR_COUNT" -gt 0 ]; then
  cat /tmp/tsc_errors.txt
  echo "   ✗ $ERROR_COUNT type error(s) found"
  exit 1
fi
echo "   ✓ Types OK"
echo ""

echo "2) Navigation guard check..."
VIOLATIONS=0

NAV_FILES="client/src/components/app-layout.tsx"
for f in $NAV_FILES; do
  if [ -f "$f" ]; then
    if grep -qE "from ['\"]wouter['\"]" "$f" 2>/dev/null; then
      if ! grep -q "safeNavigate" "$f" 2>/dev/null; then
        echo "   ⚠ WARNING: $f imports wouter directly without safeNavigate"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    fi
  fi
done

if grep -qE '<Link\b' client/src/components/app-layout.tsx 2>/dev/null; then
  echo "   ⚠ WARNING: app-layout.tsx uses <Link> — nav should use safeNavigate buttons"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "   ✓ Navigation patterns OK"
else
  echo "   $VIOLATIONS warning(s) found (non-blocking)"
fi
echo ""

echo "3) Unit tests..."
npm run test
echo ""

echo "=== verify complete ==="
