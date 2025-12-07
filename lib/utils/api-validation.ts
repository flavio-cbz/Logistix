/**
 * API contract validation utilities
 * This file provides runtime type checking for API responses and requests
 * to ensure type safety and catch contract violations early.
 */

import { z } from "zod";
import {
    ApiResponse,
    ProductListRequest,
    ParcelleListRequest,
} from "../shared/types/api";
import {
    Product,
    Parcelle,
    User,
    ProductStatus,
    Platform,
} from "../types/entities";
import {
    isProduct,
    isParcelle,
    isUser,
} from "../types/guards";

// =====================================================================