/**
 * User Authentication E2E Tests
 * Tests the complete authentication workflow from user perspective
 */

import { test, expect } from '@playwright/test';

test.describe('User Authentication Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should allow new user to register successfully', async ({ page }) => {
      // Navigate to registration page
      await page.click('text=Sign Up');
      await expect(page).toHaveURL('/auth/signup');

      // Fill registration form
      await page.fill('[data-testid="signup-name"]', 'John Doe');
      await page.fill('[data-testid="signup-email"]', 'john.doe@example.com');
      await page.fill('[data-testid="signup-password"]', 'SecurePassword123!');
      await page.fill('[data-testid="signup-confirm-password"]', 'SecurePassword123!');

      // Submit registration
      await page.click('[data-testid="signup-submit"]');

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL('/dashboard');
      
      // Should show welcome message
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, John Doe');
    });

    test('should show validation errors for invalid registration data', async ({ page }) => {
      await page.click('text=Sign Up');
      
      // Try to submit with empty fields
      await page.click('[data-testid="signup-submit"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="error-name"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="error-email"]')).toContainText('Email is required');
      await expect(page.locator('[data-testid="error-password"]')).toContainText('Password is required');
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.click('text=Sign Up');
      
      await page.fill('[data-testid="signup-name"]', 'John Doe');
      await page.fill('[data-testid="signup-email"]', 'invalid-email');
      await page.fill('[data-testid="signup-password"]', 'SecurePassword123!');
      await page.fill('[data-testid="signup-confirm-password"]', 'SecurePassword123!');
      
      await page.click('[data-testid="signup-submit"]');
      
      await expect(page.locator('[data-testid="error-email"]')).toContainText('Please enter a valid email');
    });

    test('should show error for weak password', async ({ page }) => {
      await page.click('text=Sign Up');
      
      await page.fill('[data-testid="signup-name"]', 'John Doe');
      await page.fill('[data-testid="signup-email"]', 'john@example.com');
      await page.fill('[data-testid="signup-password"]', '123');
      await page.fill('[data-testid="signup-confirm-password"]', '123');
      
      await page.click('[data-testid="signup-submit"]');
      
      await expect(page.locator('[data-testid="error-password"]')).toContainText('Password must be at least 8 characters');
    });

    test('should show error for password mismatch', async ({ page }) => {
      await page.click('text=Sign Up');
      
      await page.fill('[data-testid="signup-name"]', 'John Doe');
      await page.fill('[data-testid="signup-email"]', 'john@example.com');
      await page.fill('[data-testid="signup-password"]', 'SecurePassword123!');
      await page.fill('[data-testid="signup-confirm-password"]', 'DifferentPassword123!');
      
      await page.click('[data-testid="signup-submit"]');
      
      await expect(page.locator('[data-testid="error-confirm-password"]')).toContainText('Passwords do not match');
    });

    test('should show error for existing email', async ({ page }) => {
      await page.click('text=Sign Up');
      
      await page.fill('[data-testid="signup-name"]', 'John Doe');
      await page.fill('[data-testid="signup-email"]', 'existing@example.com');
      await page.fill('[data-testid="signup-password"]', 'SecurePassword123!');
      await page.fill('[data-testid="signup-confirm-password"]', 'SecurePassword123!');
      
      await page.click('[data-testid="signup-submit"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
    });
  });

  test.describe('User Login', () => {
    test('should allow existing user to login successfully', async ({ page }) => {
      // Navigate to login page
      await page.click('text=Sign In');
      await expect(page).toHaveURL('/auth/login');

      // Fill login form
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');

      // Submit login
      await page.click('[data-testid="login-submit"]');

      // Should redirect to dashboard after successful login
      await expect(page).toHaveURL('/dashboard');
      
      // Should show user information
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.click('text=Sign In');
      
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'wrongpassword');
      
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.click('text=Sign In');
      
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="error-email"]')).toContainText('Email is required');
      await expect(page.locator('[data-testid="error-password"]')).toContainText('Password is required');
    });

    test('should show loading state during login', async ({ page }) => {
      await page.click('text=Sign In');
      
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      
      // Click submit and immediately check for loading state
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="login-submit"]')).toContainText('Signing in...');
      await expect(page.locator('[data-testid="login-submit"]')).toBeDisabled();
    });

    test('should remember user preference for "Remember me"', async ({ page }) => {
      await page.click('text=Sign In');
      
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      await page.check('[data-testid="remember-me"]');
      
      await page.click('[data-testid="login-submit"]');
      
      await expect(page).toHaveURL('/dashboard');
      
      // Refresh page to check if user is still logged in
      await page.reload();
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('User Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should allow user to logout successfully', async ({ page }) => {
      // Click user menu
      await page.click('[data-testid="user-menu"]');
      
      // Click logout
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await expect(page).toHaveURL('/auth/login');
      
      // Should show logout success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('You have been logged out successfully');
    });

    test('should clear user session after logout', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });

    test('should show confirmation dialog for logout', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="logout-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="logout-dialog"]')).toContainText('Are you sure you want to logout?');
      
      // Cancel logout
      await page.click('[data-testid="cancel-logout"]');
      await expect(page.locator('[data-testid="logout-dialog"]')).not.toBeVisible();
      
      // Should still be on dashboard
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Password Reset', () => {
    test('should allow user to request password reset', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]');
      await expect(page).toHaveURL('/auth/forgot-password');
      
      // Enter email
      await page.fill('[data-testid="reset-email"]', 'test@example.com');
      await page.click('[data-testid="reset-submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset email sent');
    });

    test('should show error for non-existent email', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      await page.fill('[data-testid="reset-email"]', 'nonexistent@example.com');
      await page.click('[data-testid="reset-submit"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email not found');
    });

    test('should validate email format for password reset', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      await page.fill('[data-testid="reset-email"]', 'invalid-email');
      await page.click('[data-testid="reset-submit"]');
      
      await expect(page.locator('[data-testid="error-email"]')).toContainText('Please enter a valid email');
    });
  });

  test.describe('Session Management', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard');
      
      await expect(page).toHaveURL('/auth/login');
    });

    test('should redirect authenticated users from auth pages', async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      
      // Try to access login page while authenticated
      await page.goto('/auth/login');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle session expiration', async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      
      // Simulate session expiration by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('[data-testid="info-message"]')).toContainText('Your session has expired');
    });

    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      
      // Refresh page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('User Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should allow user to view profile', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-link"]');
      
      await expect(page).toHaveURL('/profile');
      await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-email"]')).toBeVisible();
    });

    test('should allow user to update profile information', async ({ page }) => {
      await page.goto('/profile');
      
      // Update name
      await page.fill('[data-testid="profile-name-input"]', 'Updated Name');
      await page.click('[data-testid="save-profile"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated successfully');
      
      // Should reflect changes
      await expect(page.locator('[data-testid="profile-name"]')).toContainText('Updated Name');
    });

    test('should allow user to change password', async ({ page }) => {
      await page.goto('/profile');
      
      // Navigate to change password section
      await page.click('[data-testid="change-password-tab"]');
      
      await page.fill('[data-testid="current-password"]', 'password123');
      await page.fill('[data-testid="new-password"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-new-password"]', 'NewPassword123!');
      
      await page.click('[data-testid="change-password-submit"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Password changed successfully');
    });

    test('should validate current password when changing password', async ({ page }) => {
      await page.goto('/profile');
      await page.click('[data-testid="change-password-tab"]');
      
      await page.fill('[data-testid="current-password"]', 'wrongpassword');
      await page.fill('[data-testid="new-password"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-new-password"]', 'NewPassword123!');
      
      await page.click('[data-testid="change-password-submit"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Current password is incorrect');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/auth/login');
      
      await expect(page.locator('[data-testid="login-email"]')).toHaveAttribute('aria-label', 'Email address');
      await expect(page.locator('[data-testid="login-password"]')).toHaveAttribute('aria-label', 'Password');
    });

    test('should announce form errors to screen readers', async ({ page }) => {
      await page.goto('/auth/login');
      
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="error-email"]')).toHaveAttribute('role', 'alert');
      await expect(page.locator('[data-testid="error-password"]')).toHaveAttribute('role', 'alert');
    });
  });
});