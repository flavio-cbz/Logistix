import { eq, and, sql, gte, lte, asc, desc, inArray } from "drizzle-orm";
import {
  BaseRepository,
  FilterOptions,
  buildTextSearch,
  buildDateRange,
  combineConditions,
} from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { parcelles, NewParcelle } from "@/lib/database/schema";
import { Parcelle } from "@/lib/types/entities";
import { transformDbParcelleToEntity } from "@/lib/transformers/parcelle-transformer";

// =====================================================================