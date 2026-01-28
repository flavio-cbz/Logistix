import { logger } from "@/lib/utils/logging/logger";
import { GeminiJsonResponse, RETRY_CONFIG } from "./types";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts JSON from a text response that may contain markdown or other formatting.
 * Tries multiple strategies to find valid JSON.
 */
export function extractJsonFromText(text: string): GeminiJsonResponse | null {
    if (!text || text.trim().length === 0) {
        return null;
    }

    const cleanText = text.trim();

    // Strategy 1: Try parsing the whole text as JSON
    try {
        return JSON.parse(cleanText);
    } catch {
        // Continue to other strategies
    }

    // Strategy 2: Extract JSON from markdown code blocks
    const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try {
            const jsonContent = codeBlockMatch[1];
            if (jsonContent) {
                return JSON.parse(jsonContent.trim());
            }
        } catch {
            // Continue
        }
    }

    // Strategy 3: Find first { and last } and extract
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            return JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
        } catch {
            // Continue
        }
    }

    // Strategy 4: Regex extraction for individual fields
    const nameMatch = text.match(/"name"\s*:\s*"([^"]+)"/);
    const urlMatch = text.match(/"url"\s*:\s*"([^"]+)"/);
    const confidenceMatch = text.match(/"confidence"\s*:\s*([0-9.]+)/);
    const sourceMatch = text.match(/"source"\s*:\s*"([^"]+)"/);

    if (nameMatch) {
        const extractedName = nameMatch[1];
        return {
            name: extractedName ?? "",
            url: urlMatch?.[1] ?? "",
            source: sourceMatch?.[1] ?? "Regex Extraction",
            confidence: confidenceMatch?.[1] ? parseFloat(confidenceMatch[1]) : 0.5,
        };
    }

    return null;
}

/**
 * Extracts retry delay from error message if available (e.g. "retry in 14.5s")
 */
export function extractRetryDelay(errorMessage: string): number | null {
    // Match patterns like "retry in 14.5s" or "retry in 57.978113134s"
    const match = errorMessage.match(/retry in ([0-9.]+)\s*s/i);
    if (match && match[1]) {
        return Math.ceil(parseFloat(match[1]) * 1000);
    }
    return null;
}

/**
 * Delay utility for retry logic
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function getBackoffDelay(attempt: number): number {
    const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 500;
    return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);
}

/**
 * Fetches an image from URL (or local path) and converts to base64 for Gemini.
 * Supports local paths like /uploads/products/... by reading from public folder.
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
    try {
        // Handle local paths (e.g., /uploads/products/userId/file.webp)
        if (imageUrl.startsWith('/uploads/')) {
            const localPath = path.join(process.cwd(), 'public', imageUrl);

            if (!fs.existsSync(localPath)) {
                logger.warn("[ProductEnrichment] Local file not found:", { localPath });
                return null;
            }

            const buffer = fs.readFileSync(localPath);
            const base64 = buffer.toString("base64");

            // Detect mime type from extension
            const ext = path.extname(localPath).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.webp': 'image/webp',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
            };
            const mimeType = mimeTypes[ext] || 'image/webp';

            return { data: base64, mimeType };
        }

        // Handle remote URLs
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (!response.ok) return null;

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        return {
            data: base64,
            mimeType: contentType.split(";")[0] ?? "image/jpeg", // Remove charset if present
        };
    } catch (error) {
        logger.warn("[ProductEnrichment] Failed to fetch image:", { imageUrl, error });
        return null;
    }
}
