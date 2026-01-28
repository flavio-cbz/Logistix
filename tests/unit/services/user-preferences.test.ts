import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UserPreferencesService } from '@/lib/services/user-preferences-modern.ts'; // .ts extension needed if not in tsconfig paths correctly? Usually no.
// Using relative import or alias? The file is lib/services/user-preferences-modern.ts 
// Class exported is UserPreferencesService.

import { databaseService } from '@/lib/database';
import { RiskTolerance } from '@/lib/types/entities';

// Mock DB
vi.mock('@/lib/database', () => ({
    databaseService: {
        queryOne: vi.fn(),
        execute: vi.fn(),
        query: vi.fn(),
    },
}));

vi.mock('@/lib/utils/logging/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('UserPreferencesService', () => {
    let service: UserPreferencesService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new UserPreferencesService();
    });

    describe('getUserPreferences', () => {
        it('should return existing preferences', async () => {
            const mockDbResult = {
                id: 'pref1',
                user_id: 'user1',
                objectives: '["save"]',
                risk_tolerance: 'low',
                preferred_insight_types: '[]',
                custom_filters: '{}',
                created_at: 'date',
                updated_at: 'date',
            };

            (databaseService.queryOne as any).mockResolvedValue(mockDbResult);

            const prefs = await service.getUserPreferences('user1');

            expect(databaseService.queryOne).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['user1'], expect.any(String));
            expect(prefs.id).toBe('pref1');
            expect(prefs.objectives).toEqual(['save']);
            expect(prefs.riskTolerance).toBe('low');
        });

        it('should create default preferences if none exist', async () => {
            (databaseService.queryOne as any).mockResolvedValue(null);

            // Mock execute for insert
            (databaseService.execute as any).mockResolvedValue(undefined);

            const prefs = await service.getUserPreferences('user1');

            expect(databaseService.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.any(Array), expect.any(String));
            expect(prefs.userId).toBe('user1');
            expect(prefs.riskTolerance).toBe(RiskTolerance.MODERATE);
        });
    });

    describe('updatePreferences', () => {
        it('should update valid preferences', async () => {
            const updates = { riskTolerance: RiskTolerance.AGGRESSIVE };

            await service.updatePreferences('user1', updates);

            expect(databaseService.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE user_preferences'),
                expect.arrayContaining([RiskTolerance.AGGRESSIVE, 'user1']), // Params order might vary but include these
                expect.any(String)
            );
        });

        it('should validate invalid risk tolerance', async () => {
            const updates = { riskTolerance: 'INVALID' as any };
            // The service wraps errors with "Failed to update preferences"
            await expect(service.updatePreferences('user1', updates)).rejects.toThrow('Failed to update preferences');
        });
    });

    describe('analyzeUserBehavior', () => {
        it('should analyze actions correctly', async () => {
            const mockActions = [
                { action_type: 'view_high_value_items', action_data: '{}', timestamp: '2023-01-01' },
                { action_type: 'view_high_value_items', action_data: '{}', timestamp: '2023-01-01' },
                { action_type: 'view_high_value_items', action_data: '{}', timestamp: '2023-01-01' },
                { action_type: 'view_high_value_items', action_data: '{}', timestamp: '2023-01-01' },
                { action_type: 'view_high_value_items', action_data: '{}', timestamp: '2023-01-01' },
                { action_type: 'view_high_value_items', action_data: '{}', timestamp: '2023-01-01' }, // 6 times > 5
            ];

            (databaseService.query as any).mockResolvedValue(mockActions);

            const result = await service.analyzeUserBehavior('user1');

            expect(result.learnedPreferences.customFilters?.riskIndicators).toContain('high_value_interest');
            expect(result.confidence).toBeGreaterThan(0);
        });
    });
});
