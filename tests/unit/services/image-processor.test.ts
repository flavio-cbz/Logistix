import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImageProcessor } from '@/lib/services/image-processor';
import path from 'path';
import fs from 'fs';

// Mock mocks
const mockSharpInstance = {
    rotate: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn(),
};

const mockSharp = vi.fn(() => mockSharpInstance);

vi.mock('sharp', () => ({
    default: mockSharp,
}));

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
    }
}));

// Mock global fetch
const globalFetch = vi.fn();
global.fetch = globalFetch;

vi.mock('@/lib/utils/logging/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe('ImageProcessor', () => {
    let processor: ImageProcessor;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset instance for singleton test if needed, but since it's private static...
        // We just get instance.
        processor = ImageProcessor.getInstance();
    });

    it('should be valid instance', () => {
        expect(processor).toBeDefined();
    });

    it('should download and process image successfully', async () => {
        const userId = 'user1';
        const productId = 'prod1';
        const url = 'http://example.com/image.jpg';

        // Mock fetch response
        globalFetch.mockResolvedValueOnce({
            ok: true,
            statusText: 'OK',
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
        });

        // Mock fs existence (return false to trigger mkdir)
        (fs.existsSync as any).mockReturnValue(false);

        // Mock sharp processing
        mockSharpInstance.toFile.mockResolvedValue({} as any);

        const result = await processor.downloadAndOrientImage(url, userId, productId);

        expect(globalFetch).toHaveBeenCalledWith(url);
        expect(mockSharp).toHaveBeenCalled(); // Called with buffer
        expect(mockSharpInstance.rotate).toHaveBeenCalled();
        expect(mockSharpInstance.webp).toHaveBeenCalled();
        expect(mockSharpInstance.toFile).toHaveBeenCalled();

        expect(result).toContain(`/uploads/products/${userId}/${productId}-0.webp`);
    });

    it('should handle fetch failure', async () => {
        globalFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Not Found',
        });

        const result = await processor.downloadAndOrientImage('http://bad.url', 'u', 'p');

        expect(result).toBeNull();
    });

    it('should handle processing error', async () => {
        globalFetch.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
        });

        mockSharpInstance.toFile.mockRejectedValue(new Error('Sharp error'));

        const result = await processor.downloadAndOrientImage('http://url', 'u', 'p');
        expect(result).toBeNull();
    });
});
