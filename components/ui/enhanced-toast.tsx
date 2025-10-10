"use client";

import React from 'react';
import { Toast as ToastPrimitive, ToastProvider, ToastViewport } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Clock
} from 'lucide-react';

// Types étendus pour les toasts
export interface EnhancedToastProps {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

// Icônes pour chaque type de toast
const toastIcons = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info
};

// Classes de couleur pour chaque variante
const toastVariants = {
  default: {
    container: "border-border bg-background text-foreground",
    icon: "text-muted-foreground"
  },
  success: {
    container: "border-green-200 bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100",
    icon: "text-green-600 dark:text-green-400"
  },
  error: {
    container: "border-red-200 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400"
  },
  warning: {
    container: "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100",
    icon: "text-yellow-600 dark:text-yellow-400"
  },
  info: {
    container: "border-blue-200 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400"
  }
};

export function EnhancedToast() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = 'default', ...props }) {
        const IconComponent = toastIcons[variant as keyof typeof toastIcons] || Info;
        const variantClasses = toastVariants[variant as keyof typeof toastVariants] || toastVariants.default;
        
        return (
          <ToastPrimitive
            key={id}
            className={cn(
              "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
              "data-[swipe=cancel]:translate-x-0",
              "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
              "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
              "data-[swipe=move]:transition-none",
              "data-[state=open]:animate-in",
              "data-[state=closed]:animate-out",
              "data-[swipe=end]:animate-out",
              "data-[state=closed]:fade-out-80",
              "data-[state=closed]:slide-out-to-right-full",
              "data-[state=open]:slide-in-from-top-full",
              "data-[state=open]:sm:slide-in-from-bottom-full",
              variantClasses.container
            )}
            {...props}
          >
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <IconComponent className={cn("h-5 w-5 mt-0.5 flex-shrink-0", variantClasses.icon)} />
              
              <div className="flex-1 min-w-0">
                {title && (
                  <div className="text-sm font-semibold mb-1">
                    {title}
                  </div>
                )}
                {description && (
                  <div className="text-sm opacity-90 break-words">
                    {description}
                  </div>
                )}
              </div>
            </div>
            
            {action}
            
            <button
              onClick={() => dismiss(id)}
              className={cn(
                "absolute right-2 top-2 rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity",
                "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:pointer-events-none"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </ToastPrimitive>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

// Hook personnalisé pour utiliser les toasts améliorés
export function useEnhancedToast() {
  const { toast: baseToast } = useToast();
  
  const toast = React.useCallback((props: EnhancedToastProps) => {
    // Map enhanced variants to base toast variants
    const baseVariant = props.variant === 'error' ? 'destructive' : 
                       props.variant || 'default';
    
    const toastProps: any = {
      variant: baseVariant,
      duration: props.persistent ? Infinity : (props.duration || 4000)
    };
    
    if (typeof props.title === 'string') {
      toastProps.title = props.title;
    }
    
    if (props.description) {
      toastProps.description = props.description;
    }
    
    if (props.action) {
      toastProps.action = props.action;
    }
    
    return baseToast(toastProps);
  }, [baseToast]);
  
  // Méthodes de raccourci pour chaque type
  const success = React.useCallback((title: string, description?: string, options?: Partial<EnhancedToastProps>) => {
    return toast({
      variant: 'success',
      title,
      description,
      ...options
    });
  }, [toast]);
  
  const error = React.useCallback((title: string, description?: string, options?: Partial<EnhancedToastProps>) => {
    return toast({
      variant: 'error',
      title,
      description,
      ...options
    });
  }, [toast]);
  
  const warning = React.useCallback((title: string, description?: string, options?: Partial<EnhancedToastProps>) => {
    return toast({
      variant: 'warning',
      title,
      description,
      ...options
    });
  }, [toast]);
  
  const info = React.useCallback((title: string, description?: string, options?: Partial<EnhancedToastProps>) => {
    return toast({
      variant: 'info',
      title,
      description,
      ...options
    });
  }, [toast]);
  
  return {
    toast,
    success,
    error,
    warning,
    info
  };
}

// Composant pour afficher des messages temporels
interface TimedMessageProps {
  children: React.ReactNode;
  duration?: number;
  onExpire?: () => void;
  className?: string;
  showTimer?: boolean;
}

export function TimedMessage({ 
  children, 
  duration = 5000, 
  onExpire,
  className,
  showTimer = false 
}: TimedMessageProps) {
  const [timeLeft, setTimeLeft] = React.useState(duration);
  const [isVisible, setIsVisible] = React.useState(true);
  
  React.useEffect(() => {
    if (!isVisible) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          setIsVisible(false);
          onExpire?.();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isVisible, onExpire]);
  
  if (!isVisible) return null;
  
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      
      {showTimer && (
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{Math.ceil(timeLeft / 1000)}s restant</span>
          </div>
          
          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / duration) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}