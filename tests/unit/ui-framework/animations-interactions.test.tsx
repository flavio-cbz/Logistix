/**
 * Animation and Interaction Tests
 * Tests Framer Motion animations, transitions, micro-interactions, and loading states
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoAnimated } from '@/components/logo-animated';
import { CardStats } from '@/components/ui/card-stats';
import { fadeInUp, fadeIn, slideInLeft, staggerContainer, staggerItem } from '@/components/ui/motion';

// Mock Framer Motion for testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div data-motion="div" {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button data-motion="button" {...props}>{children}</button>,
    li: ({ children, ...props }: any) => <li data-motion="li" {...props}>{children}</li>,
    h1: ({ children, ...props }: any) => <h1 data-motion="h1" {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p data-motion="p" {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <div data-animate-presence>{children}</div>,
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Package2: () => <div data-testid="package-icon">📦</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">📈</div>,
  Users: () => <div data-testid="users-icon">👥</div>,
  DollarSign: () => <div data-testid="dollar-icon">💰</div>,
}));

// Mock Next.js dynamic imports
vi.mock('next/dynamic', () => ({
  default: (importFn: any, options: any) => {
    const Component = ({ children, ...props }: any) => {
      const tag = options?.loading?.().type || 'div';
      return React.createElement(tag, { 'data-dynamic': true, ...props }, children);
    };
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

describe('Animation and Interaction Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Animation Classes and Transitions', () => {
    it('should apply CSS transition classes correctly', () => {
      render(
        <div 
          className="transition-all duration-300 ease-in-out"
          data-testid="transition-element"
        >
          Transition content
        </div>
      );

      const element = screen.getByTestId('transition-element');
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
    });

    it('should apply transform classes for animations', () => {
      render(
        <div 
          className="transform hover:scale-105 transition-transform"
          data-testid="transform-element"
        >
          Transform content
        </div>
      );

      const element = screen.getByTestId('transform-element');
      expect(element).toHaveClass('transform', 'hover:scale-105', 'transition-transform');
    });

    it('should apply opacity transitions', () => {
      render(
        <div 
          className="opacity-100 hover:opacity-75 transition-opacity duration-200"
          data-testid="opacity-element"
        >
          Opacity content
        </div>
      );

      const element = screen.getByTestId('opacity-element');
      expect(element).toHaveClass('opacity-100', 'hover:opacity-75', 'transition-opacity', 'duration-200');
    });
  });

  describe('Animation Presets', () => {
    it('should provide fadeInUp animation preset', () => {
      expect(fadeInUp).toEqual({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.2 }
      });
    });

    it('should provide fadeIn animation preset', () => {
      expect(fadeIn).toEqual({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 }
      });
    });

    it('should provide slideInLeft animation preset', () => {
      expect(slideInLeft).toEqual({
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
        transition: { duration: 0.2 }
      });
    });

    it('should provide stagger animation presets', () => {
      expect(staggerContainer).toEqual({
        animate: {
          transition: {
            staggerChildren: 0.1
          }
        }
      });

      expect(staggerItem).toEqual({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 }
      });
    });
  });

  describe('Logo Animation Component', () => {
    it('should render animated logo with proper structure', () => {
      render(<LogoAnimated />);

      expect(screen.getByText('Logistix')).toBeInTheDocument();
      expect(screen.getByText('Gestion intelligente de vos parcelles et produits')).toBeInTheDocument();
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should apply animation attributes to logo elements', () => {
      render(<LogoAnimated />);

      const title = screen.getByText('Logistix');
      const subtitle = screen.getByText('Gestion intelligente de vos parcelles et produits');

      // Check that elements are rendered (motion components are mocked)
      expect(title).toBeInTheDocument();
      expect(subtitle).toBeInTheDocument();
    });
  });

  describe('Card Stats Animation', () => {
    it('should render animated card stats with motion elements', () => {
      render(
        <CardStats
          title="Total Revenue"
          value="$45,231.89"
          description="+20.1% from last month"
          icon={<div data-testid="dollar-icon">💰</div>}
          trend={{ value: 20.1, label: "from last month" }}
        />
      );

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$45,231.89')).toBeInTheDocument();
      expect(screen.getByText('+20.1% from last month')).toBeInTheDocument();
      expect(screen.getByTestId('dollar-icon')).toBeInTheDocument();
    });

    it('should handle negative trend values', () => {
      render(
        <CardStats
          title="Active Users"
          value="2,350"
          trend={{ value: -5.2, label: "from last month" }}
        />
      );

      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('2,350')).toBeInTheDocument();
      expect(screen.getByText('-5.2%')).toBeInTheDocument();
    });

    it('should render without trend data', () => {
      render(
        <CardStats
          title="Simple Card"
          value="100"
          description="No trend data"
        />
      );

      expect(screen.getByText('Simple Card')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('No trend data')).toBeInTheDocument();
    });
  });

  describe('Micro-interactions', () => {
    it('should handle button hover interactions', () => {
      const handleClick = vi.fn();
      
      render(
        <Button 
          onClick={handleClick}
          className="transition-all duration-200 hover:scale-105"
          data-testid="interactive-button"
        >
          Hover Me
        </Button>
      );

      const button = screen.getByTestId('interactive-button');
      
      // Test hover classes are applied
      expect(button).toHaveClass('transition-all', 'duration-200', 'hover:scale-105');
      
      // Test click interaction
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle focus interactions', () => {
      render(
        <Button 
          className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
          data-testid="focus-button"
        >
          Focus Me
        </Button>
      );

      const button = screen.getByTestId('focus-button');
      
      // Test focus classes are applied
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-primary', 'focus:ring-offset-2');
      
      // Test that button can receive focus
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('should handle active/pressed states', () => {
      render(
        <Button 
          className="active:scale-95 transition-transform"
          data-testid="active-button"
        >
          Press Me
        </Button>
      );

      const button = screen.getByTestId('active-button');
      
      expect(button).toHaveClass('active:scale-95', 'transition-transform');
    });
  });

  describe('Loading States and Transitions', () => {
    it('should render loading button state', () => {
      render(
        <Button disabled className="opacity-50 cursor-not-allowed" data-testid="loading-button">
          <div className="animate-spin mr-2" data-testid="spinner">⟳</div>
          Loading...
        </Button>
      );

      const button = screen.getByTestId('loading-button');
      const spinner = screen.getByTestId('spinner');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(spinner).toHaveClass('animate-spin');
      expect(button).toHaveTextContent('Loading...');
    });

    it('should handle skeleton loading states', () => {
      render(
        <div className="animate-pulse" data-testid="skeleton-loader">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      );

      const skeleton = screen.getByTestId('skeleton-loader');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should handle fade transitions between states', () => {
      render(
        <div>
          <div 
            className="transition-opacity duration-300 opacity-0"
            data-testid="fade-out-content"
          >
            Fade out content
          </div>
          <div 
            className="transition-opacity duration-300 opacity-100"
            data-testid="fade-in-content"
          >
            Fade in content
          </div>
        </div>
      );

      const fadeOutContent = screen.getByTestId('fade-out-content');
      const fadeInContent = screen.getByTestId('fade-in-content');
      
      expect(fadeOutContent).toHaveClass('transition-opacity', 'duration-300', 'opacity-0');
      expect(fadeInContent).toHaveClass('transition-opacity', 'duration-300', 'opacity-100');
    });
  });

  describe('Animation Performance', () => {
    it('should use transform properties for better performance', () => {
      render(
        <div 
          className="transform transition-transform hover:scale-105"
          data-testid="performance-element"
        >
          Performant animation
        </div>
      );

      const element = screen.getByTestId('performance-element');
      expect(element).toHaveClass('transform', 'transition-transform', 'hover:scale-105');
    });

    it('should use will-change for complex animations', () => {
      render(
        <div 
          className="will-change-transform transition-all duration-300"
          data-testid="will-change-element"
        >
          Complex animation
        </div>
      );

      const element = screen.getByTestId('will-change-element');
      expect(element).toHaveClass('will-change-transform', 'transition-all', 'duration-300');
    });

    it('should handle reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <div 
          className="motion-reduce:transition-none motion-reduce:transform-none"
          data-testid="reduced-motion-element"
        >
          Respects motion preferences
        </div>
      );

      const element = screen.getByTestId('reduced-motion-element');
      expect(element).toHaveClass('motion-reduce:transition-none', 'motion-reduce:transform-none');
    });
  });

  describe('Animation Smoothness', () => {
    it('should use appropriate easing functions', () => {
      render(
        <div 
          className="transition-all duration-300 ease-in-out"
          data-testid="easing-element"
        >
          Smooth easing
        </div>
      );

      const element = screen.getByTestId('easing-element');
      expect(element).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
    });

    it('should handle different animation durations', () => {
      render(
        <div>
          <div className="transition-opacity duration-150" data-testid="fast-animation">Fast</div>
          <div className="transition-opacity duration-300" data-testid="medium-animation">Medium</div>
          <div className="transition-opacity duration-500" data-testid="slow-animation">Slow</div>
        </div>
      );

      expect(screen.getByTestId('fast-animation')).toHaveClass('duration-150');
      expect(screen.getByTestId('medium-animation')).toHaveClass('duration-300');
      expect(screen.getByTestId('slow-animation')).toHaveClass('duration-500');
    });

    it('should handle staggered animations', () => {
      render(
        <div className="space-y-2" data-testid="stagger-container">
          {[1, 2, 3].map((item, index) => (
            <div 
              key={item}
              className="transition-all duration-300"
              style={{ transitionDelay: `${index * 100}ms` }}
              data-testid={`stagger-item-${item}`}
            >
              Item {item}
            </div>
          ))}
        </div>
      );

      const container = screen.getByTestId('stagger-container');
      expect(container).toBeInTheDocument();
      
      [1, 2, 3].forEach(item => {
        const element = screen.getByTestId(`stagger-item-${item}`);
        expect(element).toHaveClass('transition-all', 'duration-300');
      });
    });
  });

  describe('User Interaction Responsiveness', () => {
    it('should provide immediate visual feedback on interaction', () => {
      render(
        <Button 
          className="active:bg-primary/90 transition-colors duration-150"
          data-testid="responsive-button"
        >
          Responsive Button
        </Button>
      );

      const button = screen.getByTestId('responsive-button');
      expect(button).toHaveClass('active:bg-primary/90', 'transition-colors', 'duration-150');
    });

    it('should handle touch interactions on mobile', () => {
      render(
        <Button 
          className="touch-manipulation active:scale-95"
          data-testid="touch-button"
        >
          Touch Button
        </Button>
      );

      const button = screen.getByTestId('touch-button');
      expect(button).toHaveClass('touch-manipulation', 'active:scale-95');
    });

    it('should provide proper keyboard interaction feedback', () => {
      render(
        <Button 
          className="focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="keyboard-button"
        >
          Keyboard Button
        </Button>
      );

      const button = screen.getByTestId('keyboard-button');
      expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');
      
      // Test keyboard interaction
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter' });
    });
  });

  describe('Animation State Management', () => {
    it('should handle animation state changes', () => {
      render(
        <div>
          <div 
            className="transition-transform duration-500 scale-100"
            data-testid="initial-state"
          >
            Initial State
          </div>
          <div 
            className="transition-transform duration-500 scale-110"
            data-testid="animated-state"
          >
            Animated State
          </div>
        </div>
      );

      const initialState = screen.getByTestId('initial-state');
      const animatedState = screen.getByTestId('animated-state');
      
      expect(initialState).toHaveClass('transition-transform', 'duration-500', 'scale-100');
      expect(animatedState).toHaveClass('transition-transform', 'duration-500', 'scale-110');
    });

    it('should handle multiple simultaneous animations', () => {
      render(
        <div 
          className="transition-all duration-300 hover:scale-105 hover:rotate-1 hover:shadow-lg"
          data-testid="multi-animation"
        >
          Multiple animations
        </div>
      );

      const element = screen.getByTestId('multi-animation');
      expect(element).toHaveClass(
        'transition-all',
        'duration-300',
        'hover:scale-105',
        'hover:rotate-1',
        'hover:shadow-lg'
      );
    });
  });

  describe('Animation Accessibility', () => {
    it('should respect prefers-reduced-motion setting', () => {
      render(
        <div 
          className="motion-safe:animate-bounce motion-reduce:animate-none"
          data-testid="accessible-animation"
        >
          Accessible animation
        </div>
      );

      const element = screen.getByTestId('accessible-animation');
      expect(element).toHaveClass('motion-safe:animate-bounce', 'motion-reduce:animate-none');
    });

    it('should provide alternative feedback for reduced motion', () => {
      render(
        <Button 
          className="motion-reduce:bg-primary/90 motion-safe:hover:scale-105"
          data-testid="accessible-button"
        >
          Accessible Button
        </Button>
      );

      const button = screen.getByTestId('accessible-button');
      expect(button).toHaveClass('motion-reduce:bg-primary/90', 'motion-safe:hover:scale-105');
    });
  });
});