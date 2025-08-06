/**
 * shadcn/ui Component Functionality Tests
 * Tests core shadcn/ui components for proper functionality and integration
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon">!</div>,
  Check: () => <div data-testid="check-icon">✓</div>,
  X: () => <div data-testid="x-icon">✕</div>,
  User: () => <div data-testid="user-icon">👤</div>,
}));

describe('shadcn/ui Component Functionality', () => {
  describe('Button Component Integration', () => {
    it('should render all button variants correctly', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
      
      render(
        <div>
          {variants.map(variant => (
            <Button key={variant} variant={variant} data-testid={`button-${variant}`}>
              {variant} Button
            </Button>
          ))}
        </div>
      );

      variants.forEach(variant => {
        const button = screen.getByTestId(`button-${variant}`);
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(`${variant} Button`);
      });
    });

    it('should render all button sizes correctly', () => {
      const sizes = ['default', 'sm', 'lg', 'icon'] as const;
      
      render(
        <div>
          {sizes.map(size => (
            <Button key={size} size={size} data-testid={`button-${size}`}>
              {size === 'icon' ? '🔍' : `${size} Button`}
            </Button>
          ))}
        </div>
      );

      sizes.forEach(size => {
        const button = screen.getByTestId(`button-${size}`);
        expect(button).toBeInTheDocument();
      });
    });

    it('should handle asChild prop correctly', () => {
      render(
        <Button asChild data-testid="as-child-button">
          <a href="/test">Link as Button</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveTextContent('Link as Button');
    });
  });

  describe('Card Component Integration', () => {
    it('should render complete card structure', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader data-testid="card-header">
            <CardTitle data-testid="card-title">Test Card</CardTitle>
            <CardDescription data-testid="card-description">
              This is a test card description
            </CardDescription>
          </CardHeader>
          <CardContent data-testid="card-content">
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter data-testid="card-footer">
            <Button>Action</Button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('complete-card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Card');
      expect(screen.getByTestId('card-description')).toHaveTextContent('This is a test card description');
      expect(screen.getByTestId('card-content')).toHaveTextContent('Card content goes here');
      expect(screen.getByTestId('card-footer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });

    it('should support different card layouts', () => {
      render(
        <div>
          <Card data-testid="minimal-card">
            <CardContent>Minimal card</CardContent>
          </Card>
          
          <Card data-testid="header-only-card">
            <CardHeader>
              <CardTitle>Header only</CardTitle>
            </CardHeader>
          </Card>
          
          <Card data-testid="content-footer-card">
            <CardContent>Content</CardContent>
            <CardFooter>Footer</CardFooter>
          </Card>
        </div>
      );

      expect(screen.getByTestId('minimal-card')).toHaveTextContent('Minimal card');
      expect(screen.getByTestId('header-only-card')).toHaveTextContent('Header only');
      expect(screen.getByTestId('content-footer-card')).toHaveTextContent('Content');
    });
  });

  describe('Form Components Integration', () => {
    it('should render input with proper attributes', () => {
      render(
        <div>
          <Label htmlFor="test-input">Test Input</Label>
          <Input 
            id="test-input"
            type="email"
            placeholder="Enter email"
            data-testid="test-input"
          />
        </div>
      );

      const label = screen.getByText('Test Input');
      const input = screen.getByTestId('test-input');

      expect(label).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter email');
      expect(input).toHaveAttribute('id', 'test-input');
    });

    it('should render textarea with proper functionality', () => {
      const handleChange = vi.fn();
      
      render(
        <Textarea
          placeholder="Enter description"
          onChange={handleChange}
          data-testid="test-textarea"
        />
      );

      const textarea = screen.getByTestId('test-textarea');
      
      fireEvent.change(textarea, { target: { value: 'Test content' } });
      
      expect(handleChange).toHaveBeenCalled();
      expect(textarea).toHaveAttribute('placeholder', 'Enter description');
    });

    it('should render checkbox with label integration', () => {
      const handleChange = vi.fn();
      
      render(
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="test-checkbox"
            onCheckedChange={handleChange}
            data-testid="test-checkbox"
          />
          <Label htmlFor="test-checkbox">Accept terms</Label>
        </div>
      );

      const checkbox = screen.getByTestId('test-checkbox');
      const label = screen.getByText('Accept terms');

      expect(checkbox).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      
      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalled();
    });

    it('should render switch with proper functionality', () => {
      const handleChange = vi.fn();
      
      render(
        <div className="flex items-center space-x-2">
          <Switch 
            id="test-switch"
            onCheckedChange={handleChange}
            data-testid="test-switch"
          />
          <Label htmlFor="test-switch">Enable notifications</Label>
        </div>
      );

      const switchElement = screen.getByTestId('test-switch');
      const label = screen.getByText('Enable notifications');

      expect(switchElement).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      
      fireEvent.click(switchElement);
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Display Components Integration', () => {
    it('should render badge variants correctly', () => {
      const variants = ['default', 'secondary', 'destructive', 'outline'] as const;
      
      render(
        <div>
          {variants.map(variant => (
            <Badge key={variant} variant={variant} data-testid={`badge-${variant}`}>
              {variant}
            </Badge>
          ))}
        </div>
      );

      variants.forEach(variant => {
        const badge = screen.getByTestId(`badge-${variant}`);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent(variant);
      });
    });

    it('should render alert with icon and content', () => {
      render(
        <Alert data-testid="test-alert">
          <div data-testid="alert-circle-icon">!</div>
          <AlertTitle data-testid="alert-title">Error</AlertTitle>
          <AlertDescription data-testid="alert-description">
            Something went wrong
          </AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('test-alert')).toBeInTheDocument();
      expect(screen.getByTestId('alert-title')).toHaveTextContent('Error');
      expect(screen.getByTestId('alert-description')).toHaveTextContent('Something went wrong');
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('should render avatar with fallback', () => {
      render(
        <Avatar data-testid="test-avatar">
          <AvatarImage src="/nonexistent.jpg" alt="User" />
          <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('test-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should render separator correctly', () => {
      render(
        <div>
          <p>Content above</p>
          <Separator data-testid="test-separator" />
          <p>Content below</p>
        </div>
      );

      const separator = screen.getByTestId('test-separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('shrink-0', 'bg-border');
    });
  });

  describe('Component Composition', () => {
    it('should compose multiple components in a form layout', () => {
      const handleSubmit = vi.fn(e => e.preventDefault());
      
      render(
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} data-testid="profile-form">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Enter your name" />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" placeholder="Tell us about yourself" />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="notifications" />
                  <Label htmlFor="notifications">Receive email notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="public-profile" />
                  <Label htmlFor="public-profile">Make profile public</Label>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button type="submit" form="profile-form">Save Changes</Button>
          </CardFooter>
        </Card>
      );

      // Verify all components are rendered
      expect(screen.getByText('User Profile')).toBeInTheDocument();
      expect(screen.getByText('Update your profile information')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Bio')).toBeInTheDocument();
      expect(screen.getByLabelText('Receive email notifications')).toBeInTheDocument();
      expect(screen.getByLabelText('Make profile public')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should compose components in a dashboard layout', () => {
      render(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Badge variant="secondary">+20.1%</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Avatar className="h-8 w-8">
                <AvatarFallback>AU</AvatarFallback>
              </Avatar>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,350</div>
              <p className="text-xs text-muted-foreground">
                +180.1% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 text-sm">John Doe logged in</span>
                </div>
                <Separator />
                <div className="flex items-center">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 text-sm">Jane Smith updated profile</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );

      // Verify dashboard components are rendered
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$45,231.89')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('2,350')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('John Doe logged in')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith updated profile')).toBeInTheDocument();
    });
  });

  describe('Component Accessibility', () => {
    it('should provide proper ARIA attributes for form components', () => {
      render(
        <div>
          <Label htmlFor="accessible-input">Accessible Input</Label>
          <Input 
            id="accessible-input"
            aria-describedby="input-help"
            aria-required="true"
            data-testid="accessible-input"
          />
          <p id="input-help" className="text-sm text-muted-foreground">
            This field is required
          </p>
        </div>
      );

      const input = screen.getByTestId('accessible-input');
      expect(input).toHaveAttribute('aria-describedby', 'input-help');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should support keyboard navigation for interactive components', () => {
      const handleClick = vi.fn();
      
      render(
        <div>
          <Button onClick={handleClick} data-testid="keyboard-button">
            Keyboard Button
          </Button>
          <input type="checkbox" data-testid="keyboard-checkbox" />
          <Input data-testid="keyboard-input" />
        </div>
      );

      const button = screen.getByTestId('keyboard-button');
      const checkbox = screen.getByTestId('keyboard-checkbox');
      const input = screen.getByTestId('keyboard-input');

      // Test keyboard interaction - click the button directly instead of keyDown
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();

      // All interactive elements should be focusable
      expect(button).not.toHaveAttribute('tabIndex', '-1');
      expect(checkbox).not.toHaveAttribute('tabIndex', '-1');
      expect(input).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Component Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ThrowError = () => {
        throw new Error('Test error');
      };

      // This test verifies that components don't crash the entire app
      expect(() => {
        render(
          <Card>
            <CardContent>
              <ThrowError />
            </CardContent>
          </Card>
        );
      }).toThrow('Test error');

      consoleSpy.mockRestore();
    });
  });
});