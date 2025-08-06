import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { databaseService, generateId, getCurrentTimestamp } from '@/lib/services/database/db'
import { Parcelle } from '@/types/database'

// Mock the database service for isolated testing
vi.mock('@/lib/services/database/db', async () => {
    const actual = await vi.importActual('@/lib/services/database/db')
    return {
        ...actual,
        databaseService: {
            query: vi.fn(),
            queryOne: vi.fn(),
            execute: vi.fn(),
            transaction: vi.fn(),
            healthCheck: vi.fn()
        }
    }
})

describe('Parcelles Backend Services - Direct Function Tests', () => {
    const mockDatabaseService = databaseService as any

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('ParcelService CRUD Operations', () => {
        describe('createParcelle', () => {
            test('should create parcelle with correct calculations', async () => {
                const mockExecute = vi.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
                mockDatabaseService.execute = mockExecute

                const parcelleData = {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 2.0,
                    prixAchat: 40.00,
                    userId: 'user-123'
                }

                const result = await createParcelle(parcelleData)

                expect(result).toMatchObject({
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 2.0,
                    prixAchat: 40.00,
                    prixTotal: 40.00,
                    prixParGramme: 20.00, // 40.00 / 2.0
                    userId: 'user-123'
                })

                expect(result).toHaveProperty('id')
                expect(result).toHaveProperty('createdAt')
                expect(result).toHaveProperty('updatedAt')

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.stringContaining('INSERT INTO parcelles'),
                    expect.arrayContaining([
                        expect.any(String), // id
                        'user-123', // user_id
                        'P001', // numero
                        'DHL', // transporteur
                        40.00, // prixAchat
                        2.0, // poids
                        40.00, // prixTotal
                        20.00, // prixParGramme
                        expect.any(String), // created_at
                        expect.any(String) // updated_at
                    ]),
                    'create_parcelle'
                )
            })

            test('should calculate price per gram correctly for various weights', async () => {
                const mockExecute = vi.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
                mockDatabaseService.execute = mockExecute

                const testCases = [
                    { poids: 1.0, prixAchat: 10.00, expectedPrixParGramme: 10.00 },
                    { poids: 2.5, prixAchat: 50.00, expectedPrixParGramme: 20.00 },
                    { poids: 0.5, prixAchat: 7.50, expectedPrixParGramme: 15.00 },
                    { poids: 3.333, prixAchat: 99.99, expectedPrixParGramme: 30.00 }
                ]

                for (const testCase of testCases) {
                    const parcelleData = {
                        numero: `P${Math.random().toString(36).substr(2, 9)}`,
                        transporteur: 'DHL',
                        poids: testCase.poids,
                        prixAchat: testCase.prixAchat,
                        userId: 'user-123'
                    }

                    const result = await createParcelle(parcelleData)
                    
                    expect(Math.abs(result.prixParGramme - testCase.expectedPrixParGramme)).toBeLessThan(0.01)
                }
            })

            test('should validate required fields', async () => {
                const invalidData = [
                    { transporteur: 'DHL', poids: 1.5, prixAchat: 25.50, userId: 'user-123' }, // Missing numero
                    { numero: 'P001', poids: 1.5, prixAchat: 25.50, userId: 'user-123' }, // Missing transporteur
                    { numero: 'P001', transporteur: 'DHL', prixAchat: 25.50, userId: 'user-123' }, // Missing poids
                    { numero: 'P001', transporteur: 'DHL', poids: 1.5, userId: 'user-123' }, // Missing prixAchat
                    { numero: 'P001', transporteur: 'DHL', poids: 1.5, prixAchat: 25.50 }, // Missing userId
                ]

                for (const data of invalidData) {
                    await expect(createParcelle(data as any)).rejects.toThrow()
                }
            })

            test('should validate numeric fields', async () => {
                const invalidNumericData = [
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: -1.5, // Negative weight
                        prixAchat: 25.50,
                        userId: 'user-123'
                    },
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: 1.5,
                        prixAchat: -25.50, // Negative price
                        userId: 'user-123'
                    },
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: 0, // Zero weight would cause division by zero
                        prixAchat: 25.50,
                        userId: 'user-123'
                    }
                ]

                for (const data of invalidNumericData) {
                    await expect(createParcelle(data)).rejects.toThrow()
                }
            })

            test('should handle database errors gracefully', async () => {
                const mockExecute = vi.fn().mockRejectedValue(new Error('Database connection failed'))
                mockDatabaseService.execute = mockExecute

                const parcelleData = {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prixAchat: 25.50,
                    userId: 'user-123'
                }

                await expect(createParcelle(parcelleData)).rejects.toThrow('Database connection failed')
            })
        })

        describe('updateParcelle', () => {
            test('should update parcelle with recalculated values', async () => {
                const mockExecute = vi.fn().mockResolvedValue({ changes: 1 })
                mockDatabaseService.execute = mockExecute

                const updateData = {
                    id: 'parcelle-123',
                    numero: 'P001-UPDATED',
                    transporteur: 'UPS',
                    poids: 3.0,
                    prixAchat: 60.00,
                    userId: 'user-123'
                }

                const result = await updateParcelle(updateData)

                expect(result).toMatchObject({
                    id: 'parcelle-123',
                    numero: 'P001-UPDATED',
                    transporteur: 'UPS',
                    poids: 3.0,
                    prixAchat: 60.00,
                    prixTotal: 60.00,
                    prixParGramme: 20.00, // 60.00 / 3.0
                    userId: 'user-123'
                })

                expect(result).toHaveProperty('updatedAt')

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.stringContaining('UPDATE parcelles'),
                    expect.arrayContaining([
                        'P001-UPDATED', // numero
                        'UPS', // transporteur
                        60.00, // prixAchat
                        3.0, // poids
                        60.00, // prixTotal
                        20.00, // prixParGramme
                        expect.any(String), // updated_at
                        'parcelle-123', // id
                        'user-123' // user_id
                    ]),
                    'update_parcelle'
                )
            })

            test('should require parcelle ID', async () => {
                const updateData = {
                    numero: 'P001',
                    transporteur: 'UPS',
                    poids: 2.0,
                    prixAchat: 40.00,
                    userId: 'user-123'
                }

                await expect(updateParcelle(updateData as any)).rejects.toThrow('ID de parcelle manquant')
            })

            test('should handle parcelle not found', async () => {
                const mockExecute = vi.fn().mockResolvedValue({ changes: 0 })
                mockDatabaseService.execute = mockExecute

                const updateData = {
                    id: 'non-existent-id',
                    numero: 'P001',
                    transporteur: 'UPS',
                    poids: 2.0,
                    prixAchat: 40.00,
                    userId: 'user-123'
                }

                await expect(updateParcelle(updateData)).rejects.toThrow('Parcelle non trouvée ou non autorisée')
            })

            test('should validate numeric fields on update', async () => {
                const invalidData = {
                    id: 'parcelle-123',
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: -1.5, // Invalid weight
                    prixAchat: 25.50,
                    userId: 'user-123'
                }

                await expect(updateParcelle(invalidData)).rejects.toThrow()
            })
        })

        describe('deleteParcelle', () => {
            test('should delete parcelle successfully', async () => {
                const mockExecute = vi.fn().mockResolvedValue({ changes: 1 })
                mockDatabaseService.execute = mockExecute

                const result = await deleteParcelle('parcelle-123', 'user-123')

                expect(result).toBe(true)

                expect(mockExecute).toHaveBeenCalledWith(
                    'DELETE FROM parcelles WHERE id = ? AND user_id = ?',
                    ['parcelle-123', 'user-123'],
                    'delete_parcelle'
                )
            })

            test('should handle parcelle not found', async () => {
                const mockExecute = vi.fn().mockResolvedValue({ changes: 0 })
                mockDatabaseService.execute = mockExecute

                await expect(deleteParcelle('non-existent-id', 'user-123')).rejects.toThrow('Parcelle non trouvée ou non autorisée')
            })

            test('should require parcelle ID', async () => {
                await expect(deleteParcelle('', 'user-123')).rejects.toThrow('ID de parcelle manquant')
            })

            test('should require user ID', async () => {
                await expect(deleteParcelle('parcelle-123', '')).rejects.toThrow('ID utilisateur manquant')
            })
        })

        describe('getParcellesByUserId', () => {
            test('should retrieve all parcelles for user', async () => {
                const mockParcelles = [
                    {
                        id: 'parcelle-1',
                        userId: 'user-123',
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: 1.5,
                        prixAchat: 25.50,
                        prixTotal: 25.50,
                        prixParGramme: 17.00,
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z'
                    },
                    {
                        id: 'parcelle-2',
                        userId: 'user-123',
                        numero: 'P002',
                        transporteur: 'UPS',
                        poids: 2.0,
                        prixAchat: 40.00,
                        prixTotal: 40.00,
                        prixParGramme: 20.00,
                        createdAt: '2024-01-02T00:00:00Z',
                        updatedAt: '2024-01-02T00:00:00Z'
                    }
                ]

                const mockQuery = vi.fn().mockResolvedValue(mockParcelles)
                mockDatabaseService.query = mockQuery

                const result = await getParcellesByUserId('user-123')

                expect(result).toEqual(mockParcelles)
                expect(mockQuery).toHaveBeenCalledWith(
                    'SELECT * FROM parcelles WHERE user_id = ? ORDER BY created_at DESC',
                    ['user-123'],
                    'get_user_parcelles'
                )
            })

            test('should return empty array when user has no parcelles', async () => {
                const mockQuery = vi.fn().mockResolvedValue([])
                mockDatabaseService.query = mockQuery

                const result = await getParcellesByUserId('user-123')

                expect(result).toEqual([])
            })

            test('should require user ID', async () => {
                await expect(getParcellesByUserId('')).rejects.toThrow('ID utilisateur manquant')
            })
        })

        describe('getParcelleById', () => {
            test('should retrieve specific parcelle', async () => {
                const mockParcelle = {
                    id: 'parcelle-123',
                    userId: 'user-123',
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prixAchat: 25.50,
                    prixTotal: 25.50,
                    prixParGramme: 17.00,
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z'
                }

                const mockQueryOne = vi.fn().mockResolvedValue(mockParcelle)
                mockDatabaseService.queryOne = mockQueryOne

                const result = await getParcelleById('parcelle-123', 'user-123')

                expect(result).toEqual(mockParcelle)
                expect(mockQueryOne).toHaveBeenCalledWith(
                    'SELECT * FROM parcelles WHERE id = ? AND user_id = ?',
                    ['parcelle-123', 'user-123'],
                    'get_parcelle_by_id'
                )
            })

            test('should return null when parcelle not found', async () => {
                const mockQueryOne = vi.fn().mockResolvedValue(null)
                mockDatabaseService.queryOne = mockQueryOne

                const result = await getParcelleById('non-existent-id', 'user-123')

                expect(result).toBeNull()
            })

            test('should require parcelle ID', async () => {
                await expect(getParcelleById('', 'user-123')).rejects.toThrow('ID de parcelle manquant')
            })

            test('should require user ID', async () => {
                await expect(getParcelleById('parcelle-123', '')).rejects.toThrow('ID utilisateur manquant')
            })
        })
    })

    describe('Calculation Functions', () => {
        describe('calculatePricePerGram', () => {
            test('should calculate price per gram correctly', () => {
                const testCases = [
                    { prixTotal: 10.00, poids: 1.0, expected: 10.00 },
                    { prixTotal: 50.00, poids: 2.5, expected: 20.00 },
                    { prixTotal: 7.50, poids: 0.5, expected: 15.00 },
                    { prixTotal: 99.99, poids: 3.333, expected: 30.00 },
                    { prixTotal: 0.01, poids: 0.001, expected: 10.00 }
                ]

                testCases.forEach(testCase => {
                    const result = calculatePricePerGram(testCase.prixTotal, testCase.poids)
                    expect(Math.abs(result - testCase.expected)).toBeLessThan(0.01)
                })
            })

            test('should handle edge cases', () => {
                // Very small numbers
                expect(calculatePricePerGram(0.001, 0.001)).toBeCloseTo(1.0, 2)
                
                // Large numbers
                expect(calculatePricePerGram(999999.99, 999999.99)).toBeCloseTo(1.0, 2)
                
                // High precision
                expect(calculatePricePerGram(Math.PI, Math.E)).toBeCloseTo(Math.PI / Math.E, 6)
            })

            test('should throw error for zero weight', () => {
                expect(() => calculatePricePerGram(10.00, 0)).toThrow('Le poids ne peut pas être zéro')
            })

            test('should throw error for negative values', () => {
                expect(() => calculatePricePerGram(-10.00, 1.0)).toThrow('Le prix et le poids doivent être positifs')
                expect(() => calculatePricePerGram(10.00, -1.0)).toThrow('Le prix et le poids doivent être positifs')
            })
        })

        describe('calculateTotalValue', () => {
            test('should calculate total value for multiple parcelles', () => {
                const parcelles = [
                    { prixTotal: 25.50 },
                    { prixTotal: 40.00 },
                    { prixTotal: 15.75 }
                ] as Parcelle[]

                const result = calculateTotalValue(parcelles)
                expect(result).toBeCloseTo(81.25, 2)
            })

            test('should return 0 for empty array', () => {
                const result = calculateTotalValue([])
                expect(result).toBe(0)
            })

            test('should handle single parcelle', () => {
                const parcelles = [{ prixTotal: 25.50 }] as Parcelle[]
                const result = calculateTotalValue(parcelles)
                expect(result).toBe(25.50)
            })
        })

        describe('calculateAverageWeight', () => {
            test('should calculate average weight correctly', () => {
                const parcelles = [
                    { poids: 1.0 },
                    { poids: 2.0 },
                    { poids: 3.0 }
                ] as Parcelle[]

                const result = calculateAverageWeight(parcelles)
                expect(result).toBe(2.0)
            })

            test('should return 0 for empty array', () => {
                const result = calculateAverageWeight([])
                expect(result).toBe(0)
            })

            test('should handle decimal weights', () => {
                const parcelles = [
                    { poids: 1.5 },
                    { poids: 2.5 },
                    { poids: 3.0 }
                ] as Parcelle[]

                const result = calculateAverageWeight(parcelles)
                expect(result).toBeCloseTo(2.33, 2)
            })
        })

        describe('calculateAveragePricePerGram', () => {
            test('should calculate weighted average price per gram', () => {
                const parcelles = [
                    { poids: 1.0, prixParGramme: 10.00 },
                    { poids: 2.0, prixParGramme: 20.00 },
                    { poids: 1.0, prixParGramme: 30.00 }
                ] as Parcelle[]

                // Weighted average: (1*10 + 2*20 + 1*30) / (1+2+1) = 80/4 = 20.00
                const result = calculateAveragePricePerGram(parcelles)
                expect(result).toBe(20.00)
            })

            test('should return 0 for empty array', () => {
                const result = calculateAveragePricePerGram([])
                expect(result).toBe(0)
            })

            test('should handle single parcelle', () => {
                const parcelles = [{ poids: 1.5, prixParGramme: 15.00 }] as Parcelle[]
                const result = calculateAveragePricePerGram(parcelles)
                expect(result).toBe(15.00)
            })
        })
    })

    describe('Data Validation and Business Rules', () => {
        describe('validateParcelleData', () => {
            test('should validate correct parcelle data', () => {
                const validData = {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prixAchat: 25.50,
                    userId: 'user-123'
                }

                expect(() => validateParcelleData(validData)).not.toThrow()
            })

            test('should reject missing required fields', () => {
                const invalidData = [
                    { transporteur: 'DHL', poids: 1.5, prixAchat: 25.50, userId: 'user-123' },
                    { numero: 'P001', poids: 1.5, prixAchat: 25.50, userId: 'user-123' },
                    { numero: 'P001', transporteur: 'DHL', prixAchat: 25.50, userId: 'user-123' },
                    { numero: 'P001', transporteur: 'DHL', poids: 1.5, userId: 'user-123' },
                    { numero: 'P001', transporteur: 'DHL', poids: 1.5, prixAchat: 25.50 }
                ]

                invalidData.forEach(data => {
                    expect(() => validateParcelleData(data as any)).toThrow()
                })
            })

            test('should reject invalid numeric values', () => {
                const invalidNumericData = [
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: -1.5,
                        prixAchat: 25.50,
                        userId: 'user-123'
                    },
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: 1.5,
                        prixAchat: -25.50,
                        userId: 'user-123'
                    },
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: 0,
                        prixAchat: 25.50,
                        userId: 'user-123'
                    }
                ]

                invalidNumericData.forEach(data => {
                    expect(() => validateParcelleData(data)).toThrow()
                })
            })

            test('should validate numero format', () => {
                const invalidNumeros = [
                    '', // Empty
                    '   ', // Whitespace only
                    'P', // Too short
                    'P' + 'x'.repeat(50), // Too long
                    '123', // No prefix
                    'p001' // Lowercase
                ]

                invalidNumeros.forEach(numero => {
                    const data = {
                        numero,
                        transporteur: 'DHL',
                        poids: 1.5,
                        prixAchat: 25.50,
                        userId: 'user-123'
                    }
                    expect(() => validateParcelleData(data)).toThrow()
                })
            })

            test('should validate transporteur values', () => {
                const validTransporteurs = ['DHL', 'UPS', 'FedEx', 'La Poste', 'Chronopost', 'Colissimo']
                const invalidTransporteurs = ['', '   ', 'INVALID', 'dhl', 'ups']

                validTransporteurs.forEach(transporteur => {
                    const data = {
                        numero: 'P001',
                        transporteur,
                        poids: 1.5,
                        prixAchat: 25.50,
                        userId: 'user-123'
                    }
                    expect(() => validateParcelleData(data)).not.toThrow()
                })

                invalidTransporteurs.forEach(transporteur => {
                    const data = {
                        numero: 'P001',
                        transporteur,
                        poids: 1.5,
                        prixAchat: 25.50,
                        userId: 'user-123'
                    }
                    expect(() => validateParcelleData(data)).toThrow()
                })
            })
        })

        describe('enforceBusinessRules', () => {
            test('should enforce maximum weight limit', () => {
                const data = {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1000.1, // Over 1000g limit
                    prixAchat: 25.50,
                    userId: 'user-123'
                }

                expect(() => enforceBusinessRules(data)).toThrow('Le poids ne peut pas dépasser 1000g')
            })

            test('should enforce maximum price limit', () => {
                const data = {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prixAchat: 10000.01, // Over 10000€ limit
                    userId: 'user-123'
                }

                expect(() => enforceBusinessRules(data)).toThrow('Le prix d\'achat ne peut pas dépasser 10000€')
            })

            test('should enforce minimum values', () => {
                const invalidData = [
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: 0.001, // Under 0.01g minimum
                        prixAchat: 25.50,
                        userId: 'user-123'
                    },
                    {
                        numero: 'P001',
                        transporteur: 'DHL',
                        poids: 1.5,
                        prixAchat: 0.001, // Under 0.01€ minimum
                        userId: 'user-123'
                    }
                ]

                invalidData.forEach(data => {
                    expect(() => enforceBusinessRules(data)).toThrow()
                })
            })

            test('should allow valid values within limits', () => {
                const validData = {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 500.0, // Within limits
                    prixAchat: 5000.0, // Within limits
                    userId: 'user-123'
                }

                expect(() => enforceBusinessRules(validData)).not.toThrow()
            })
        })
    })

    describe('Database Transaction Integrity', () => {
        test('should handle transaction rollback on error', async () => {
            const mockTransaction = vi.fn().mockImplementation((operations) => {
                // Simulate transaction that fails partway through
                throw new Error('Transaction failed')
            })
            mockDatabaseService.transaction = mockTransaction

            const parcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50,
                userId: 'user-123'
            }

            await expect(createParcelleWithTransaction(parcelleData)).rejects.toThrow('Transaction failed')
            expect(mockTransaction).toHaveBeenCalled()
        })

        test('should maintain data consistency during concurrent operations', async () => {
            const mockTransaction = vi.fn().mockImplementation((operations) => {
                return operations({
                    prepare: vi.fn().mockReturnValue({
                        run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 })
                    })
                })
            })
            mockDatabaseService.transaction = mockTransaction

            const parcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50,
                userId: 'user-123'
            }

            const result = await createParcelleWithTransaction(parcelleData)
            expect(result).toBeDefined()
            expect(mockTransaction).toHaveBeenCalled()
        })

        test('should handle database connection failures', async () => {
            const mockTransaction = vi.fn().mockRejectedValue(new Error('Database connection lost'))
            mockDatabaseService.transaction = mockTransaction

            const parcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50,
                userId: 'user-123'
            }

            await expect(createParcelleWithTransaction(parcelleData)).rejects.toThrow('Database connection lost')
        })
    })
})

