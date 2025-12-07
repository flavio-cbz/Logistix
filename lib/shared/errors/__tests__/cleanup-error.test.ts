/**
      expect(error.isOperational).toBe(true);
      expect(error.severity).toBe('medium');
      expect(error.context.timestamp).toBeDefined();
    });

    it('should create a CleanupError with custom properties', () => {
      const context = { operation: 'test', userId: 'user123' };
      const error = new CleanupError(
        'Custom error',
        'CUSTOM_CODE',
        context,
        'testField',
        400,
        false,
        'high'
      );

      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('testField');
      expect(error.isOperational).toBe(false);
      expect(error.severity).toBe('high');
      expect(error.context.operation).toBe('test');
      expect(error.context.userId).toBe('user123');
    });

    it('should serialize to JSON correctly', () => {
      const error = new CleanupError('Test error', 'TEST_CODE');
      const json = error.toJSON();

      expect(json.name).toBe('CleanupError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_CODE');
      expect(json.statusCode).toBe(500);
      expect(json.timestamp).toBeDefined();
    });
  });

describe.skip('ValidationError', () => {
  it('should create a ValidationError with correct defaults', () => {
    const error = new ValidationError('Invalid input', 'email');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.field).toBe('email');
    expect(error.severity).toBe('low');
  });
});

describe.skip('ErrorFactory', () => {
  it('should create appropriate error types based on message patterns', () => {
    const dbError = ErrorFactory.createError(
      new Error('Database connection failed'),
      'testOp'
    );
    expect(dbError).toBeInstanceOf(DatabaseError);

    const validationError = ErrorFactory.createError(
      new Error('Validation failed for field'),
      'testOp'
    );
    expect(validationError).toBeInstanceOf(ValidationError);

    const notFoundError = ErrorFactory.createError(
      new Error('Resource not found'),
      'testOp'
    );
    expect(notFoundError).toBeInstanceOf(NotFoundError);
  });
});
*/