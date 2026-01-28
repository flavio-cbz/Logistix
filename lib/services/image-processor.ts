import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

import { logger } from '@/lib/utils/logging/logger';

export class ImageProcessor {
    private static instance: ImageProcessor;
    private readonly uploadDir: string;

    private constructor() {
        this.uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
        this.ensureDirectoryExists(this.uploadDir);
    }

    public static getInstance(): ImageProcessor {
        if (!ImageProcessor.instance) {
            ImageProcessor.instance = new ImageProcessor();
        }
        return ImageProcessor.instance;
    }

    private ensureDirectoryExists(dirPath: string) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Downloads an image, auto-orients it based on EXIF, converts to WebP, and saves it locally.
     * @param url The public URL of the image to download
     * @param userId The ID of the user (for directory organization)
     * @param productId The ID of the product (for filename)
     * @param index Optional index if multiple images exist for the product
     * @returns The local relative path to the image (e.g. /uploads/products/userId/productId-hash.webp)
     */
    async downloadAndOrientImage(url: string, userId: string, productId: string, index: number = 0): Promise<string | null> {
        try {
            // 1. Download image
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 2. Prepare output path
            const userDir = path.join(this.uploadDir, userId);
            this.ensureDirectoryExists(userDir);

            // Generate a unique filename based on product and content hash or index
            const filename = `${productId}-${index}.webp`;
            const filePath = path.join(userDir, filename);
            const publicPath = `/uploads/products/${userId}/${filename}`;

            // 3. Process with Sharp
            // .rotate() without arguments auto-orients based on EXIF
            await sharp(buffer)
                .rotate()
                .webp({ quality: 80 })
                .toFile(filePath);

            return publicPath;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            logger.error(`[ImageProcessor] Failed to process image for product ${productId}`, { url, error: errorMessage, stack });
            return null;
        }
    }
}
