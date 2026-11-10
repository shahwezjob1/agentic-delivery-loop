#!/usr/bin/env bash
# Wipes ALL remote application data: D1 rows and the Vectorize index. Run from the repo root.
#   bash scripts/delete-all.sh
set -euo pipefail

echo "1/4 Deleting D1 rows (requests reference tickets, so delete requests first)..."
pnpm exec wrangler d1 execute adl-sql-db --remote --config apps/domain-api-worker/wrangler.jsonc --command "DELETE FROM feature_requests; DELETE FROM po_logs; DELETE FROM tickets;"

echo "2/4 Verifying D1 tables are empty..."
pnpm exec wrangler d1 execute adl-sql-db --remote --config apps/domain-api-worker/wrangler.jsonc --command "SELECT (SELECT COUNT(*) FROM feature_requests) AS requests, (SELECT COUNT(*) FROM tickets) AS tickets, (SELECT COUNT(*) FROM po_logs) AS po_logs;"

echo "3/4 Deleting Vectorize index adl-vector-db..."
pnpm exec wrangler vectorize delete adl-vector-db --force

echo "4/4 Recreating Vectorize index (768 dimensions, cosine)..."
pnpm exec wrangler vectorize create adl-vector-db --dimensions 768 --metric cosine

echo "Done. Wait a few seconds before the next PO run."
