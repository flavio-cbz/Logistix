import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YoloCaptchaService } from '@/lib/services/captcha/yolo-captcha-service';
import * as fs from 'fs';
import * as path from 'path';

// Mock ONNX Runtime
// We mock this object to inject it manually
const mockOrtSession = {
    inputNames: ['images'],
    outputNames: ['output0'],
    run: vi.fn(),
};

const mockOrt = {
    InferenceSession: {
        create: vi.fn().mockResolvedValue(mockOrtSession),
    },
    Tensor: vi.fn(function (this: any, type: string, data: any, dims: number[]) {
        return { type, data, dims };
    }) as any,
};

// Mock Sharp using vi.hoisted
const mocks = vi.hoisted(() => {
    const mockSharpInstance = {
        metadata: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
        resize: vi.fn().mockReturnThis(),
        extend: vi.fn().mockReturnThis(),
        raw: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from(new Float32Array(640 * 640 * 3))),
    };
    return { mockSharpInstance };
});

vi.mock('sharp', () => ({
    default: vi.fn(() => mocks.mockSharpInstance),
}));

// Mock FS
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        existsSync: vi.fn().mockReturnValue(true),
    };
});

describe('YoloCaptchaService', () => {
    let service: YoloCaptchaService;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock the static ORT module property
        YoloCaptchaService.ortModule = mockOrt as any;

        // Reset singleton logic if needed, but since we inject ortModule, 
        // existing instance should just use it if we are retrieving it.
        // Wait, getInstance() will reuse the instance.
        // And ensureSession checks "if (!this.session)".
        // So if the singleton persists between tests with a session, we need to clear it.

        // Access private static instance to clear it for fresh tests?
        // Or just manipulate the instance state.
        // "private session: OrtSession | null = null;"

        // Let's force a new instance or reset session.
        (YoloCaptchaService as any).instance = null;

        service = YoloCaptchaService.getInstance();
    });

    describe('detect', () => {
        it('should detect objects correctly', async () => {
            // Setup fake YOLO output
            const channels = 8;
            const anchors = 10;
            const data = new Float32Array(1 * channels * anchors);

            // Set a detection at anchor 0
            const classIdx = 1; // tc-drag
            const score = 10.0;

            data[0 * anchors + 0] = 320;
            data[1 * anchors + 0] = 320;
            data[2 * anchors + 0] = 50;
            data[3 * anchors + 0] = 50;
            data[(4 + classIdx) * anchors + 0] = score;

            mockOrtSession.run.mockResolvedValue({
                output0: {
                    dims: [1, channels, anchors],
                    data: data,
                }
            });

            const result = await service.detect('test.jpg');

            expect(result.detections.length).toBeGreaterThan(0);
            expect(result.detections[0].class).toBe('tc-drag');
            expect(result.detections[0].confidence).toBeGreaterThan(0.9);
            expect(mockOrt.Tensor).toHaveBeenCalled();
        });

        it('should handle empty detections', async () => {
            mockOrtSession.run.mockResolvedValue({
                output0: {
                    dims: [1, 8, 10],
                    data: new Float32Array(1 * 8 * 10).fill(-100),
                }
            });

            const result = await service.detect('test.jpg');
            expect(result.detections).toEqual([]);
        });
    });

    describe('planSliderMovement', () => {
        it('should return valid plan when piece and target are found', async () => {
            const channels = 8;
            const anchors = 10;
            const data = new Float32Array(1 * channels * anchors);

            // Piece at anchor 0
            data[0 * anchors + 0] = 100;
            data[1 * anchors + 0] = 320;
            data[2 * anchors + 0] = 50;
            data[3 * anchors + 0] = 50;
            data[(4 + 3) * anchors + 0] = 10; // Class 3 (tc-piece)

            // Target at anchor 1
            data[0 * anchors + 1] = 300;
            data[1 * anchors + 1] = 320;
            data[2 * anchors + 1] = 50;
            data[3 * anchors + 1] = 50;
            data[(4 + 1) * anchors + 1] = 10; // Class 1 (tc-drag)

            mockOrtSession.run.mockResolvedValue({
                output0: {
                    dims: [1, channels, anchors],
                    data: data,
                }
            });

            const plan = await service.planSliderMovement('test.jpg', 300);

            expect(plan.valid).toBe(true);
            expect(plan.dragDetection?.class).toBe('tc-piece');
            expect(plan.pieceDetection?.class).toBe('tc-drag');
            expect(plan.deltaXDomPx).toBeGreaterThan(0);
        });

        it('should return invalid plan if pairs not found', async () => {
            const channels = 8;
            const anchors = 10;
            const data = new Float32Array(1 * channels * anchors);

            data[0 * anchors + 0] = 100;
            data[1 * anchors + 0] = 320;
            data[2 * anchors + 0] = 50;
            data[3 * anchors + 0] = 50;
            data[(4 + 3) * anchors + 0] = 10; // Class 3 (tc-piece)

            mockOrtSession.run.mockResolvedValue({
                output0: {
                    dims: [1, channels, anchors],
                    data: data,
                }
            });

            const plan = await service.planSliderMovement('test.jpg', 300);
            expect(plan.valid).toBe(false);
            expect(plan.reason).toContain('pair');
        });
    });
});
