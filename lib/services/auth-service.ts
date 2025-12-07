import { z } from "zod";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import {
  hash as bcryptHashPassword,
  compare as bcryptComparePassword,
} from "bcrypt";
// NextRequest removed - not used in this service
import { BaseService } from "./base-service";
import {
  ValidationError,
  AuthError,
} from "@/lib/errors/custom-error";
import { getErrorMessage } from "@/lib/utils/error-utils";
import { databaseService } from "@/lib/services/database/db";
import { getCurrentTimestamp } from "@/lib/utils/formatting/calculations";

// ======================================================================