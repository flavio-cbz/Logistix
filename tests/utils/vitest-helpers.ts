/**
 * Test helpers and utilities for Vitest
 */

import { vi, expect } from 'vitest';
import type { CustomError } from '../../lib/errors/custom-error';

/**
 * Create a spy on console methods for testing logging
 */
export const createConsoleSpy = () => {
  const originalConsole = { ...console };
  
  const spies = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  };
  
  const restore = () => {
    Object.assign(console, originalConsole);
    Object.values(spies).forEach(spy => spy.mockRestore());
  };
  
  return { spies, restore };
};

/**
 * Create a mock function that resolves after a delay
 */
export const createDelayedMock = <T>(value: T, delay: number = 100) => {
  return vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(value), delay))
  );
};

/**
 * Create a mock function that rejects after a delay
 */
export const createDelayedErrorMock = (error: Error, delay: number = 100) => {
  return vi.fn().mockImplementation(() => 
    new Promise((_, reject) => setTimeout(() => reject(error), delay))
  );
};

/**
 * Assert that a validation error is thrown with specific field
 */
export const expectValidationError = async (
  fn: () => Promise<any> | any,
  expectedField?: string,
  expectedMessage?: string
) => {
  try {
    await fn();
    expect.fail('Expected function to throw a validation error');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    
    const customError = error as CustomError;
    expect(customError.code).toBe('VALIDATION_ERROR');
    
    if (expectedField) {
      expect(customError.field).toBe(expectedField);
    }
    
    if (expectedMessage) {
      expect(customError.message).toContain(expectedMessage);
    }
  }
};

/**
 * Assert that a not found error is thrown
 */
export const expectNotFoundError = async (
  fn: () => Promise<any> | any,
  expectedResource?: string
) => {
  try {
    await fn();
    expect.fail('Expected function to throw a not found error');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    
    const customError = error as CustomError;
    expect(customError.code).toBe('NOT_FOUND');
    
    if (expectedResource) {
      expect(customError.message).toContain(expectedResource);
    }
  }
};

/**
 * Assert that an authorization error is thrown
 */
export const expectAuthorizationError = async (
  fn: () => Promise<any> | any,
  expectedMessage?: string
) => {
  try {
    await fn();
    expect.fail('Expected function to throw an authorization error');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    
    const customError = error as CustomError;
    expect(customError.code).toBe('AUTHORIZATION_ERROR');
    
    if (expectedMessage) {
      expect(customError.message).toContain(expectedMessage);
    }
  }
};

/**
 * Wait for a specific amount of time (useful for testing async operations)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Assert that an object matches a partial structure
 */
export const expectPartialMatch = <T>(actual: T, expected: Partial<T>) => {
  Object.keys(expected).forEach(key => {
    expect(actual).toHaveProperty(key, expected[key as keyof T]);
  });
};

/**
 * Assert that an array contains objects matching partial structures
 */
export const expectArrayContainsPartial = <T>(
  actual: T[], 
  expected: Partial<T>[]
) => {
  expect(actual).toHaveLength(expected.length);
  
  expected.forEach((expectedItem, index) => {
    expectPartialMatch(actual[index], expectedItem);
  });
};

/**
 * Mock timestamp for Date.now()
 */
export const mockTimestamp = (timestamp: number) => {
  const originalDateNow = Date.now;
  Date.now = vi.fn(() => timestamp);
  
  return () => {
    Date.now = originalDateNow;
  };
};

/**
 * Mock UUID generation
 */
export const mockUUID = (uuid: string) => {
  const originalRandomUUID = crypto.randomUUID;
  crypto.randomUUID = vi.fn(() => uuid) as any;
  
  return () => {
    crypto.randomUUID = originalRandomUUID;
  };
};

/**
 * Reset all mocks
 */
export const resetMocks = (mocks: Record<string, any>) => {
  Object.values(mocks).forEach(mock => {
    if (mock && typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
};