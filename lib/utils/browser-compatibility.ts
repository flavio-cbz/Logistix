/**
 * Browser compatibility utilities
 * Detects browser capabilities and provides fallbacks
 */

export interface BrowserCapabilities {
  supportsGrid: boolean
  supportsFlexbox: boolean
  supportsCustomProperties: boolean
  supportsBackdropFilter: boolean
  supportsFocusVisible: boolean
  supportsColorScheme: boolean
  supportsReducedMotion: boolean
  supportsModernColorSyntax: boolean
  supportsTransform: boolean
  supportsSticky: boolean
}

/**
 * Detect browser capabilities
 */
export function detectBrowserCapabilities(): BrowserCapabilities {
  if (typeof window === 'undefined') {
    // Server-side rendering - assume modern browser
    return {
      supportsGrid: true,
      supportsFlexbox: true,
      supportsCustomProperties: true,
      supportsBackdropFilter: true,
      supportsFocusVisible: true,
      supportsColorScheme: true,
      supportsReducedMotion: true,
      supportsModernColorSyntax: true,
      supportsTransform: true,
      supportsSticky: true,
    }
  }

  const testElement = document.createElement('div')
  
  return {
    supportsGrid: CSS.supports('display', 'grid'),
    supportsFlexbox: CSS.supports('display', 'flex'),
    supportsCustomProperties: CSS.supports('color', 'var(--test)'),
    supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)') || CSS.supports('-webkit-backdrop-filter', 'blur(10px)'),
    supportsFocusVisible: CSS.supports('selector(:focus-visible)'),
    supportsColorScheme: CSS.supports('color-scheme', 'dark'),
    supportsReducedMotion: window.matchMedia('(prefers-reduced-motion)').media !== 'not all',
    supportsModernColorSyntax: CSS.supports('color', 'rgb(0 0 0 / 0.1)'),
    supportsTransform: CSS.supports('transform', 'scale(1.02)'),
    supportsSticky: CSS.supports('position', 'sticky') || CSS.supports('position', '-webkit-sticky'),
  }
}

/**
 * Get browser information
 */
export function getBrowserInfo() {
  if (typeof window === 'undefined') {
    return {
      name: 'Unknown',
      version: 'Unknown',
      engine: 'Unknown',
      isMobile: false,
      isTablet: false,
    }
  }

  const userAgent = navigator.userAgent
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor)
  const isFirefox = /Firefox/.test(userAgent)
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor)
  const isEdge = /Edg/.test(userAgent)
  const isIE = /Trident/.test(userAgent)

  const isMobile = /Mobi|Android/i.test(userAgent)
  const isTablet = /Tablet|iPad/i.test(userAgent)

  let name = 'Unknown'
  let engine = 'Unknown'

  if (isChrome) {
    name = 'Chrome'
    engine = 'Blink'
  } else if (isFirefox) {
    name = 'Firefox'
    engine = 'Gecko'
  } else if (isSafari) {
    name = 'Safari'
    engine = 'WebKit'
  } else if (isEdge) {
    name = 'Edge'
    engine = 'Blink'
  } else if (isIE) {
    name = 'Internet Explorer'
    engine = 'Trident'
  }

  // Extract version
  let version = 'Unknown'
  const versionMatch = userAgent.match(new RegExp(`${name}/(\\d+\\.\\d+)`))
  if (versionMatch) {
    version = versionMatch[1] || 'Unknown'
  }

  return {
    name,
    version,
    engine,
    isMobile,
    isTablet,
  }
}

/**
 * Apply browser-specific classes to document
 */
