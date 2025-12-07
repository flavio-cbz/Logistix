import { BaseService } from "./base-service";
import { ParcelleRepository } from "@/lib/repositories";
import {
  Parcelle,
  CreateParcelleInput,
  UpdateParcelleInput,
} from "@/lib/types/entities";
import {
  createParcelleSchema,
  updateParcelleSchema,
} from "@/lib/schemas/parcelle";
// Removed unused imports

// ======================================================================