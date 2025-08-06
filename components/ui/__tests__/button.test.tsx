/**
 * Button Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading...</div>
}));

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render with default variant', () => {
    render(<Button>Default button</Button>);
    
    const button = screen.getByRole('button', { name: /default button/i });
    expect(button).toHaveClass('bg-primary');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary button</Button>);
    
    const button = screen.getByRole('button', { name: /secondary button/i });
    expect(button).toHaveClass('bg-secondary');
  });

  it('should render with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('bg-destructive');
  });

  it('should render with outline variant', () => {
    render(<Button variant="outline">Outline button</Button>);
    
    const button = screen.getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('border');
  });

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost button</Button>);
    
    const button = screen.getByRole('button', { name: /ghost button/i });
    expect(button).toHaveClass('hover:bg-accent');
  });

  it('should render with link variant', () => {
    render(<Button variant="link">Link button</Button>);
    
    const button = screen.getByRole('button', { name: /link button/i });
    expect(button).toHaveClass('underline-offset-4');
  });

  it('should render with small size', () => {
    render(<Button size="sm">Small button</Button>);
    
    const button = screen.getByRole('button', { name: /small button/i });
    expect(button).toHaveClass('h-9');
  });

  it('should render with large size', () => {
    render(<Button size="lg">Large button</Button>);
    
    const button = screen.getByRole('button', { name: /large button/i });
    expect(button).toHaveClass('h-11');
  });

  it('should render with icon size', () => {
    render(<Button size="icon">🔍</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('should render as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link as button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /link as button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('should forward ref correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Button with ref</Button>);
    
    expect(ref).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom button</Button>);
    
    const button = screen.getByRole('button', { name: /custom button/i });
    expect(button).toHaveClass('custom-class');
  });

  it('should spread additional props', () => {
    render(<Button data-testid="custom-button" aria-label="Custom label">Button</Button>);
    
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
  });

  it('should handle keyboard events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Keyboard button</Button>);
    
    const button = screen.getByRole('button', { name: /keyboard button/i });
    
    // Test Enter key
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    // Test Space key
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should not handle keyboard events when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled keyboard button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled keyboard button/i });
    
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('Loading state', () => {
    it('should show loading state', () => {
      render(<Button loading>Loading button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should hide text when loading', () => {
      render(<Button loading>Loading button</Button>);
      
      expect(screen.queryByText('Loading button')).not.toBeInTheDocument();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Loading button</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Button aria-describedby="help-text">Accessible button</Button>);
      
      const button = screen.getByRole('button', { name: /accessible button/i });
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support aria-pressed for toggle buttons', () => {
      render(<Button aria-pressed="true">Toggle button</Button>);
      
      const button = screen.getByRole('button', { name: /toggle button/i });
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have proper focus styles', () => {
      render(<Button>Focusable button</Button>);
      
      const button = screen.getByRole('button', { name: /focusable button/i });
      button.focus();
      
      expect(button).toHaveFocus();
      expect(button).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Button variants combinations', () => {
    it('should combine variant and size classes correctly', () => {
      render(<Button variant="outline" size="lg">Large outline button</Button>);
      
      const button = screen.getByRole('button', { name: /large outline button/i });
      expect(button).toHaveClass('border', 'h-11');
    });

    it('should handle all variant and size combinations', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
      const sizes = ['default', 'sm', 'lg', 'icon'] as const;
      
      variants.forEach(variant => {
        sizes.forEach(size => {
          const { unmount } = render(
            <Button variant={variant} size={size}>
              {variant} {size}
            </Button>
          );
          
          const button = screen.getByRole('button');
          expect(button).toBeInTheDocument();
          
          unmount();
        });
      });
    });
  });
});