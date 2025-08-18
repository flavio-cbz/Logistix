/**
 * Accessibility utilities for screen reader support
 */

export interface AriaLiveRegionProps {
  message: string
  priority?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
}

export interface AccessibilityDescriptor {
  label: string
  description?: string
  role?: string
  ariaLive?: 'polite' | 'assertive' | 'off'
  ariaAtomic?: boolean
  ariaRelevant?: string
}

/**
 * Generate comprehensive ARIA attributes for components
 */
export function generateAriaAttributes(descriptor: AccessibilityDescriptor) {
  const attributes: Record<string, string | boolean> = {}

  if (descriptor.label) {
    attributes['aria-label'] = descriptor.label
  }

  if (descriptor.description) {
    attributes['aria-describedby'] = `desc-${generateId()}`
  }

  if (descriptor.role) {
    attributes['role'] = descriptor.role
  }

  if (descriptor.ariaLive) {
    attributes['aria-live'] = descriptor.ariaLive
  }

  if (descriptor.ariaAtomic !== undefined) {
    attributes['aria-atomic'] = descriptor.ariaAtomic
  }

  if (descriptor.ariaRelevant) {
    attributes['aria-relevant'] = descriptor.ariaRelevant
  }

  return attributes
}

/**
 * Generate unique IDs for accessibility relationships
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Create descriptive text for data visualizations
 */
export function createChartDescription(data: any[], type: 'line' | 'bar' | 'pie' | 'area' = 'line'): string {
  if (!data || data.length === 0) {
    return "Aucune donnée disponible pour ce graphique"
  }

  const dataPoints = data.length
  const hasValues = data.some(item => typeof item.value === 'number')
  
  if (!hasValues) {
    return `Graphique ${type} contenant ${dataPoints} points de données sans valeurs numériques`
  }

  const values = data.map(item => item.value).filter(v => typeof v === 'number')
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length

  const trend = values.length > 1 ? 
    ((values[values.length - 1] || 0) > (values[0] || 0) ? 'croissante' : 
     (values[values.length - 1] || 0) < (values[0] || 0) ? 'décroissante' : 'stable') : 'stable'

  return `Graphique ${type} avec ${dataPoints} points de données. ` +
         `Valeur minimale: ${min.toLocaleString('fr-FR')}, ` +
         `valeur maximale: ${max.toLocaleString('fr-FR')}, ` +
         `moyenne: ${avg.toFixed(2).replace('.', ',')}, ` +
         `tendance générale: ${trend}.`
}

/**
 * Create descriptive text for statistics cards
 */
export function createStatsDescription(
  title: string, 
  value: string | number, 
  trend?: { value: number; label?: string },
  description?: string
): string {
  let desc = `${title}: ${value}`
  
  if (trend) {
    const trendDirection = trend.value > 0 ? 'en hausse' : trend.value < 0 ? 'en baisse' : 'stable'
    const trendValue = Math.abs(trend.value).toFixed(1).replace('.', ',')
    desc += `, ${trendDirection} de ${trendValue}%`
    
    if (trend.label) {
      desc += ` ${trend.label}`
    }
  }
  
  if (description) {
    desc += `. ${description}`
  }
  
  return desc
}

/**
 * Create descriptive text for loading states
 */
export function createLoadingDescription(component: string, progress?: number): string {
  if (progress !== undefined) {
    return `Chargement de ${component} en cours: ${progress}% terminé`
  }
  return `Chargement de ${component} en cours`
}

/**
 * Create descriptive text for interactive elements
 */
export function createInteractionDescription(
  element: string,
  action: string,
  state?: string
): string {
  let desc = `${element}, ${action}`
  
  if (state) {
    desc += `, ${state}`
  }
  
  return desc
}

/**
 * Format numbers for screen readers in French locale
 */
export function formatNumberForScreenReader(value: number): string {
  return value.toLocaleString('fr-FR')
}

/**
 * Create comprehensive table description for screen readers
 */
export function createTableDescription(
  rows: number,
  columns: number,
  caption?: string,
  summary?: string
): string {
  let desc = `Tableau avec ${rows} lignes et ${columns} colonnes`
  
  if (caption) {
    desc = `${caption}. ${desc}`
  }
  
  if (summary) {
    desc += `. ${summary}`
  }
  
  return desc
}

/**
 * Announce dynamic content changes to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Create or update live region
  let liveRegion = document.getElementById('sr-live-region')
  
  if (!liveRegion) {
    liveRegion = document.createElement('div')
    liveRegion.id = 'sr-live-region'
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `
    document.body.appendChild(liveRegion)
  }
  
  // Update the live region content
  liveRegion.textContent = message
  
  // Clear after announcement to allow repeated messages
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = ''
    }
  }, 1000)
}

/**
 * Validate accessibility attributes
 */
export function validateAccessibility(element: HTMLElement): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // Check for interactive elements without labels
  if (element.matches('button, input, select, textarea, [role="button"], [role="link"]')) {
    const hasLabel = element.getAttribute('aria-label') || 
                    element.getAttribute('aria-labelledby') ||
                    element.textContent?.trim()
    
    if (!hasLabel) {
      issues.push('Élément interactif sans label accessible')
    }
  }
  
  // Check for images without alt text
  if (element.matches('img')) {
    const hasAlt = element.getAttribute('alt') !== null
    if (!hasAlt) {
      issues.push('Image sans texte alternatif')
    }
  }
  
  // Check for headings hierarchy
  if (element.matches('h1, h2, h3, h4, h5, h6')) {
    const level = parseInt(element.tagName.charAt(1))
    const prevHeading = element.previousElementSibling?.closest('h1, h2, h3, h4, h5, h6')
    
    if (prevHeading) {
      const prevLevel = parseInt(prevHeading.tagName.charAt(1))
      if (level > prevLevel + 1) {
        issues.push('Hiérarchie des titres non respectée')
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}