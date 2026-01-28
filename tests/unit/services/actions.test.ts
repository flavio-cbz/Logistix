import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { signUp, signIn, addParcelle } from '@/lib/services/actions';
import { serviceContainer } from '@/lib/services/container';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

vi.mock('@/lib/services/container', () => ({
    serviceContainer: {
        getAuthService: vi.fn(),
        getParcelleService: vi.fn(),
    },
}));

vi.mock('@/lib/utils/logging/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('Server Actions', () => {
    // Service mocks
    const mockAuthService = {
        createUser: vi.fn(),
        createSession: vi.fn(),
        authenticate: vi.fn(),
        requireAuth: vi.fn(),
        destroySession: vi.fn(),
    };

    const mockParcelleService = {
        createParcelle: vi.fn(),
        updateParcelle: vi.fn(),
        deleteParcelle: vi.fn(),
        getAllParcelles: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup service container mocks
        (serviceContainer.getAuthService as any).mockReturnValue(mockAuthService);
        (serviceContainer.getParcelleService as any).mockReturnValue(mockParcelleService);
    });

    describe('signUp', () => {
        it('should create user and session on valid input', async () => {
            const formData = new FormData();
            formData.append('username', 'testuser');
            formData.append('password', 'password123');

            mockAuthService.createUser.mockResolvedValue({ id: 'user1' });
            mockAuthService.createSession.mockResolvedValue({});

            const result = await signUp(formData);

            expect(mockAuthService.createUser).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'password123',
            });
            expect(mockAuthService.createSession).toHaveBeenCalledWith('user1');
            expect(result.success).toBe(true);
        });

        it('should return error on zod validation failure', async () => {
            const formData = new FormData();
            formData.append('username', 'a'); // too short
            formData.append('password', '123'); // too short

            const result = await signUp(formData);

            expect(result.success).toBe(false);
            expect(mockAuthService.createUser).not.toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            const formData = new FormData();
            formData.append('username', 'testuser');
            formData.append('password', 'password123');

            mockAuthService.createUser.mockRejectedValue(new Error('User exists'));

            const result = await signUp(formData);

            expect(result.success).toBe(false);
            expect(result._message).toContain('User exists');
        });
    });

    describe('addParcelle', () => {
        it('should add parcelle successfully', async () => {
            const formData = new FormData();
            formData.append('numero', 'PARC123');
            formData.append('transporteur', 'DHL');
            formData.append('nom', 'Test Parcel');
            formData.append('statut', 'pending');
            formData.append('prixAchat', '100');
            formData.append('poids', '500');

            mockAuthService.requireAuth.mockResolvedValue({ id: 'user1' });
            mockParcelleService.createParcelle.mockResolvedValue({ id: 'p1' });

            const result = await addParcelle(formData);

            expect(mockAuthService.requireAuth).toHaveBeenCalled();
            expect(mockParcelleService.createParcelle).toHaveBeenCalledWith(
                'user1',
                expect.objectContaining({
                    superbuyId: 'PARC123',
                    carrier: 'DHL',
                    totalPrice: 100,
                    isActive: 1
                })
            );
            expect(revalidatePath).toHaveBeenCalledWith('/parcelles');
            expect(result.success).toBe(true);
        });

        it('should fail if not authenticated', async () => {
            // FormData setup
            const formData = new FormData();
            formData.append('numero', 'PARC123');

            mockAuthService.requireAuth.mockRejectedValue(new Error('Unauthorized'));

            const result = await addParcelle(formData);

            expect(result.success).toBe(false);
            expect(mockParcelleService.createParcelle).not.toHaveBeenCalled();
        });
    });
});
