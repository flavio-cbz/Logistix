/**
 * Utility functions for mapping database values to TypeScript enums
 */

import { Platform, ProductStatus, RiskTolerance, UserActionType } from "@/lib/types/entities";

/**
 * Maps database platform values to Platform enum
 */
export function mapPlatform(value: string | null): Platform | null {
  if (!value) return null;
  
  switch (value.toLowerCase()) {
    case "vinted":
      return Platform.VINTED;
    case "leboncoin":
      return Platform.LEBONCOIN;
    case "autre":
    case "other":
      return Platform.OTHER;
    default:
      return Platform.OTHER; // Default fallback
  }
}

/**
 * Maps database status values to ProductStatus enum
 */
export function mapProductStatus(value: string): ProductStatus {
  switch (value.toLowerCase()) {
    case "draft":
      return ProductStatus.DRAFT;
    case "available":
      return ProductStatus.AVAILABLE;
    case "online":
      return ProductStatus.ONLINE;
    case "reserved":
      return ProductStatus.RESERVED;
    case "sold":
      return ProductStatus.SOLD;
    case "removed":
      return ProductStatus.REMOVED;
    case "archived":
      return ProductStatus.ARCHIVED;
    default:
      return ProductStatus.DRAFT; // Default fallback
  }
}

/**
 * Maps database risk tolerance values to RiskTolerance enum
 */
export function mapRiskTolerance(value: string): RiskTolerance {
  switch (value.toLowerCase()) {
    case "conservative":
      return RiskTolerance.CONSERVATIVE;
    case "moderate":
      return RiskTolerance.MODERATE;
    case "aggressive":
      return RiskTolerance.AGGRESSIVE;
    default:
      return RiskTolerance.MODERATE; // Default fallback
  }
}

/**
 * Maps database action type values to UserActionType enum
 */
export function mapUserActionType(value: string): UserActionType {
  switch (value.toLowerCase()) {
    case "view_insight":
      return UserActionType.VIEW_INSIGHT;
    case "follow_recommendation":
      return UserActionType.FOLLOW_RECOMMENDATION;
    case "ignore_recommendation":
      return UserActionType.IGNORE_RECOMMENDATION;
    case "export_analysis":
      return UserActionType.EXPORT_ANALYSIS;
    case "save_analysis":
      return UserActionType.SAVE_ANALYSIS;
    case "share_analysis":
      return UserActionType.SHARE_ANALYSIS;
    case "feedback":
      return UserActionType.FEEDBACK;
    default:
      return UserActionType.VIEW_INSIGHT; // Default fallback
  }
}

/**
 * Converts enum values back to database format
 */
export function platformToDb(platform: Platform): string {
  return platform; // Enum values match database values
}

export function productStatusToDb(status: ProductStatus): string {
  return status; // Enum values match database values
}

export function riskToleranceToDb(risk: RiskTolerance): string {
  return risk; // Enum values match database values
}

export function userActionTypeToDb(action: UserActionType): string {
  return action; // Enum values match database values
}