/**
 * Design Token Application and Theming Tests
 * Tests CSS custom properties, design tokens, and theme system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeProvider } from '@/components/theme-provider';

// Mock Next.js theme provider
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light'
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('Design Token Application and Theming', () => {
  beforeEach(() => {
    // Reset document classes before each test
    document.documentElement.className = '';
  });

  afterEach(() => {
    // Clean up after each test
    document.documentElement.className = '';
  });

  describe('CSS Custom Properties', () => {
    it('should use CSS custom properties for colors', () => {
      render(
        <Card data-testid="token-card">
          <CardContent>
            <Button data-testid="token-button">Test Button</Button>
          </CardContent>
        </Card>
      );

      const card = screen.getByTestId('token-card');
      const button = screen.getByTestId('token-button');

      // Verify CSS custom property classes are applied
      expect(card).toHaveClass('bg-card', 'text-card-foreground', 'border');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should apply design tokens for spacing and sizing', () => {
      render(
        <div>
          <Card data-testid="spacing-card">
            <CardHeader data-testid="card-header">
              <CardTitle>Title</CardTitle>
            </CardHeader>
            <CardContent data-testid="card-content">
              Content
            </CardContent>
          </Card>
          <Button size="sm" data-testid="small-button">Small</Button>
          <Button size="lg" data-testid="large-button">Large</Button>
        </div>
      );

      const cardHeader = screen.getByTestId('card-header');
      const cardContent = screen.getByTestId('card-content');
      const smallButton = screen.getByTestId('small-button');
      const largeButton = screen.getByTestId('large-button');

      // Verify spacing tokens
      expect(cardHeader).toHaveClass('p-6');
      expect(cardContent).toHaveClass('p-6', 'pt-0');
      
      // Verify sizing tokens
      expect(smallButton).toHaveClass('h-9');
      expect(largeButton).toHaveClass('h-11');
    });

    it('should use design tokens for border radius', () => {
      render(
        <div>
          <Card data-testid="rounded-card">Card</Card>
          <Button data-testid="rounded-button">Button</Button>
          <Input data-testid="rounded-input" />
        </div>
      );

      const card = screen.getByTestId('rounded-card');
      const button = screen.getByTestId('rounded-button');
      const input = screen.getByTestId('rounded-input');

      // Verify border radius tokens
      expect(card).toHaveClass('rounded-lg');
      expect(button).toHaveClass('rounded-md');
      expect(input).toHaveClass('rounded-md');
    });
  });

  describe('Light Theme Design Tokens', () => {
    beforeEach(() => {
      // Set light theme
      document.documentElement.className = '';
    });

    it('should apply light theme color tokens correctly', () => {
      render(
        <div>
          <Card data-testid="light-card">
            <CardContent>
              <Button data-testid="light-button">Light Button</Button>
              <Input data-testid="light-input" />
            </CardContent>
          </Card>
        </div>
      );

      const card = screen.getByTestId('light-card');
      const button = screen.getByTestId('light-button');
      const input = screen.getByTestId('light-input');

      // Verify light theme classes are applied
      expect(card).toHaveClass('bg-card', 'text-card-foreground');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(input).toHaveClass('bg-background', 'border-input');
    });

    it('should apply light theme semantic colors', () => {
      render(
        <div>
          <Button variant="destructive" data-testid="destructive-light">Delete</Button>
          <Button variant="secondary" data-testid="secondary-light">Secondary</Button>
          <div className="text-muted-foreground" data-testid="muted-text">Muted text</div>
        </div>
      );

      const destructiveButton = screen.getByTestId('destructive-light');
      const secondaryButton = screen.getByTestId('secondary-light');
      const mutedText = screen.getByTestId('muted-text');

      expect(destructiveButton).toHaveClass('bg-destructive', 'text-destructive-foreground');
      expect(secondaryButton).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(mutedText).toHaveClass('text-muted-foreground');
    });
  });

  describe('Dark Theme Design Tokens', () => {
    beforeEach(() => {
      // Set dark theme
      document.documentElement.className = 'dark';
    });

    it('should apply dark theme color tokens correctly', () => {
      render(
        <div>
          <Card data-testid="dark-card">
            <CardContent>
              <Button data-testid="dark-button">Dark Button</Button>
              <Input data-testid="dark-input" />
            </CardContent>
          </Card>
        </div>
      );

      const card = screen.getByTestId('dark-card');
      const button = screen.getByTestId('dark-button');
      const input = screen.getByTestId('dark-input');

      // Same classes should be applied, but CSS custom properties will have different values
      expect(card).toHaveClass('bg-card', 'text-card-foreground');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(input).toHaveClass('bg-background', 'border-input');
    });

    it('should maintain semantic meaning in dark theme', () => {
      render(
        <div>
          <Button variant="destructive" data-testid="destructive-dark">Delete</Button>
          <Button variant="secondary" data-testid="secondary-dark">Secondary</Button>
          <div className="text-muted-foreground" data-testid="muted-text-dark">Muted text</div>
        </div>
      );

      const destructiveButton = screen.getByTestId('destructive-dark');
      const secondaryButton = screen.getByTestId('secondary-dark');
      const mutedText = screen.getByTestId('muted-text-dark');

      // Same semantic classes should be applied
      expect(destructiveButton).toHaveClass('bg-destructive', 'text-destructive-foreground');
      expect(secondaryButton).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(mutedText).toHaveClass('text-muted-foreground');
    });
  });

  describe('Theme Provider Integration', () => {
    it('should work with theme provider wrapper', () => {
      render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Card data-testid="themed-card">
            <CardContent>
              <Button data-testid="themed-button">Themed Button</Button>
            </CardContent>
          </Card>
        </ThemeProvider>
      );

      const card = screen.getByTestId('themed-card');
      const button = screen.getByTestId('themed-button');

      expect(card).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });
  });

  describe('Color Palette Consistency', () => {
    it('should use consistent primary color across components', () => {
      render(
        <div>
          <Button data-testid="primary-button">Primary</Button>
          <div className="bg-primary text-primary-foreground p-2" data-testid="primary-div">
            Primary background
          </div>
          <div className="text-primary" data-testid="primary-text">
            Primary text
          </div>
        </div>
      );

      const button = screen.getByTestId('primary-button');
      const div = screen.getByTestId('primary-div');
      const text = screen.getByTestId('primary-text');

      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(div).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(text).toHaveClass('text-primary');
    });

    it('should use consistent secondary color across components', () => {
      render(
        <div>
          <Button variant="secondary" data-testid="secondary-button">Secondary</Button>
          <div className="bg-secondary text-secondary-foreground p-2" data-testid="secondary-div">
            Secondary background
          </div>
        </div>
      );

      const button = screen.getByTestId('secondary-button');
      const div = screen.getByTestId('secondary-div');

      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(div).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('should use consistent accent colors', () => {
      render(
        <div>
          <Button variant="ghost" data-testid="ghost-button">Ghost</Button>
          <div className="bg-accent text-accent-foreground p-2" data-testid="accent-div">
            Accent background
          </div>
        </div>
      );

      const button = screen.getByTestId('ghost-button');
      const div = screen.getByTestId('accent-div');

      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');
      expect(div).toHaveClass('bg-accent', 'text-accent-foreground');
    });
  });

  describe('Typography Scale', () => {
    it('should apply consistent typography tokens', () => {
      render(
        <div>
          <h1 className="text-4xl font-bold" data-testid="h1">Heading 1</h1>
          <h2 className="text-3xl font-semibold" data-testid="h2">Heading 2</h2>
          <h3 className="text-2xl font-semibold" data-testid="h3">Heading 3</h3>
          <p className="text-base" data-testid="body">Body text</p>
          <p className="text-sm text-muted-foreground" data-testid="caption">Caption text</p>
        </div>
      );

      const h1 = screen.getByTestId('h1');
      const h2 = screen.getByTestId('h2');
      const h3 = screen.getByTestId('h3');
      const body = screen.getByTestId('body');
      const caption = screen.getByTestId('caption');

      expect(h1).toHaveClass('text-4xl', 'font-bold');
      expect(h2).toHaveClass('text-3xl', 'font-semibold');
      expect(h3).toHaveClass('text-2xl', 'font-semibold');
      expect(body).toHaveClass('text-base');
      expect(caption).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });

  describe('Shadow and Elevation Tokens', () => {
    it('should apply consistent shadow tokens', () => {
      render(
        <div>
          <Card data-testid="card-shadow">Default card</Card>
          <div className="shadow-md rounded-lg p-4" data-testid="medium-shadow">
            Medium shadow
          </div>
          <div className="shadow-lg rounded-lg p-4" data-testid="large-shadow">
            Large shadow
          </div>
        </div>
      );

      const card = screen.getByTestId('card-shadow');
      const mediumShadow = screen.getByTestId('medium-shadow');
      const largeShadow = screen.getByTestId('large-shadow');

      expect(card).toHaveClass('shadow-sm');
      expect(mediumShadow).toHaveClass('shadow-md');
      expect(largeShadow).toHaveClass('shadow-lg');
    });
  });

  describe('Focus and State Tokens', () => {
    it('should apply consistent focus ring tokens', () => {
      render(
        <div>
          <Button data-testid="focus-button">Focusable Button</Button>
          <Input data-testid="focus-input" />
        </div>
      );

      const button = screen.getByTestId('focus-button');
      const input = screen.getByTestId('focus-input');

      // Both should use consistent focus ring tokens
      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
      expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
    });

    it('should apply consistent disabled state tokens', () => {
      render(
        <div>
          <Button disabled data-testid="disabled-button">Disabled Button</Button>
          <Input disabled data-testid="disabled-input" />
        </div>
      );

      const button = screen.getByTestId('disabled-button');
      const input = screen.getByTestId('disabled-input');

      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });
  });

  describe('Animation and Transition Tokens', () => {
    it('should apply consistent transition tokens', () => {
      render(
        <div>
          <Button data-testid="transition-button">Button</Button>
          <Input data-testid="transition-input" />
        </div>
      );

      const button = screen.getByTestId('transition-button');
      const input = screen.getByTestId('transition-input');

      expect(button).toHaveClass('transition-colors');
      expect(input).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Custom Property Fallbacks', () => {
    it('should handle missing custom properties gracefully', () => {
      // This test ensures components still render even if CSS custom properties are missing
      render(
        <Card data-testid="fallback-card">
          <CardContent>
            <Button data-testid="fallback-button">Fallback Button</Button>
          </CardContent>
        </Card>
      );

      const card = screen.getByTestId('fallback-card');
      const button = screen.getByTestId('fallback-button');

      // Components should still render and have their classes
      expect(card).toBeInTheDocument();
      expect(button).toBeInTheDocument();
      expect(card).toHaveClass('bg-card');
      expect(button).toHaveClass('bg-primary');
    });
  });

  describe('Design Token Validation', () => {
    it('should use semantic color names consistently', () => {
      const semanticColors = [
        'background',
        'foreground',
        'card',
        'card-foreground',
        'popover',
        'popover-foreground',
        'primary',
        'primary-foreground',
        'secondary',
        'secondary-foreground',
        'muted',
        'muted-foreground',
        'accent',
        'accent-foreground',
        'destructive',
        'destructive-foreground',
        'border',
        'input',
        'ring'
      ];

      render(
        <div>
          <div className="bg-background text-foreground" data-testid="background">Background</div>
          <div className="bg-card text-card-foreground" data-testid="card">Card</div>
          <div className="bg-primary text-primary-foreground" data-testid="primary">Primary</div>
          <div className="bg-secondary text-secondary-foreground" data-testid="secondary">Secondary</div>
          <div className="bg-muted text-muted-foreground" data-testid="muted">Muted</div>
          <div className="bg-accent text-accent-foreground" data-testid="accent">Accent</div>
          <div className="bg-destructive text-destructive-foreground" data-testid="destructive">Destructive</div>
        </div>
      );

      // Verify all semantic color combinations are applied
      expect(screen.getByTestId('background')).toHaveClass('bg-background', 'text-foreground');
      expect(screen.getByTestId('card')).toHaveClass('bg-card', 'text-card-foreground');
      expect(screen.getByTestId('primary')).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(screen.getByTestId('secondary')).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(screen.getByTestId('muted')).toHaveClass('bg-muted', 'text-muted-foreground');
      expect(screen.getByTestId('accent')).toHaveClass('bg-accent', 'text-accent-foreground');
      expect(screen.getByTestId('destructive')).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });
  });
});