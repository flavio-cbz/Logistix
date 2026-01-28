import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImageProcessor } from '@/lib/services/image-processor';
import fs from 'fs';

// Hoist mocks to ensure they are available for vi.mock
const mocks = vi.hoisted(() => {
    const mockSharpInstance = {
        rotate: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn(),
    };
    const mockSharp = vi.fn(() => mockSharpInstance);
    return {
        mockSharp,
        mockSharpInstance
    };
});

vi.mock('sharp', () => ({
    default: mocks.mockSharp,
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
        vi.mocked(fs.existsSync).mockReturnValue(false);

        // Mock sharp processing
        mocks.mockSharpInstance.toFile.mockResolvedValue({} as any);

        const result = await processor.downloadAndOrientImage(url, userId, productId);

        expect(globalFetch).toHaveBeenCalledWith(url);
        expect(mocks.mockSharp).toHaveBeenCalled(); // Called with buffer
        expect(mocks.mockSharpInstance.rotate).toHaveBeenCalled();
        expect(mocks.mockSharpInstance.webp).toHaveBeenCalled();
        expect(mocks.mockSharpInstance.toFile).toHaveBeenCalled();

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

        mocks.mockSharpInstance.toFile.mockRejectedValue(new Error('Sharp error'));

        const result = await processor.downloadAndOrientImage('http://url', 'u', 'p');
        expect(result).toBeNull();
    });
});
