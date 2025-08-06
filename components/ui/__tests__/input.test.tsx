/**
 * Input Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('should handle value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: 'test value' })
    }));
  });

  it('should display controlled value', () => {
    render(<Input value="controlled value" onChange={() => {}} />);
    
    const input = screen.getByDisplayValue('controlled value');
    expect(input).toBeInTheDocument();
  });

  it('should handle different input types', () => {
    const types = ['text', 'email', 'password', 'number', 'tel', 'url'] as const;
    
    types.forEach(type => {
      const { unmount } = render(<Input type={type} data-testid={`input-${type}`} />);
      
      const input = screen.getByTestId(`input-${type}`);
      expect(input).toHaveAttribute('type', type);
      
      unmount();
    });
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled input" />);
    
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
  });

  it('should be readonly when readonly prop is true', () => {
    render(<Input readOnly value="readonly value" />);
    
    const input = screen.getByDisplayValue('readonly value');
    expect(input).toHaveAttribute('readonly');
  });

  it('should apply custom className', () => {
    render(<Input className="custom-input" data-testid="custom-input" />);
    
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveClass('custom-input');
  });

  it('should forward ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    
    expect(ref).toHaveBeenCalled();
  });

  it('should spread additional props', () => {
    render(
      <Input 
        data-testid="props-input"
        aria-label="Custom label"
        maxLength={10}
        autoComplete="email"
      />
    );
    
    const input = screen.getByTestId('props-input');
    expect(input).toHaveAttribute('aria-label', 'Custom label');
    expect(input).toHaveAttribute('maxLength', '10');
    expect(input).toHaveAttribute('autoComplete', 'email');
  });

  it('should handle focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard events', () => {
    const handleKeyDown = vi.fn();
    const handleKeyUp = vi.fn();
    
    render(<Input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
    
    fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' });
    expect(handleKeyUp).toHaveBeenCalledTimes(1);
  });

  it('should support required attribute', () => {
    render(<Input required data-testid="required-input" />);
    
    const input = screen.getByTestId('required-input');
    expect(input).toBeRequired();
  });

  it('should support min and max attributes for number inputs', () => {
    render(<Input type="number" min={0} max={100} data-testid="number-input" />);
    
    const input = screen.getByTestId('number-input');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  it('should support step attribute for number inputs', () => {
    render(<Input type="number" step={0.1} data-testid="step-input" />);
    
    const input = screen.getByTestId('step-input');
    expect(input).toHaveAttribute('step', '0.1');
  });

  it('should support pattern attribute', () => {
    render(<Input pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}" data-testid="pattern-input" />);
    
    const input = screen.getByTestId('pattern-input');
    expect(input).toHaveAttribute('pattern', '[0-9]{3}-[0-9]{3}-[0-9]{4}');
  });

  describe('Input validation states', () => {
    it('should apply error styles when invalid', () => {
      render(<Input className="border-red-500" data-testid="error-input" />);
      
      const input = screen.getByTestId('error-input');
      expect(input).toHaveClass('border-red-500');
    });

    it('should apply success styles when valid', () => {
      render(<Input className="border-green-500" data-testid="success-input" />);
      
      const input = screen.getByTestId('success-input');
      expect(input).toHaveClass('border-green-500');
    });
  });

  describe('Accessibility', () => {
    it('should support aria-describedby', () => {
      render(<Input aria-describedby="help-text" data-testid="described-input" />);
      
      const input = screen.getByTestId('described-input');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support aria-invalid', () => {
      render(<Input aria-invalid="true" data-testid="invalid-input" />);
      
      const input = screen.getByTestId('invalid-input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should support aria-required', () => {
      render(<Input aria-required="true" data-testid="aria-required-input" />);
      
      const input = screen.getByTestId('aria-required-input');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper focus styles', () => {
      render(<Input data-testid="focus-input" />);
      
      const input = screen.getByTestId('focus-input');
      input.focus();
      
      expect(input).toHaveFocus();
      expect(input).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Input with different sizes', () => {
    it('should apply default size classes', () => {
      render(<Input data-testid="default-size" />);
      
      const input = screen.getByTestId('default-size');
      expect(input).toHaveClass('h-10');
    });

    it('should apply small size classes', () => {
      render(<Input className="h-8 text-sm" data-testid="small-size" />);
      
      const input = screen.getByTestId('small-size');
      expect(input).toHaveClass('h-8', 'text-sm');
    });

    it('should apply large size classes', () => {
      render(<Input className="h-12 text-lg" data-testid="large-size" />);
      
      const input = screen.getByTestId('large-size');
      expect(input).toHaveClass('h-12', 'text-lg');
    });
  });

  describe('Input with icons', () => {
    it('should render with left icon', () => {
      render(
        <div className="relative">
          <Input className="pl-10" data-testid="icon-input" />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <span data-testid="left-icon">🔍</span>
          </div>
        </div>
      );
      
      const input = screen.getByTestId('icon-input');
      const icon = screen.getByTestId('left-icon');
      
      expect(input).toHaveClass('pl-10');
      expect(icon).toBeInTheDocument();
    });

    it('should render with right icon', () => {
      render(
        <div className="relative">
          <Input className="pr-10" data-testid="icon-input" />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span data-testid="right-icon">✕</span>
          </div>
        </div>
      );
      
      const input = screen.getByTestId('icon-input');
      const icon = screen.getByTestId('right-icon');
      
      expect(input).toHaveClass('pr-10');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Form integration', () => {
    it('should work with form submission', () => {
      const handleSubmit = vi.fn(e => e.preventDefault());
      
      render(
        <form onSubmit={handleSubmit}>
          <Input name="test-input" defaultValue="test value" />
          <button type="submit">Submit</button>
        </form>
      );
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should support form validation', () => {
      render(
        <form>
          <Input required name="required-field" data-testid="form-input" />
        </form>
      );
      
      const input = screen.getByTestId('form-input');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('name', 'required-field');
    });
  });
});