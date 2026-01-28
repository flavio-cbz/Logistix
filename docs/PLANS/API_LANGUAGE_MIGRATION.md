# API Language Migration Plan

## Context
The application currently uses French naming in API endpoints (`/api/v1/produits`) which creates inconsistency. This document outlines the migration strategy to standardize on English naming.

## Phase 1: Create English Aliases (IN PROGRESS)

### Completed
- ✅ `/api/v1/products` → main products list endpoint
- ✅ `/api/v1/products/[id]` → individual product CRUD
- ✅ Added `@deprecated` markers to French endpoints

### Remaining Aliases Needed
The following French endpoints need English aliases:

```
/api/v1/produits/[id]/duplicate       → /api/v1/products/[id]/duplicate
/api/v1/produits/[id]/generate-description → /api/v1/products/[id]/generate-description
/api/v1/produits/[id]/resolve-conflict → /api/v1/products/[id]/resolve-conflict
/api/v1/produits/[id]/retry-enrichment → /api/v1/products/[id]/retry-enrichment
/api/v1/produits/[id]/sales           → /api/v1/products/[id]/sales
/api/v1/produits/batch                → /api/v1/products/batch
/api/v1/produits/bulk                 → /api/v1/products/bulk
/api/v1/produits/enrichment-status    → /api/v1/products/enrichment-status
/api/v1/produits/stats                → /api/v1/products/stats
```

Each alias should:
1. Be a copy of the French route with English documentation
2. Use identical service layer calls
3. Have English error messages

## Phase 2: Update Frontend to Use English Endpoints

### Files to Update
- `lib/hooks/use-products.ts` - Product CRUD hooks
- `lib/hooks/use-enrichment.ts` - Enrichment hooks
- `lib/hooks/use-product-bulk-actions.ts` - Bulk actions
- `components/features/produits/products-grid-view.tsx` - Direct fetch calls
- `components/features/produits/product-sale-dialog.tsx` - Sales tracking
- Any other components making direct API calls

### Strategy
1. Update one hook at a time
2. Test thoroughly after each change
3. Monitor for broken functionality

## Phase 3: Deprecation Period (2-4 weeks)

Keep both French and English endpoints running simultaneously:
- French endpoints marked `@deprecated`
- Log warnings when French endpoints are used
- Update documentation to recommend English endpoints
- Communicate migration timeline to team

## Phase 4: Database Schema Migration (FUTURE)

This is a larger change that requires careful planning:

### Tables to Rename
- `produits` → `products`
- `parcelles` → `parcels`

### Migration Strategy
1. Create new tables with English names
2. Set up triggers/views to keep both in sync
3. Migrate services to use English tables
4. Run both schemas in parallel (blue-green deployment)
5. Verify data consistency
6. Drop old French tables

### Considerations
- Zero-downtime migration required
- Data integrity must be maintained
- Rollback plan needed
- Full backup before migration

## Phase 5: Remove French Endpoints

After successful migration and deprecation period:
1. Remove all `/api/v1/produits/*` routes
2. Remove French field normalizers
3. Update all references in documentation
4. Update API versioning to v2 if breaking changes

## Testing Strategy

### For Each Phase
- Run full test suite (unit + integration + e2e)
- Manual testing of critical flows:
  - Product creation/update/delete
  - Bulk operations
  - Enrichment workflow
  - Sales tracking
  - Market analysis

### Monitoring
- Track API endpoint usage metrics
- Monitor error rates during migration
- Set up alerts for French endpoint usage

## Rollback Plan

If issues are discovered:
1. Revert frontend changes to use French endpoints
2. Keep both endpoints running
3. Investigate root cause
4. Fix issues before retrying

## Success Criteria

- ✅ All API endpoints use English naming
- ✅ No broken functionality after migration
- ✅ Test coverage maintained at current levels
- ✅ Zero data loss during database migration
- ✅ Performance not degraded
- ✅ Documentation fully updated

## Timeline Estimate

- Phase 1: 2-3 hours (create aliases)
- Phase 2: 4-6 hours (frontend migration)
- Phase 3: 2-4 weeks (deprecation period)
- Phase 4: 1-2 days (database migration)
- Phase 5: 2 hours (cleanup)

Total: ~3-4 weeks including deprecation period

## Current Status

**Phase:** 1 (Create English Aliases)
**Progress:** 20% complete (2/11 endpoints migrated)
**Next Action:** Create remaining endpoint aliases