export function applyBrowserClasses() {
  if (typeof document === 'undefined') return

  const capabilities = detectBrowserCapabilities()
  const browserInfo = getBrowserInfo()
  const documentElement = document.documentElement

  // Remove existing browser classes
  documentElement.classList.remove(
    'supports-grid',
    'no-grid',
    'supports-flexbox',
    'no-flexbox',
    'supports-custom-properties',
    'no-custom-properties',
    'supports-backdrop-filter',
    'no-backdrop-filter',
    'supports-focus-visible',
    'no-focus-visible',
    'browser-chrome',
    'browser-firefox',
    'browser-safari',
    'browser-edge',
    'browser-ie',
    'device-mobile',
    'device-tablet',
    'device-desktop'
  )

  // Add capability classes
  documentElement.classList.add(capabilities.supportsGrid ? 'supports-grid' : 'no-grid')
  documentElement.classList.add(capabilities.supportsFlexbox ? 'supports-flexbox' : 'no-flexbox')
  documentElement.classList.add(capabilities.supportsCustomProperties ? 'supports-custom-properties' : 'no-custom-properties')
  documentElement.classList.add(capabilities.supportsBackdropFilter ? 'supports-backdrop-filter' : 'no-backdrop-filter')
  documentElement.classList.add(capabilities.supportsFocusVisible ? 'supports-focus-visible' : 'no-focus-visible')

  // Add browser classes
  documentElement.classList.add(`browser-${browserInfo.name.toLowerCase().replace(/\s+/g, '-')}`)

  // Add device classes
  if (browserInfo.isMobile) {
    documentElement.classList.add('device-mobile')
  } else if (browserInfo.isTablet) {
    documentElement.classList.add('device-tablet')
  } else {
    documentElement.classList.add('device-desktop')
  }
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if high contrast is preferred
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-contrast: high)').matches
}

/**
 * Check if dark mode is preferred
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Get safe CSS value with fallback
 */
export function getSafeCSSValue(property: string, value: string, fallback: string): string {
  if (typeof CSS === 'undefined') return fallback
  
  return CSS.supports(property, value) ? value : fallback
}

/**
 * Apply polyfills for missing features
 */
export function applyPolyfills() {
  if (typeof window === 'undefined') return

  const capabilities = detectBrowserCapabilities()

  // Focus-visible polyfill
  if (!capabilities.supportsFocusVisible) {
    // Simple focus-visible polyfill
    let hadKeyboardEvent = false

    const keyboardThrottledEventListener = (e: KeyboardEvent) => {
      hadKeyboardEvent = true
      setTimeout(() => {
        hadKeyboardEvent = false
      }, 100)
    }

    const focusListener = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (hadKeyboardEvent || target.matches(':focus-visible')) {
        target.classList.add('focus-visible')
      }
    }

    const blurListener = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      target.classList.remove('focus-visible')
    }

    document.addEventListener('keydown', keyboardThrottledEventListener, true)
    document.addEventListener('mousedown', () => { hadKeyboardEvent = false }, true)
    document.addEventListener('focus', focusListener, true)
    document.addEventListener('blur', blurListener, true)
  }

  // Custom properties polyfill for IE
  if (!capabilities.supportsCustomProperties) {
    // This would require a more complex polyfill like css-vars-ponyfill
    // Note: CSS Custom Properties not supported, consider using css-vars-ponyfill
  }

  // Backdrop filter polyfill
  if (!capabilities.supportsBackdropFilter) {
    // Apply fallback styles for glass effects
    const glassElements = document.querySelectorAll('.glass-effect')
    glassElements.forEach(element => {
      const htmlElement = element as HTMLElement
      htmlElement.style.background = 'rgba(255, 255, 255, 0.9)'
      htmlElement.style.border = '1px solid rgba(0, 0, 0, 0.1)'
    })
  }
}

/**
 * Initialize browser compatibility features
 */
export function initializeBrowserCompatibility() {
  if (typeof window === 'undefined') return

  // Apply browser classes
  applyBrowserClasses()

  // Apply polyfills
  applyPolyfills()

  // Listen for media query changes
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const updatePreferences = () => {
    const documentElement = document.documentElement
    
    documentElement.classList.toggle('prefers-reduced-motion', reducedMotionQuery.matches)
    documentElement.classList.toggle('prefers-high-contrast', highContrastQuery.matches)
    documentElement.classList.toggle('prefers-dark-mode', darkModeQuery.matches)
  }

  // Initial update
  updatePreferences()

  // Listen for changes
  reducedMotionQuery.addEventListener('change', updatePreferences)
  highContrastQuery.addEventListener('change', updatePreferences)
  darkModeQuery.addEventListener('change', updatePreferences)
}

/**
 * Get browser compatibility information for debugging
 */
export function getBrowserCompatibilityInfo() {
  if (typeof window === 'undefined') return null

  const capabilities = detectBrowserCapabilities()
  const browserInfo = getBrowserInfo()

  return {
    browser: `${browserInfo.name} ${browserInfo.version}`,
    engine: browserInfo.engine,
    device: browserInfo.isMobile ? 'Mobile' : browserInfo.isTablet ? 'Tablet' : 'Desktop',
    capabilities,
    preferences: {
      reducedMotion: prefersReducedMotion(),
      highContrast: prefersHighContrast(),
      darkMode: prefersDarkMode(),
    }
  }
}