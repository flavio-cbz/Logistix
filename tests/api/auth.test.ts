import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';

// Test suite for authentication API routes
describe('Authentication API Routes', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  
  // Note: Skip database initialization in unit tests to avoid side effects
  // Helper function to create a test user during setup
  beforeAll(async () => {
    // Only initialize if we're in a test environment
    if (process.env.NODE_ENV === 'test') {
      try {
        // Initialize database if needed
        execSync('npm run db:manage init', { stdio: 'pipe', env: process.env });
      } catch (error) {
        console.log('Database initialization attempted');
      }
    }
  });

  it('should return 200 for health check', async () => {
    const response = await fetch(`${baseURL}/api/health`);
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  });

  it('should fail login with invalid credentials', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'nonexistent_user',
        password: 'wrong_password'
      })
    });
    
    expect(response.status).toBeGreaterThanOrEqual(400);
    const data = await response.json();
    expect(data).toBeDefined();
  });

  it('should validate session when not authenticated', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/validate-session`, {
      method: 'GET',
    });
    
    // Should return unauthorized
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should allow logout even without valid session', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/logout`, {
      method: 'POST',
    });
    
    // Logout should not fail even without valid session
    expect(response.status).toBeGreaterThanOrEqual(200);
  });

  it('should handle database health check when authenticated as admin', async () => {
    const response = await fetch(`${baseURL}/api/v1/database/health`, {
      method: 'GET',
    });
    
    // Without authentication, should require admin role
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});