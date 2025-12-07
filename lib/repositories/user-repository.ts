import { eq, and, sql, desc } from "drizzle-orm";
import {
  BaseRepository,
  FilterOptions,
  buildTextSearch,
  combineConditions,
} from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { users, User, NewUser } from "@/lib/database/schema";

// =====================================================================