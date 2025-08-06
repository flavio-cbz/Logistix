/**
 * Card Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card element', () => {
      render(<Card data-testid="card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Card content');
    });

    it('should apply default card styles', () => {
      render(<Card data-testid="card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    });

    it('should apply custom className', () => {
      render(<Card className="custom-card" data-testid="card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-card');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<Card ref={ref} data-testid="card">Card content</Card>);
      
      expect(ref.current).not.toBeNull();
    });

    it('should spread additional props', () => {
      render(
        <Card 
          data-testid="card"
          aria-label="Custom card"
          role="region"
        >
          Card content
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('aria-label', 'Custom card');
      expect(card).toHaveAttribute('role', 'region');
    });
  });

  describe('CardHeader', () => {
    it('should render card header', () => {
      render(
        <Card>
          <CardHeader data-testid="card-header">
            Header content
          </CardHeader>
        </Card>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Header content');
    });

    it('should apply default header styles', () => {
      render(
        <Card>
          <CardHeader data-testid="card-header">
            Header content
          </CardHeader>
        </Card>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('should apply custom className to header', () => {
      render(
        <Card>
          <CardHeader className="custom-header" data-testid="card-header">
            Header content
          </CardHeader>
        </Card>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('should render card title', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="card-title">Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const title = screen.getByTestId('card-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Card Title');
    });

    it('should apply default title styles', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="card-title">Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const title = screen.getByTestId('card-title');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('should render as h3 by default', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="card-title">Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const title = screen.getByTestId('card-title');
      expect(title.tagName).toBe('H3');
    });

    it('should support custom heading level', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle as="h1" data-testid="card-title">Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      const title = screen.getByTestId('card-title');
      expect(title.tagName).toBe('H1');
    });
  });

  describe('CardDescription', () => {
    it('should render card description', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="card-description">
              This is a card description
            </CardDescription>
          </CardHeader>
        </Card>
      );
      
      const description = screen.getByTestId('card-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('This is a card description');
    });

    it('should apply default description styles', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="card-description">
              This is a card description
            </CardDescription>
          </CardHeader>
        </Card>
      );
      
      const description = screen.getByTestId('card-description');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should render as p by default', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="card-description">
              This is a card description
            </CardDescription>
          </CardHeader>
        </Card>
      );
      
      const description = screen.getByTestId('card-description');
      expect(description.tagName).toBe('P');
    });
  });

  describe('CardContent', () => {
    it('should render card content', () => {
      render(
        <Card>
          <CardContent data-testid="card-content">
            Main content goes here
          </CardContent>
        </Card>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Main content goes here');
    });

    it('should apply default content styles', () => {
      render(
        <Card>
          <CardContent data-testid="card-content">
            Main content goes here
          </CardContent>
        </Card>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('should apply custom className to content', () => {
      render(
        <Card>
          <CardContent className="custom-content" data-testid="card-content">
            Main content goes here
          </CardContent>
        </Card>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('should render card footer', () => {
      render(
        <Card>
          <CardFooter data-testid="card-footer">
            Footer content
          </CardFooter>
        </Card>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveTextContent('Footer content');
    });

    it('should apply default footer styles', () => {
      render(
        <Card>
          <CardFooter data-testid="card-footer">
            Footer content
          </CardFooter>
        </Card>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('should apply custom className to footer', () => {
      render(
        <Card>
          <CardFooter className="custom-footer" data-testid="card-footer">
            Footer content
          </CardFooter>
        </Card>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Complete Card Structure', () => {
    it('should render complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Product Card</CardTitle>
            <CardDescription data-testid="description">
              A sample product card with all components
            </CardDescription>
          </CardHeader>
          <CardContent data-testid="content">
            <p>This is the main content of the card.</p>
          </CardContent>
          <CardFooter data-testid="footer">
            <button>Action Button</button>
          </CardFooter>
        </Card>
      );
      
      expect(screen.getByTestId('complete-card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('title')).toHaveTextContent('Product Card');
      expect(screen.getByTestId('description')).toHaveTextContent('A sample product card with all components');
      expect(screen.getByTestId('content')).toHaveTextContent('This is the main content of the card.');
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument();
    });

    it('should work with minimal card structure', () => {
      render(
        <Card data-testid="minimal-card">
          <CardContent>
            Just content, no header or footer
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('minimal-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Just content, no header or footer');
    });

    it('should work with header and content only', () => {
      render(
        <Card data-testid="header-content-card">
          <CardHeader>
            <CardTitle>Title Only</CardTitle>
          </CardHeader>
          <CardContent>
            Content without footer
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('header-content-card');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('Title Only')).toBeInTheDocument();
      expect(screen.getByText('Content without footer')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should support ARIA attributes', () => {
      render(
        <Card 
          data-testid="accessible-card"
          role="article"
          aria-labelledby="card-title"
          aria-describedby="card-description"
        >
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
            <CardDescription id="card-description">
              This card has proper ARIA attributes
            </CardDescription>
          </CardHeader>
          <CardContent>
            Card content
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('accessible-card');
      expect(card).toHaveAttribute('role', 'article');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      expect(card).toHaveAttribute('aria-describedby', 'card-description');
    });

    it('should support keyboard navigation when interactive', () => {
      render(
        <Card 
          data-testid="interactive-card"
          tabIndex={0}
          role="button"
          onClick={() => {}}
        >
          <CardContent>
            Interactive card content
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('interactive-card');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('role', 'button');
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes', () => {
      render(
        <Card className="w-full md:w-1/2 lg:w-1/3" data-testid="responsive-card">
          <CardContent>
            Responsive card
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('responsive-card');
      expect(card).toHaveClass('w-full', 'md:w-1/2', 'lg:w-1/3');
    });
  });

  describe('Card Variants', () => {
    it('should support elevated card variant', () => {
      render(
        <Card className="shadow-lg" data-testid="elevated-card">
          <CardContent>
            Elevated card
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('elevated-card');
      expect(card).toHaveClass('shadow-lg');
    });

    it('should support outlined card variant', () => {
      render(
        <Card className="border-2" data-testid="outlined-card">
          <CardContent>
            Outlined card
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('outlined-card');
      expect(card).toHaveClass('border-2');
    });

    it('should support filled card variant', () => {
      render(
        <Card className="bg-primary text-primary-foreground" data-testid="filled-card">
          <CardContent>
            Filled card
          </CardContent>
        </Card>
      );
      
      const card = screen.getByTestId('filled-card');
      expect(card).toHaveClass('bg-primary', 'text-primary-foreground');
    });
  });
});