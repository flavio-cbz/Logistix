
import { Platform } from "./types/entities";

export const PLATFORM_OPTIONS = [
    { value: Platform.LEBONCOIN, label: "Le Bon Coin" },
    { value: Platform.OTHER, label: "Autre" },
    // Add other platforms here if needed in the future
] as const;
