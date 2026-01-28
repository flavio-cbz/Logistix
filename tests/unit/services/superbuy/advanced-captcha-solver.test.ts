import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdvancedCaptchaSolver } from '@/lib/services/superbuy/advanced-captcha-solver';
import * as fs from 'fs';

// Mocks
const mocks = vi.hoisted(() => {
    const mockLocator = {
        first: vi.fn(),
        count: vi.fn(),
        isVisible: vi.fn(),
        boundingBox: vi.fn(),
        scrollIntoViewIfNeeded: vi.fn(),
        screenshot: vi.fn(),
        evaluate: vi.fn(),
        click: vi.fn(),
    };
    // Circular return for chaining
    mockLocator.first.mockReturnValue(mockLocator);

    const mockMouse = {
        move: vi.fn(),
        down: vi.fn(),
        up: vi.fn(),
    };

    const mockFrame = {
        isDetached: vi.fn().mockReturnValue(false),
        waitForLoadState: vi.fn(),
        locator: vi.fn().mockReturnValue(mockLocator),
        $: vi.fn(),
    };

    const mockPage = {
        locator: vi.fn().mockReturnValue(mockLocator),
        frames: vi.fn().mockReturnValue([]),
        $: vi.fn(),
        waitForTimeout: vi.fn(),
        mouse: mockMouse,
        context: vi.fn().mockReturnValue({ cookies: vi.fn().mockResolvedValue([]) }),
    };

    return { mockPage, mockLocator, mockMouse, mockFrame };
});

const { mockPage, mockLocator, mockMouse, mockFrame } = mocks;

// Mock FS
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        mkdtempSync: vi.fn(),
        writeFileSync: vi.fn(),
        unlinkSync: vi.fn(),
        rmdirSync: vi.fn(),
    };
});

// Mock YoloCaptchaService
vi.mock('@/lib/services/captcha/yolo-captcha-service', () => ({
    YoloCaptchaService: {
        getInstance: vi.fn().mockReturnValue({
            planSliderMovement: vi.fn(),
        }),
    },
}));

// Mock Trajectory Generator
vi.mock('@/lib/utils/trajectory-generator', () => ({
    generateHorizontalDragTrajectory: vi.fn().mockReturnValue([
        { x: 10, y: 10, t: 10 },
        { x: 20, y: 10, t: 20 }
    ]),
}));

// Mock Logger
vi.mock('@/lib/utils/logging/logger', () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

import { YoloCaptchaService } from '@/lib/services/captcha/yolo-captcha-service';

describe('AdvancedCaptchaSolver', () => {
    let solver: AdvancedCaptchaSolver;

    beforeEach(() => {
        vi.clearAllMocks();
        solver = new AdvancedCaptchaSolver(mockPage as any);

        // Reset default mock behaviors
        (fs.existsSync as any).mockReturnValue(true);
        (fs.mkdtempSync as any).mockReturnValue('/tmp/captcha');
        mockPage.frames.mockReturnValue([mockFrame]);
        // Default: locators not found to avoid infinite loops if not handled
        mockLocator.count.mockResolvedValue(0);

        // setup Yolo mock defaults
        const yoloInstance = YoloCaptchaService.getInstance();
        (yoloInstance.planSliderMovement as any).mockResolvedValue({ valid: true, deltaXDomPx: 50 });
    });

    describe('solve', () => {
        it('should return no-captcha if context is not found', async () => {
            // No frames, no locators found

            const result = await solver.solve('test-session');
            expect(result).toBe('no-captcha');
        });

        it('should return solved when captcha is found and solved successfully', async () => {
            // 1. Context detection (mock locator found for container)
            mockLocator.count
                .mockResolvedValueOnce(1) // Container found (resolveCaptchaContext)
                .mockResolvedValueOnce(1) // Container found (solve loop -> locateFirstVisible)
                .mockResolvedValueOnce(1) // Track found
                .mockResolvedValueOnce(1); // Slider found

            mockLocator.isVisible.mockResolvedValue(true);

            mockLocator.boundingBox
                .mockResolvedValueOnce({ width: 300, x: 0, y: 0, height: 20 }) // Track
                .mockResolvedValueOnce({ width: 50, x: 0, y: 0, height: 50 }); // Slider

            // Mock success check (waitForSolved)
            // It checks multiple indicators. Let's make "success text" found.
            // locators: container, track, slider ... then success text.
            // But verifySolved calls locateFirstVisible / locator again.
            // It's tricky to sequence count() mocks perfectly.

            // Let's rely on 'always found' for simplicity if specific args match?
            mockPage.locator.mockImplementation((selector: string) => {
                if (selector.includes('tc-success')) {
                    return { ...mockLocator, count: vi.fn().mockResolvedValue(1), isVisible: vi.fn().mockResolvedValue(true) };
                }
                return mockLocator;
            });
            mockFrame.locator.mockImplementation(() => {
                // For container/slider/track inside frame
                return mockLocator;
            });

            // We need resolveCaptchaContext to return a frame/page.
            // It checks TCAPTCHA_CONTAINER_SELECTORS etc.
            // Let's make it find a container in 'mockFrame'.
            // The default sequence of count() above might be enough if we align it.

            // Retry logic:
            mockLocator.count.mockResolvedValue(1); // Find everything always
            mockLocator.isVisible.mockResolvedValue(true);
            mockLocator.boundingBox.mockResolvedValue({ width: 100, height: 100, x: 0, y: 0 });

            const result = await solver.solve('test-session');

            expect(result).toBe('solved');
            expect(mockMouse.down).toHaveBeenCalled();
            expect(mockMouse.move).toHaveBeenCalled();
            expect(mockMouse.up).toHaveBeenCalled();
        });

        it('should retry 3 times if solving fails', async () => {
            // Mock context found
            mockLocator.count.mockResolvedValue(1);
            mockLocator.isVisible.mockResolvedValue(true);
            mockLocator.boundingBox.mockResolvedValue({ width: 100, height: 100, x: 0, y: 0 });

            // Mock YOLO failure
            const yoloInstance = YoloCaptchaService.getInstance();
            (yoloInstance.planSliderMovement as any).mockResolvedValue({ valid: false });

            const result = await solver.solve('test-session');

            expect(result).toBe('failed');
            expect(yoloInstance.planSliderMovement).toHaveBeenCalledTimes(3);
        });
    });
});
