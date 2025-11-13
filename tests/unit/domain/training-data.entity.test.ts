import { describe, it, expect } from 'vitest';
import { TrainingData } from '../../../lib/domain/entities/training-data';

describe('TrainingData Entity', () => {
  it('creates valid training data', () => {
    const data = new TrainingData({
      id: 'training-1',
      attemptId: 'attempt-123',
      imageUrl: 'https://example.com/captcha.jpg',
      gapPosition: 147.5,
      annotationSource: 'automatic',
      annotatedAt: new Date().toISOString(),
      isValidated: false,
      puzzlePieceUrl: undefined,
      annotatedBy: undefined,
      metadata: undefined,
    });

    expect(data.id).toBe('training-1');
    expect(data.attemptId).toBe('attempt-123');
    expect(data.gapPosition).toBe(147.5);
    expect(data.annotationSource).toBe('automatic');
    expect(data.isValidated).toBe(false);
  });

  it('validates training data', () => {
    const data = new TrainingData({
      id: 'training-1',
      attemptId: 'attempt-123',
      imageUrl: 'https://example.com/captcha.jpg',
      gapPosition: 147.5,
      annotationSource: 'automatic',
      annotatedAt: new Date().toISOString(),
      isValidated: false,
      puzzlePieceUrl: undefined,
      annotatedBy: undefined,
      metadata: undefined,
    });

    const validated = data.validate('user-123');

    expect(validated.isValidated).toBe(true);
    expect(validated.annotatedBy).toBe('user-123');
    expect(validated.metadata?.validatedAt).toBeDefined();
  });

  it('updates gap position with manual correction', () => {
    const data = new TrainingData({
      id: 'training-1',
      attemptId: 'attempt-123',
      imageUrl: 'https://example.com/captcha.jpg',
      gapPosition: 147.5,
      annotationSource: 'automatic',
      annotatedAt: new Date().toISOString(),
      isValidated: false,
      puzzlePieceUrl: undefined,
      annotatedBy: undefined,
      metadata: undefined,
    });

    const corrected = data.updateGapPosition(150.0, 'user-123');

    expect(corrected.gapPosition).toBe(150.0);
    expect(corrected.annotationSource).toBe('manual');
    expect(corrected.annotatedBy).toBe('user-123');
    expect(corrected.isValidated).toBe(true);
    expect(corrected.metadata?.originalPosition).toBe(147.5);
  });

  it('preserves immutability when updating', () => {
    const original = new TrainingData({
      id: 'training-1',
      attemptId: 'attempt-123',
      imageUrl: 'https://example.com/captcha.jpg',
      gapPosition: 147.5,
      annotationSource: 'automatic',
      annotatedAt: new Date().toISOString(),
      isValidated: false,
      puzzlePieceUrl: undefined,
      annotatedBy: undefined,
      metadata: undefined,
    });

    const updated = original.validate('user-123');

    // Original should be unchanged
    expect(original.isValidated).toBe(false);
    expect(original.annotatedBy).toBeUndefined();

    // Updated should have new values
    expect(updated.isValidated).toBe(true);
    expect(updated.annotatedBy).toBe('user-123');
  });

  it('serializes to JSON correctly', () => {
    const props = {
      id: 'training-1',
      attemptId: 'attempt-123',
      imageUrl: 'https://example.com/captcha.jpg',
      gapPosition: 147.5,
      annotationSource: 'manual' as const,
      annotatedBy: 'user-123',
      annotatedAt: new Date().toISOString(),
      isValidated: true,
      puzzlePieceUrl: undefined,
      metadata: { note: 'test' },
    };

    const data = new TrainingData(props);
    const json = data.toJSON();

    expect(json).toEqual(props);
  });
});
