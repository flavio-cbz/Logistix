import { describe, it, expect } from 'vitest';
import { CaptchaAttempt } from '../../../lib/domain/entities/captcha-attempt';

describe('CaptchaAttempt Entity', () => {
  it('creates a valid captcha attempt', () => {
    const attempt = new CaptchaAttempt({
      id: 'test-id',
      userId: 'user-123',
      imageUrl: 'https://example.com/captcha.jpg',
      puzzlePieceUrl: 'https://example.com/piece.jpg',
      detectedPosition: 145.5,
      confidence: 0.92,
      status: 'pending',
      attemptedAt: new Date().toISOString(),
      actualPosition: undefined,
      solvedAt: undefined,
      errorMessage: undefined,
      metadata: undefined,
    });

    expect(attempt.id).toBe('test-id');
    expect(attempt.userId).toBe('user-123');
    expect(attempt.detectedPosition).toBe(145.5);
    expect(attempt.confidence).toBe(0.92);
    expect(attempt.status).toBe('pending');
  });

  it('marks attempt as success', () => {
    const attempt = new CaptchaAttempt({
      id: 'test-id',
      userId: 'user-123',
      imageUrl: 'https://example.com/captcha.jpg',
      detectedPosition: 145.5,
      confidence: 0.92,
      status: 'pending',
      attemptedAt: new Date().toISOString(),
      puzzlePieceUrl: undefined,
      actualPosition: undefined,
      solvedAt: undefined,
      errorMessage: undefined,
      metadata: undefined,
    });

    const successAttempt = attempt.markAsSuccess(147.0);

    expect(successAttempt.status).toBe('success');
    expect(successAttempt.actualPosition).toBe(147.0);
    expect(successAttempt.solvedAt).toBeDefined();
  });

  it('marks attempt as failed', () => {
    const attempt = new CaptchaAttempt({
      id: 'test-id',
      userId: 'user-123',
      imageUrl: 'https://example.com/captcha.jpg',
      detectedPosition: 145.5,
      confidence: 0.92,
      status: 'pending',
      attemptedAt: new Date().toISOString(),
      puzzlePieceUrl: undefined,
      actualPosition: undefined,
      solvedAt: undefined,
      errorMessage: undefined,
      metadata: undefined,
    });

    const failedAttempt = attempt.markAsFailed('Invalid position');

    expect(failedAttempt.status).toBe('failure');
    expect(failedAttempt.errorMessage).toBe('Invalid position');
    expect(failedAttempt.solvedAt).toBeDefined();
  });

  it('calculates accuracy correctly', () => {
    const attempt = new CaptchaAttempt({
      id: 'test-id',
      userId: 'user-123',
      imageUrl: 'https://example.com/captcha.jpg',
      detectedPosition: 145.0,
      confidence: 0.92,
      status: 'success',
      attemptedAt: new Date().toISOString(),
      actualPosition: 147.0,
      puzzlePieceUrl: undefined,
      solvedAt: new Date().toISOString(),
      errorMessage: undefined,
      metadata: undefined,
    });

    const accuracy = attempt.getAccuracy();
    expect(accuracy).toBeGreaterThan(90); // Error of 2px should give high accuracy
  });

  it('returns null accuracy when actual position is unknown', () => {
    const attempt = new CaptchaAttempt({
      id: 'test-id',
      userId: 'user-123',
      imageUrl: 'https://example.com/captcha.jpg',
      detectedPosition: 145.0,
      confidence: 0.92,
      status: 'pending',
      attemptedAt: new Date().toISOString(),
      puzzlePieceUrl: undefined,
      actualPosition: undefined,
      solvedAt: undefined,
      errorMessage: undefined,
      metadata: undefined,
    });

    expect(attempt.getAccuracy()).toBeNull();
  });

  it('determines if attempt is successful within tolerance', () => {
    const attempt = new CaptchaAttempt({
      id: 'test-id',
      userId: 'user-123',
      imageUrl: 'https://example.com/captcha.jpg',
      detectedPosition: 145.0,
      confidence: 0.92,
      status: 'success',
      attemptedAt: new Date().toISOString(),
      actualPosition: 147.0,
      puzzlePieceUrl: undefined,
      solvedAt: new Date().toISOString(),
      errorMessage: undefined,
      metadata: undefined,
    });

    expect(attempt.isSuccessful(5)).toBe(true); // Within 5px tolerance
    expect(attempt.isSuccessful(1)).toBe(false); // Not within 1px tolerance
  });

  it('serializes to JSON correctly', () => {
    const data = {
      id: 'test-id',
      userId: 'user-123',
      imageUrl: 'https://example.com/captcha.jpg',
      detectedPosition: 145.0,
      confidence: 0.92,
      status: 'pending' as const,
      attemptedAt: new Date().toISOString(),
      puzzlePieceUrl: undefined,
      actualPosition: undefined,
      solvedAt: undefined,
      errorMessage: undefined,
      metadata: undefined,
    };

    const attempt = new CaptchaAttempt(data);
    const json = attempt.toJSON();

    expect(json).toEqual(data);
  });
});
