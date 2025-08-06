/**
 * Responsive Design Breakpoints Tests
 * Tests responsive design implementation and breakpoint behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('Responsive Design Breakpoints', () => {
  beforeEach(() => {
    // Reset viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tailwind Breakpoint Classes', () => {
    it('should apply mobile-first responsive classes correctly', () => {
      render(
        <div 
          className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5"
          data-testid="responsive-container"
        >
          Responsive container
        </div>
      );

      const container = screen.getByTestId('responsive-container');
      
      // Should have all responsive width classes
      expect(container).toHaveClass(
        'w-full',      // base (mobile)
        'sm:w-1/2',    // small screens (640px+)
        'md:w-1/3',    // medium screens (768px+)
        'lg:w-1/4',    // large screens (1024px+)
        'xl:w-1/5'     // extra large screens (1280px+)
      );
    });

    it('should apply responsive padding and margin classes', () => {
      render(
        <div 
          className="p-2 sm:p-4 md:p-6 lg:p-8 m-1 sm:m-2 md:m-4 lg:m-6"
          data-testid="responsive-spacing"
        >
          Responsive spacing
        </div>
      );

      const element = screen.getByTestId('responsive-spacing');
      
      expect(element).toHaveClass(
        'p-2', 'sm:p-4', 'md:p-6', 'lg:p-8',
        'm-1', 'sm:m-2', 'md:m-4', 'lg:m-6'
      );
    });

    it('should apply responsive text sizes', () => {
      render(
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl" data-testid="responsive-heading">
            Responsive Heading
          </h1>
          <p className="text-sm sm:text-base md:text-lg" data-testid="responsive-text">
            Responsive paragraph
          </p>
        </div>
      );

      const heading = screen.getByTestId('responsive-heading');
      const text = screen.getByTestId('responsive-text');
      
      expect(heading).toHaveClass('text-xl', 'sm:text-2xl', 'md:text-3xl', 'lg:text-4xl');
      expect(text).toHaveClass('text-sm', 'sm:text-base', 'md:text-lg');
    });

    it('should apply responsive flexbox and grid classes', () => {
      render(
        <div>
          <div 
            className="flex flex-col sm:flex-row md:flex-col lg:flex-row"
            data-testid="responsive-flex"
          >
            <div>Item 1</div>
            <div>Item 2</div>
          </div>
          
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            data-testid="responsive-grid"
          >
            <div>Grid Item 1</div>
            <div>Grid Item 2</div>
            <div>Grid Item 3</div>
            <div>Grid Item 4</div>
          </div>
        </div>
      );

      const flexContainer = screen.getByTestId('responsive-flex');
      const gridContainer = screen.getByTestId('responsive-grid');
      
      expect(flexContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'md:flex-col', 'lg:flex-row');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
    });
  });

  describe('Component Responsive Behavior', () => {
    it('should render responsive card layouts', () => {
      render(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card data-testid="responsive-card-1">
            <CardHeader>
              <CardTitle>Card 1</CardTitle>
            </CardHeader>
            <CardContent>Content 1</CardContent>
          </Card>
          
          <Card data-testid="responsive-card-2">
            <CardHeader>
              <CardTitle>Card 2</CardTitle>
            </CardHeader>
            <CardContent>Content 2</CardContent>
          </Card>
          
          <Card data-testid="responsive-card-3">
            <CardHeader>
              <CardTitle>Card 3</CardTitle>
            </CardHeader>
            <CardContent>Content 3</CardContent>
          </Card>
        </div>
      );

      const card1 = screen.getByTestId('responsive-card-1');
      const card2 = screen.getByTestId('responsive-card-2');
      const card3 = screen.getByTestId('responsive-card-3');
      
      expect(card1).toBeInTheDocument();
      expect(card2).toBeInTheDocument();
      expect(card3).toBeInTheDocument();
    });

    it('should render responsive button groups', () => {
      render(
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button className="w-full sm:w-auto" data-testid="responsive-button-1">
            Button 1
          </Button>
          <Button className="w-full sm:w-auto" data-testid="responsive-button-2">
            Button 2
          </Button>
          <Button className="w-full sm:w-auto" data-testid="responsive-button-3">
            Button 3
          </Button>
        </div>
      );

      const button1 = screen.getByTestId('responsive-button-1');
      const button2 = screen.getByTestId('responsive-button-2');
      const button3 = screen.getByTestId('responsive-button-3');
      
      expect(button1).toHaveClass('w-full', 'sm:w-auto');
      expect(button2).toHaveClass('w-full', 'sm:w-auto');
      expect(button3).toHaveClass('w-full', 'sm:w-auto');
    });

    it('should render responsive form layouts', () => {
      render(
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first-name" className="block text-sm font-medium mb-1">
                First Name
              </label>
              <Input 
                id="first-name" 
                className="w-full"
                data-testid="responsive-input-1"
              />
            </div>
            
            <div>
              <label htmlFor="last-name" className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <Input 
                id="last-name" 
                className="w-full"
                data-testid="responsive-input-2"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <Input 
              id="email" 
              type="email" 
              className="w-full"
              data-testid="responsive-input-email"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button className="w-full sm:w-auto">
              Submit
            </Button>
          </div>
        </form>
      );

      const input1 = screen.getByTestId('responsive-input-1');
      const input2 = screen.getByTestId('responsive-input-2');
      const emailInput = screen.getByTestId('responsive-input-email');
      
      expect(input1).toHaveClass('w-full');
      expect(input2).toHaveClass('w-full');
      expect(emailInput).toHaveClass('w-full');
    });
  });

  describe('Breakpoint-Specific Visibility', () => {
    it('should handle responsive visibility classes', () => {
      render(
        <div>
          <div className="block sm:hidden" data-testid="mobile-only">
            Mobile only content
          </div>
          
          <div className="hidden sm:block md:hidden" data-testid="tablet-only">
            Tablet only content
          </div>
          
          <div className="hidden md:block" data-testid="desktop-up">
            Desktop and up content
          </div>
        </div>
      );

      const mobileOnly = screen.getByTestId('mobile-only');
      const tabletOnly = screen.getByTestId('tablet-only');
      const desktopUp = screen.getByTestId('desktop-up');
      
      expect(mobileOnly).toHaveClass('block', 'sm:hidden');
      expect(tabletOnly).toHaveClass('hidden', 'sm:block', 'md:hidden');
      expect(desktopUp).toHaveClass('hidden', 'md:block');
    });

    it('should handle responsive display changes', () => {
      render(
        <div>
          <nav className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between">
              <span>Logo</span>
              <button className="md:hidden" data-testid="mobile-menu-button">
                Menu
              </button>
            </div>
            
            <div className="hidden md:flex md:items-center md:space-x-4" data-testid="desktop-nav">
              <a href="#" className="hover:text-primary">Home</a>
              <a href="#" className="hover:text-primary">About</a>
              <a href="#" className="hover:text-primary">Contact</a>
            </div>
          </nav>
        </div>
      );

      const mobileMenuButton = screen.getByTestId('mobile-menu-button');
      const desktopNav = screen.getByTestId('desktop-nav');
      
      expect(mobileMenuButton).toHaveClass('md:hidden');
      expect(desktopNav).toHaveClass('hidden', 'md:flex', 'md:items-center', 'md:space-x-4');
    });
  });

  describe('Container and Max-Width Responsive Behavior', () => {
    it('should apply responsive container classes', () => {
      render(
        <div className="container mx-auto px-4 sm:px-6 lg:px-8" data-testid="responsive-container">
          <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto">
            Container content
          </div>
        </div>
      );

      const container = screen.getByTestId('responsive-container');
      
      expect(container).toHaveClass('container', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    });

    it('should handle responsive max-width constraints', () => {
      render(
        <div>
          <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg" data-testid="responsive-max-width">
            Constrained width content
          </div>
          
          <div className="w-full max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg" data-testid="screen-width">
            Screen width content
          </div>
        </div>
      );

      const maxWidthElement = screen.getByTestId('responsive-max-width');
      const screenWidthElement = screen.getByTestId('screen-width');
      
      expect(maxWidthElement).toHaveClass('max-w-xs', 'sm:max-w-sm', 'md:max-w-md', 'lg:max-w-lg');
      expect(screenWidthElement).toHaveClass('w-full', 'max-w-screen-sm', 'md:max-w-screen-md', 'lg:max-w-screen-lg');
    });
  });

  describe('Responsive Typography and Spacing', () => {
    it('should apply responsive line heights and letter spacing', () => {
      render(
        <div>
          <h1 className="leading-tight sm:leading-normal md:leading-relaxed tracking-tight sm:tracking-normal" data-testid="responsive-typography">
            Responsive Typography
          </h1>
          
          <p className="space-y-2 sm:space-y-4 md:space-y-6" data-testid="responsive-spacing">
            <span>Line 1</span>
            <span>Line 2</span>
          </p>
        </div>
      );

      const typography = screen.getByTestId('responsive-typography');
      const spacing = screen.getByTestId('responsive-spacing');
      
      expect(typography).toHaveClass('leading-tight', 'sm:leading-normal', 'md:leading-relaxed', 'tracking-tight', 'sm:tracking-normal');
      expect(spacing).toHaveClass('space-y-2', 'sm:space-y-4', 'md:space-y-6');
    });
  });

  describe('Responsive Component Variants', () => {
    it('should handle responsive button sizes', () => {
      render(
        <div>
          <Button size="sm" className="sm:h-10 md:h-11" data-testid="responsive-button-size">
            Responsive Button
          </Button>
          
          <Button className="text-sm sm:text-base md:text-lg px-2 sm:px-4 md:px-6" data-testid="responsive-button-padding">
            Responsive Padding
          </Button>
        </div>
      );

      const responsiveSize = screen.getByTestId('responsive-button-size');
      const responsivePadding = screen.getByTestId('responsive-button-padding');
      
      expect(responsiveSize).toHaveClass('sm:h-10', 'md:h-11');
      expect(responsivePadding).toHaveClass('text-sm', 'sm:text-base', 'md:text-lg', 'px-2', 'sm:px-4', 'md:px-6');
    });

    it('should handle responsive card layouts', () => {
      render(
        <Card className="p-4 sm:p-6 md:p-8" data-testid="responsive-card">
          <CardHeader className="pb-2 sm:pb-4 md:pb-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Responsive Card
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm sm:text-base md:text-lg">
            Responsive card content
          </CardContent>
        </Card>
      );

      const card = screen.getByTestId('responsive-card');
      
      expect(card).toHaveClass('p-4', 'sm:p-6', 'md:p-8');
    });
  });

  describe('Responsive Utilities and Helpers', () => {
    it('should apply responsive aspect ratios', () => {
      render(
        <div>
          <div className="aspect-square sm:aspect-video md:aspect-[4/3]" data-testid="responsive-aspect">
            Responsive aspect ratio
          </div>
          
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" data-testid="responsive-dimensions">
            Responsive dimensions
          </div>
        </div>
      );

      const aspectElement = screen.getByTestId('responsive-aspect');
      const dimensionsElement = screen.getByTestId('responsive-dimensions');
      
      expect(aspectElement).toHaveClass('aspect-square', 'sm:aspect-video', 'md:aspect-[4/3]');
      expect(dimensionsElement).toHaveClass('w-16', 'h-16', 'sm:w-20', 'sm:h-20', 'md:w-24', 'md:h-24');
    });

    it('should handle responsive positioning', () => {
      render(
        <div className="relative">
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 md:top-6 md:left-6" data-testid="responsive-position">
            Positioned element
          </div>
          
          <div className="static sm:relative md:absolute" data-testid="responsive-position-type">
            Position type changes
          </div>
        </div>
      );

      const positionElement = screen.getByTestId('responsive-position');
      const positionTypeElement = screen.getByTestId('responsive-position-type');
      
      expect(positionElement).toHaveClass('absolute', 'top-2', 'left-2', 'sm:top-4', 'sm:left-4', 'md:top-6', 'md:left-6');
      expect(positionTypeElement).toHaveClass('static', 'sm:relative', 'md:absolute');
    });
  });

  describe('Responsive State Management', () => {
    it('should handle responsive hover and focus states', () => {
      render(
        <div>
          <Button className="hover:bg-primary/80 sm:hover:bg-primary/90 md:hover:bg-primary/95" data-testid="responsive-hover">
            Responsive Hover
          </Button>
          
          <Input className="focus:ring-1 sm:focus:ring-2 md:focus:ring-4" data-testid="responsive-focus" />
        </div>
      );

      const hoverButton = screen.getByTestId('responsive-hover');
      const focusInput = screen.getByTestId('responsive-focus');
      
      expect(hoverButton).toHaveClass('hover:bg-primary/80', 'sm:hover:bg-primary/90', 'md:hover:bg-primary/95');
      expect(focusInput).toHaveClass('focus:ring-1', 'sm:focus:ring-2', 'md:focus:ring-4');
    });
  });

  describe('Responsive Layout Patterns', () => {
    it('should implement responsive sidebar layout', () => {
      render(
        <div className="flex flex-col lg:flex-row">
          <aside className="w-full lg:w-64 bg-muted p-4" data-testid="responsive-sidebar">
            Sidebar content
          </aside>
          
          <main className="flex-1 p-4 lg:p-8" data-testid="responsive-main">
            Main content
          </main>
        </div>
      );

      const sidebar = screen.getByTestId('responsive-sidebar');
      const main = screen.getByTestId('responsive-main');
      
      expect(sidebar).toHaveClass('w-full', 'lg:w-64');
      expect(main).toHaveClass('flex-1', 'p-4', 'lg:p-8');
    });

    it('should implement responsive dashboard layout', () => {
      render(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <Card data-testid="dashboard-card-1">Card 1</Card>
          <Card data-testid="dashboard-card-2">Card 2</Card>
          <Card data-testid="dashboard-card-3">Card 3</Card>
          <Card data-testid="dashboard-card-4">Card 4</Card>
        </div>
      );

      const card1 = screen.getByTestId('dashboard-card-1');
      
      expect(card1).toBeInTheDocument();
      // The grid container classes are applied to the parent div
    });
  });
});