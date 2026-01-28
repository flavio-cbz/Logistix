<<<<<<< HEAD
/**
 * Design Tokens - LogistiX
 * Centralisation des tokens pour type-safety et autocomplétion
 */

// ============= SPACING =============
export const spacing = {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
} as const;

// ============= COLORS =============
export const colors = {
    // Semantic colors
    primary: 'hsl(var(--primary))',
    'primary-foreground': 'hsl(var(--primary-foreground))',
    secondary: 'hsl(var(--secondary))',
    'secondary-foreground': 'hsl(var(--secondary-foreground))',

    // Feedback colors
    success: 'hsl(142 76% 36%)',
    warning: 'hsl(38 92% 50%)',
    error: 'hsl(var(--destructive))',
    info: 'hsl(199 89% 48%)',

    // UI colors
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    muted: 'hsl(var(--muted))',
    'muted-foreground': 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))',
    ring: 'hsl(var(--ring))',

    // Card & Popover
    card: 'hsl(var(--card))',
    'card-foreground': 'hsl(var(--card-foreground))',
    popover: 'hsl(var(--popover))',
    'popover-foreground': 'hsl(var(--popover-foreground))',
} as const;

// ============= TYPOGRAPHY =============
export const typography = {
    display: 'text-4xl font-bold leading-tight tracking-tight',
    heading: 'text-2xl font-semibold leading-snug tracking-tight',
    subheading: 'text-xl font-medium leading-relaxed',
    body: 'text-sm font-normal leading-relaxed',
    'body-large': 'text-base font-normal leading-relaxed',
    caption: 'text-xs font-medium leading-normal tracking-wide',
    small: 'text-xs font-normal leading-normal',
} as const;

// ============= SHADOWS =============
export const shadows = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;

// ============= RADIUS =============
export const radius = {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
} as const;

// ============= ANIMATIONS =============
export const animations = {
    'fade-in': 'fadeIn 0.3s ease-out',
    'slide-up': 'slideUp 0.3s ease-out',
    'scale-in': 'scaleIn 0.2s ease-out',
    shimmer: 'shimmer 2s infinite',
} as const;

// ============= BREAKPOINTS =============
export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// ============= Z-INDEX =============
export const zIndex = {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    'modal-backdrop': 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
} as const;

// ============= TYPES =============
export type Spacing = keyof typeof spacing;
export type Color = keyof typeof colors;
export type Typography = keyof typeof typography;
export type Shadow = keyof typeof shadows;
export type Radius = keyof typeof radius;
export type Animation = keyof typeof animations;
export type Breakpoint = keyof typeof breakpoints;
export type ZIndex = keyof typeof zIndex;
=======
/**
 * Design Tokens - LogistiX
 * Centralisation des tokens pour type-safety et autocomplétion
 */

// ============= SPACING =============
export const spacing = {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
} as const;

// ============= COLORS =============
export const colors = {
    // Semantic colors
    primary: 'hsl(var(--primary))',
    'primary-foreground': 'hsl(var(--primary-foreground))',
    secondary: 'hsl(var(--secondary))',
    'secondary-foreground': 'hsl(var(--secondary-foreground))',

    // Feedback colors
    success: 'hsl(142 76% 36%)',
    warning: 'hsl(38 92% 50%)',
    error: 'hsl(var(--destructive))',
    info: 'hsl(199 89% 48%)',

    // UI colors
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    muted: 'hsl(var(--muted))',
    'muted-foreground': 'hsl(var(--muted-foreground))',
    border: 'hsl(var(--border))',
    ring: 'hsl(var(--ring))',

    // Card & Popover
    card: 'hsl(var(--card))',
    'card-foreground': 'hsl(var(--card-foreground))',
    popover: 'hsl(var(--popover))',
    'popover-foreground': 'hsl(var(--popover-foreground))',
} as const;

// ============= TYPOGRAPHY =============
export const typography = {
    display: 'text-4xl font-bold leading-tight tracking-tight',
    heading: 'text-2xl font-semibold leading-snug tracking-tight',
    subheading: 'text-xl font-medium leading-relaxed',
    body: 'text-sm font-normal leading-relaxed',
    'body-large': 'text-base font-normal leading-relaxed',
    caption: 'text-xs font-medium leading-normal tracking-wide',
    small: 'text-xs font-normal leading-normal',
} as const;

// ============= SHADOWS =============
export const shadows = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;

// ============= RADIUS =============
export const radius = {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
} as const;

// ============= ANIMATIONS =============
export const animations = {
    'fade-in': 'fadeIn 0.3s ease-out',
    'slide-up': 'slideUp 0.3s ease-out',
    'scale-in': 'scaleIn 0.2s ease-out',
    shimmer: 'shimmer 2s infinite',
} as const;

// ============= BREAKPOINTS =============
export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// ============= Z-INDEX =============
export const zIndex = {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    'modal-backdrop': 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
} as const;

// ============= TYPES =============
export type Spacing = keyof typeof spacing;
export type Color = keyof typeof colors;
export type Typography = keyof typeof typography;
export type Shadow = keyof typeof shadows;
export type Radius = keyof typeof radius;
export type Animation = keyof typeof animations;
export type Breakpoint = keyof typeof breakpoints;
export type ZIndex = keyof typeof zIndex;
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
