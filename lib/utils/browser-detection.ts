/**
 * Browser detection and feature support utilities
 * Provides cross-browser compatibility helpers
 */

export interface BrowserInfo {
  name: string
  version: string
  isChrome: boolean
  isFirefox: boolean
  isSafari: boolean
  isEdge: boolean
  isIE: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export interface FeatureSupport {
  backdropFilter: boolean
  cssGrid: boolean
  flexbox: boolean
  customProperties: boolean
  focusVisible: boolean
  transforms: boolean
  animations: boolean
  touchEvents: boolean
  vibration: boolean
  reducedMotion: boolean
  highContrast: boolean
  darkMode: boolean
}

/**
 * Detect browser information from user agent
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'unknown',
      version: '0',
      isChrome: false,
      isFirefox: false,
      isSafari: false,
      isEdge: false,
      isIE: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    }
  }

  const userAgent = window.navigator.userAgent
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(window.navigator.vendor)
  const isFirefox = /Firefox/.test(userAgent)
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(window.navigator.vendor)
  const isEdge = /Edg/.test(userAgent)
  const isIE = /MSIE|Trident/.test(userAgent)
  const isMobile = /Mobi|Android/i.test(userAgent)
  const isTablet = /Tablet|iPad/i.test(userAgent)

  let name = 'unknown'
  let version = '0'

  if (isChrome) {
    name = 'chrome'
    const match = userAgent.match(/Chrome\/(\d+)/)
    version = match?.[1] || '0'
  } else if (isFirefox) {
    name = 'firefox'
    const match = userAgent.match(/Firefox\/(\d+)/)
    version = match?.[1] || '0'
  } else if (isSafari) {
    name = 'safari'
    const match = userAgent.match(/Version\/(\d+)/)
    version = match?.[1] || '0'
  } else if (isEdge) {
    name = 'edge'
    const match = userAgent.match(/Edg\/(\d+)/)
    version = match?.[1] || '0'
  } else if (isIE) {
    name = 'ie'
    const match = userAgent.match(/(?:MSIE |Trident\/.*; rv:)(\d+)/)
    version = match?.[1] || '0'
  }

  return {
    name,
    version,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isIE,
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
  }
}

/**
 * Detect CSS and browser feature support
 */
export function detectFeatureSupport(): FeatureSupport {
  if (typeof window === 'undefined') {
    return {
      backdropFilter: false,
      cssGrid: false,
      flexbox: false,
      customProperties: false,
      focusVisible: false,
      transforms: false,
      animations: false,
      touchEvents: false,
      vibration: false,
      reducedMotion: false,
      highContrast: false,
      darkMode: false,
    }
  }

  const supportsCSS = (property: string, value: string): boolean => {
    if (!window.CSS || !window.CSS.supports) {
      // Fallback feature detection
      const element = document.createElement('div')
      try {
        element.style.setProperty(property, value)
        return element.style.getPropertyValue(property) === value
      } catch {
        return false
      }
    }
    return window.CSS.supports(property, value)
  }

  const supportsSelector = (selector: string): boolean => {
    if (!window.CSS || !window.CSS.supports) {
      try {
        document.querySelector(selector)
        return true
      } catch {
        return false
      }
    }
    return window.CSS.supports('selector', selector)
  }

  const matchesMedia = (query: string): boolean => {
    if (!window.matchMedia) return false
    return window.matchMedia(query).matches
  }

  return {
    backdropFilter: supportsCSS('backdrop-filter', 'blur(10px)') || supportsCSS('-webkit-backdrop-filter', 'blur(10px)'),
    cssGrid: supportsCSS('display', 'grid'),
    flexbox: supportsCSS('display', 'flex'),
    customProperties: supportsCSS('--test', 'value'),
    focusVisible: supportsSelector(':focus-visible'),
    transforms: supportsCSS('transform', 'scale(1)'),
    animations: supportsCSS('animation', 'none'),
    touchEvents: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    vibration: 'vibrate' in navigator,
    reducedMotion: matchesMedia('(prefers-reduced-motion: reduce)'),
    highContrast: matchesMedia('(prefers-contrast: high)'),
    darkMode: matchesMedia('(prefers-color-scheme: dark)'),
  }
}

/**
 * Get browser-specific CSS class names
 */
export function getBrowserClasses(): string[] {
  const browser = detectBrowser()
  const classes: string[] = []

  classes.push(`browser-${browser.name}`)
  classes.push(`browser-${browser.name}-${browser.version}`)

  if (browser.isMobile) classes.push('is-mobile')
  if (browser.isTablet) classes.push('is-tablet')
  if (browser.isDesktop) classes.push('is-desktop')

  return classes
}

/**
 * Get feature support CSS class names
 */
export function getFeatureClasses(): string[] {
  const features = detectFeatureSupport()
  const classes: string[] = []

  Object.entries(features).forEach(([feature, supported]) => {
    classes.push(supported ? `supports-${feature}` : `no-${feature}`)
  })

  return classes
}

/**
 * Apply browser and feature classes to document
 */
export function applyBrowserClasses(): void {
  if (typeof document === 'undefined') return

  const browserClasses = getBrowserClasses()
  const featureClasses = getFeatureClasses()
  const allClasses = [...browserClasses, ...featureClasses]

  document.documentElement.classList.add(...allClasses)
}

/**
 * Check if a specific feature is supported
 */
export function isFeatureSupported(feature: keyof FeatureSupport): boolean {
  const features = detectFeatureSupport()
  return features[feature]
}

/**
 * Get browser-specific implementation of a feature
 */
export function getBrowserSpecificValue<T>(values: Partial<Record<BrowserInfo['name'], T>>, fallback: T): T {
  const browser = detectBrowser()
  return values[browser.name] ?? fallback
}

/**
 * Execute code only if feature is supported
 */
export function withFeatureSupport<T>(
  feature: keyof FeatureSupport,
  callback: () => T,
  fallback?: () => T
): T | undefined {
  if (isFeatureSupported(feature)) {
    return callback()
  } else if (fallback) {
    return fallback()
  }
  return undefined
}

/**
 * Polyfill for CSS.supports if not available
 */
export function polyfillCSSSupports(): void {
  if (typeof window === 'undefined' || window.CSS?.supports) return

  if (!window.CSS) {
    (window as any).CSS = {}
  }

  window.CSS.supports = function(property: string, value?: string): boolean {
    const element = document.createElement('div')
    
    if (value === undefined) {
      // Selector support check
      try {
        document.querySelector(property)
        return true
      } catch {
        return false
      }
    }

    try {
      element.style.setProperty(property, value)
      return element.style.getPropertyValue(property) === value
    } catch {
      return false
    }
  }
}

/**
 * Initialize browser detection and apply classes
 */
export function initializeBrowserDetection(): void {
  if (typeof window === 'undefined') return

  polyfillCSSSupports()
  applyBrowserClasses()

  // Browser info available for debugging in development
  if (process.env.NODE_ENV === 'development') {
    const browser = detectBrowser()
    const features = detectFeatureSupport()
    // Browser detection data available: { browser, features }
  }
}