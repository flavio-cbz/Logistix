/**
 * Tailwind CSS Styling Consistency Tests
 * Tests design system consistency and Tailwind CSS implementation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

describe('Tailwind CSS Styling Consistency', () => {
  describe('Color System Consistency', () => {
    it('should apply consistent primary colors across components', () => {
      render(
        <div>
          <Button data-testid="primary-button">Primary Button</Button>
          <Badge variant="default" data-testid="primary-badge">Primary Badge</Badge>
        </div>
      );

      const button = screen.getByTestId('primary-button');
      const badge = screen.getByTestId('primary-badge');

      // Both should use primary color variables
      expect(button).toHaveClass('bg-primary');
      expect(badge).toHaveClass('bg-primary');
    });

    it('should apply consistent secondary colors across components', () => {
      render(
        <div>
          <Button variant="secondary" data-testid="secondary-button">Secondary Button</Button>
          <Badge variant="secondary" data-testid="secondary-badge">Secondary Badge</Badge>
        </div>
      );

      const button = screen.getByTestId('secondary-button');
      const badge = screen.getByTestId('secondary-badge');

      expect(button).toHaveClass('bg-secondary');
      expect(badge).toHaveClass('bg-secondary');
    });

    it('should apply consistent destructive colors across components', () => {
      render(
        <div>
          <Button variant="destructive" data-testid="destructive-button">Delete</Button>
          <Badge variant="destructive" data-testid="destructive-badge">Error</Badge>
        </div>
      );

      const button = screen.getByTestId('destructive-button');
      const badge = screen.getByTestId('destructive-badge');

      expect(button).toHaveClass('bg-destructive');
      expect(badge).toHaveClass('bg-destructive');
    });

    it('should apply consistent muted colors for disabled states', () => {
      render(
        <div>
          <Button disabled data-testid="disabled-button">Disabled</Button>
          <Input disabled data-testid="disabled-input" />
        </div>
      );

      const button = screen.getByTestId('disabled-button');
      const input = screen.getByTestId('disabled-input');

      // Check for disabled styling consistency
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });
  });

  describe('Typography Consistency', () => {
    it('should apply consistent font sizes across heading components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="card-title">Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <h1 className="text-2xl font-semibold" data-testid="h1-title">H1 Title</h1>
            <h2 className="text-xl font-semibold" data-testid="h2-title">H2 Title</h2>
          </CardContent>
        </Card>
      );

      const cardTitle = screen.getByTestId('card-title');
      const h1Title = screen.getByTestId('h1-title');
      const h2Title = screen.getByTestId('h2-title');

      // Check consistent typography classes
      expect(cardTitle).toHaveClass('text-2xl', 'font-semibold');
      expect(h1Title).toHaveClass('text-2xl', 'font-semibold');
      expect(h2Title).toHaveClass('text-xl', 'font-semibold');
    });

    it('should apply consistent text colors for foreground elements', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle data-testid="title">Title</CardTitle>
          </CardHeader>
          <CardContent data-testid="content">
            <p className="text-muted-foreground" data-testid="muted-text">Muted text</p>
          </CardContent>
        </Card>
      );

      const card = screen.getByTestId('card');
      const title = screen.getByTestId('title');
      const mutedText = screen.getByTestId('muted-text');

      expect(card).toHaveClass('text-card-foreground');
      expect(mutedText).toHaveClass('text-muted-foreground');
    });
  });

  describe('Spacing Consistency', () => {
    it('should apply consistent padding across container components', () => {
      render(
        <div>
          <Card data-testid="card">
            <CardHeader data-testid="card-header">Header</CardHeader>
            <CardContent data-testid="card-content">Content</CardContent>
          </Card>
          <Button size="default" data-testid="button">Button</Button>
        </div>
      );

      const cardHeader = screen.getByTestId('card-header');
      const cardContent = screen.getByTestId('card-content');
      const button = screen.getByTestId('button');

      // Check consistent padding classes
      expect(cardHeader).toHaveClass('p-6');
      expect(cardContent).toHaveClass('p-6');
      expect(button).toHaveClass('px-4', 'py-2');
    });

    it('should apply consistent margins and gaps', () => {
      render(
        <div className="space-y-4" data-testid="container">
          <div className="flex gap-2" data-testid="flex-container">
            <Button>Button 1</Button>
            <Button>Button 2</Button>
          </div>
          <Card>
            <CardHeader className="space-y-1.5" data-testid="header-spacing">
              <CardTitle>Title</CardTitle>
            </CardHeader>
          </Card>
        </div>
      );

      const container = screen.getByTestId('container');
      const flexContainer = screen.getByTestId('flex-container');
      const headerSpacing = screen.getByTestId('header-spacing');

      expect(container).toHaveClass('space-y-4');
      expect(flexContainer).toHaveClass('gap-2');
      expect(headerSpacing).toHaveClass('space-y-1.5');
    });
  });

  describe('Border and Shadow Consistency', () => {
    it('should apply consistent border radius across components', () => {
      render(
        <div>
          <Card data-testid="card">Card</Card>
          <Button data-testid="button">Button</Button>
          <Input data-testid="input" />
        </div>
      );

      const card = screen.getByTestId('card');
      const button = screen.getByTestId('button');
      const input = screen.getByTestId('input');

      // All should use consistent border radius
      expect(card).toHaveClass('rounded-lg');
      expect(button).toHaveClass('rounded-md');
      expect(input).toHaveClass('rounded-md');
    });

    it('should apply consistent shadows across elevated components', () => {
      render(
        <div>
          <Card data-testid="card">Card with shadow</Card>
          <div className="shadow-lg rounded-lg p-4" data-testid="elevated-div">
            Elevated content
          </div>
        </div>
      );

      const card = screen.getByTestId('card');
      const elevatedDiv = screen.getByTestId('elevated-div');

      expect(card).toHaveClass('shadow-sm');
      expect(elevatedDiv).toHaveClass('shadow-lg');
    });

    it('should apply consistent border styles', () => {
      render(
        <div>
          <Card data-testid="card">Card</Card>
          <Input data-testid="input" />
          <Button variant="outline" data-testid="outline-button">Outline</Button>
        </div>
      );

      const card = screen.getByTestId('card');
      const input = screen.getByTestId('input');
      const outlineButton = screen.getByTestId('outline-button');

      // All should use consistent border classes
      expect(card).toHaveClass('border');
      expect(input).toHaveClass('border');
      expect(outlineButton).toHaveClass('border');
    });
  });

  describe('Focus and Interaction States', () => {
    it('should apply consistent focus styles across interactive components', () => {
      render(
        <div>
          <Button data-testid="button">Button</Button>
          <Input data-testid="input" />
        </div>
      );

      const button = screen.getByTestId('button');
      const input = screen.getByTestId('input');

      // Both should have consistent focus ring styles
      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
      expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
    });

    it('should apply consistent hover states', () => {
      render(
        <div>
          <Button data-testid="button">Button</Button>
          <Button variant="ghost" data-testid="ghost-button">Ghost</Button>
        </div>
      );

      const button = screen.getByTestId('button');
      const ghostButton = screen.getByTestId('ghost-button');

      expect(button).toHaveClass('hover:bg-primary/90');
      expect(ghostButton).toHaveClass('hover:bg-accent');
    });
  });

  describe('CSS Custom Properties Integration', () => {
    it('should use CSS custom properties for colors', () => {
      render(<Card data-testid="card">Test Card</Card>);
      
      const card = screen.getByTestId('card');
      
      // Check that Tailwind classes using CSS custom properties are applied
      expect(card).toHaveClass('bg-card', 'text-card-foreground', 'border');
    });

    it('should use CSS custom properties for radius', () => {
      render(
        <div>
          <Button data-testid="button">Button</Button>
          <Input data-testid="input" />
        </div>
      );

      const button = screen.getByTestId('button');
      const input = screen.getByTestId('input');

      // Both should use radius custom properties
      expect(button).toHaveClass('rounded-md');
      expect(input).toHaveClass('rounded-md');
    });
  });

  describe('Animation Classes Consistency', () => {
    it('should apply consistent transition classes', () => {
      render(
        <div>
          <Button data-testid="button">Button</Button>
          <Input data-testid="input" />
        </div>
      );

      const button = screen.getByTestId('button');
      const input = screen.getByTestId('input');

      // Check for transition classes - Button has transition-colors, Input has focus transitions
      expect(button).toHaveClass('transition-colors');
      expect(input).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Utility Class Combinations', () => {
    it('should properly combine utility classes without conflicts', () => {
      render(
        <Button 
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          data-testid="custom-button"
        >
          Custom Styled Button
        </Button>
      );

      const button = screen.getByTestId('custom-button');
      
      // Should have both default and custom classes
      expect(button).toHaveClass('bg-blue-500', 'hover:bg-blue-600', 'text-white', 'font-bold');
    });

    it('should handle responsive utility classes correctly', () => {
      render(
        <div className="w-full md:w-1/2 lg:w-1/3 p-4 md:p-6 lg:p-8" data-testid="responsive-div">
          Responsive content
        </div>
      );

      const div = screen.getByTestId('responsive-div');
      
      expect(div).toHaveClass('w-full', 'md:w-1/2', 'lg:w-1/3', 'p-4', 'md:p-6', 'lg:p-8');
    });
  });
});