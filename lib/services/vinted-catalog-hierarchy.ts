/**
 * Compatibility wrapper: older code and tests import `vintedCatalogHierarchyService`
 * from '@/lib/services/vinted-catalog-hierarchy'. The actual implementation lives in
 * lib/services/vinted-catalogs.ts — export the singleton under the expected name.
 */
import { vintedCatalogService } from './vinted-catalogs';

export const vintedCatalogHierarchyService = vintedCatalogService;

export default vintedCatalogHierarchyService;