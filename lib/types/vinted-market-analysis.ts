/**
 * Re-export canonical types from the project's main types file to avoid
 * duplicate/conflicting declarations between `lib/types` and `types/`.
 *
 * Keep this thin wrapper so modules that import from '@/lib/types/vinted-market-analysis'
 * continue to work while the canonical definitions live in /types/vinted-market-analysis.ts.
 */
export * from '../../types/vinted-market-analysis';