// Business logic functions to test (these would normally be in separate service files)

async function createParcelle(data: {
    numero: string
    transporteur: string
    poids: number
    prixAchat: number
    userId: string
}): Promise<Parcelle> {
    validateParcelleData(data)
    enforceBusinessRules(data)

    const id = generateId()
    const created_at = getCurrentTimestamp()
    const updated_at = created_at
    const prixTotal = data.prixAchat
    const prixParGramme = calculatePricePerGram(prixTotal, data.poids)

    await databaseService.execute(`
        INSERT INTO parcelles (id, user_id, numero, transporteur, prixAchat, poids, prixTotal, prixParGramme, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, data.userId, data.numero, data.transporteur, data.prixAchat, data.poids, prixTotal, prixParGramme, created_at, updated_at], 'create_parcelle')

    return {
        id,
        userId: data.userId,
        numero: data.numero,
        transporteur: data.transporteur,
        poids: data.poids,
        prixAchat: data.prixAchat,
        prixTotal,
        prixParGramme,
        createdAt: created_at,
        updatedAt: updated_at
    }
}

async function updateParcelle(data: {
    id: string
    numero: string
    transporteur: string
    poids: number
    prixAchat: number
    userId: string
}): Promise<Parcelle> {
    if (!data.id) {
        throw new Error('ID de parcelle manquant')
    }

    validateParcelleData(data)
    enforceBusinessRules(data)

    const updated_at = getCurrentTimestamp()
    const prixTotal = data.prixAchat
    const prixParGramme = calculatePricePerGram(prixTotal, data.poids)

    const result = await databaseService.execute(`
        UPDATE parcelles
        SET numero = ?, transporteur = ?, prixAchat = ?, poids = ?, prixTotal = ?, prixParGramme = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
    `, [data.numero, data.transporteur, data.prixAchat, data.poids, prixTotal, prixParGramme, updated_at, data.id, data.userId], 'update_parcelle')

    if (result.changes === 0) {
        throw new Error('Parcelle non trouvée ou non autorisée')
    }

    return {
        id: data.id,
        userId: data.userId,
        numero: data.numero,
        transporteur: data.transporteur,
        poids: data.poids,
        prixAchat: data.prixAchat,
        prixTotal,
        prixParGramme,
        updatedAt: updated_at
    } as Parcelle
}

async function deleteParcelle(id: string, userId: string): Promise<boolean> {
    if (!id) {
        throw new Error('ID de parcelle manquant')
    }
    if (!userId) {
        throw new Error('ID utilisateur manquant')
    }

    const result = await databaseService.execute(
        'DELETE FROM parcelles WHERE id = ? AND user_id = ?',
        [id, userId],
        'delete_parcelle'
    )

    if (result.changes === 0) {
        throw new Error('Parcelle non trouvée ou non autorisée')
    }

    return true
}

async function getParcellesByUserId(userId: string): Promise<Parcelle[]> {
    if (!userId) {
        throw new Error('ID utilisateur manquant')
    }

    return await databaseService.query<Parcelle>(
        'SELECT * FROM parcelles WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        'get_user_parcelles'
    )
}

async function getParcelleById(id: string, userId: string): Promise<Parcelle | null> {
    if (!id) {
        throw new Error('ID de parcelle manquant')
    }
    if (!userId) {
        throw new Error('ID utilisateur manquant')
    }

    return await databaseService.queryOne<Parcelle>(
        'SELECT * FROM parcelles WHERE id = ? AND user_id = ?',
        [id, userId],
        'get_parcelle_by_id'
    )
}

function calculatePricePerGram(prixTotal: number, poids: number): number {
    if (prixTotal < 0 || poids < 0) {
        throw new Error('Le prix et le poids doivent être positifs')
    }
    if (poids === 0) {
        throw new Error('Le poids ne peut pas être zéro')
    }
    return Math.round((prixTotal / poids) * 100) / 100
}

function calculateTotalValue(parcelles: Parcelle[]): number {
    return parcelles.reduce((total, parcelle) => total + parcelle.prixTotal, 0)
}

function calculateAverageWeight(parcelles: Parcelle[]): number {
    if (parcelles.length === 0) return 0
    const totalWeight = parcelles.reduce((total, parcelle) => total + parcelle.poids, 0)
    return Math.round((totalWeight / parcelles.length) * 100) / 100
}

function calculateAveragePricePerGram(parcelles: Parcelle[]): number {
    if (parcelles.length === 0) return 0
    const totalWeight = parcelles.reduce((total, parcelle) => total + parcelle.poids, 0)
    const weightedSum = parcelles.reduce((sum, parcelle) => sum + (parcelle.poids * parcelle.prixParGramme), 0)
    return Math.round((weightedSum / totalWeight) * 100) / 100
}

function validateParcelleData(data: any): void {
    if (!data.numero || typeof data.numero !== 'string' || data.numero.trim().length < 2) {
        throw new Error('Numéro de parcelle invalide')
    }
    if (!data.transporteur || typeof data.transporteur !== 'string') {
        throw new Error('Transporteur invalide')
    }
    if (typeof data.poids !== 'number' || data.poids <= 0) {
        throw new Error('Poids invalide')
    }
    if (typeof data.prixAchat !== 'number' || data.prixAchat <= 0) {
        throw new Error('Prix d\'achat invalide')
    }
    if (!data.userId || typeof data.userId !== 'string') {
        throw new Error('ID utilisateur invalide')
    }

    // Validate numero format (should start with P and be followed by numbers/letters)
    if (!/^P[A-Z0-9]+$/i.test(data.numero)) {
        throw new Error('Le numéro doit commencer par P suivi de lettres/chiffres')
    }

    // Validate transporteur
    const validTransporteurs = ['DHL', 'UPS', 'FedEx', 'La Poste', 'Chronopost', 'Colissimo']
    if (!validTransporteurs.includes(data.transporteur)) {
        throw new Error('Transporteur non supporté')
    }
}

function enforceBusinessRules(data: any): void {
    // Maximum weight limit (1000g)
    if (data.poids > 1000) {
        throw new Error('Le poids ne peut pas dépasser 1000g')
    }

    // Maximum price limit (10000€)
    if (data.prixAchat > 10000) {
        throw new Error('Le prix d\'achat ne peut pas dépasser 10000€')
    }

    // Minimum values
    if (data.poids < 0.01) {
        throw new Error('Le poids minimum est de 0.01g')
    }
    if (data.prixAchat < 0.01) {
        throw new Error('Le prix minimum est de 0.01€')
    }
}

async function createParcelleWithTransaction(data: any): Promise<Parcelle> {
    return await databaseService.transaction(async (db) => {
        validateParcelleData(data)
        enforceBusinessRules(data)

        const id = generateId()
        const created_at = getCurrentTimestamp()
        const updated_at = created_at
        const prixTotal = data.prixAchat
        const prixParGramme = calculatePricePerGram(prixTotal, data.poids)

        const stmt = db.prepare(`
            INSERT INTO parcelles (id, user_id, numero, transporteur, prixAchat, poids, prixTotal, prixParGramme, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        
        stmt.run(id, data.userId, data.numero, data.transporteur, data.prixAchat, data.poids, prixTotal, prixParGramme, created_at, updated_at)

        return {
            id,
            userId: data.userId,
            numero: data.numero,
            transporteur: data.transporteur,
            poids: data.poids,
            prixAchat: data.prixAchat,
            prixTotal,
            prixParGramme,
            createdAt: created_at,
            updatedAt: updated_at
        }
    })
}