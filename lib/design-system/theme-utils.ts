// Utilitaires pour la gestion des thèmes et de l'accessibilité

import { type DesignTokens } from './tokens'

// Fonction pour calculer la luminance relative d'une couleur
export function getLuminance(color: string): number {
  // Convertir la couleur hex en RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  // Appliquer la correction gamma
  const sRGB = [r, g, b].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  // Calculer la luminance relative
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
}

// Fonction pour calculer le ratio de contraste entre deux couleurs
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

// Vérifier si une combinaison de couleurs respecte les standards WCAG
export function isAccessibleContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background)
  
  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 }
  }
  
  return ratio >= requirements[level][size]
}

// Générer une couleur avec un contraste suffisant
export function generateAccessibleColor(
  baseColor: string,
  backgroundColor: string,
  targetRatio: number = 4.5
): string {
  const baseLum = getLuminance(baseColor)
  const bgLum = getLuminance(backgroundColor)
  
  // Déterminer si on doit éclaircir ou assombrir
  const shouldLighten = baseLum < bgLum
  
  // Convertir en HSL pour manipulation plus facile
  const hsl = hexToHsl(baseColor)
  
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    const currentRatio = getContrastRatio(hslToHex(hsl), backgroundColor)
    
    if (currentRatio >= targetRatio) {
      return hslToHex(hsl)
    }
    
    // Ajuster la luminosité
    if (shouldLighten) {
      hsl.l = Math.min(1, hsl.l + 0.01)
    } else {
      hsl.l = Math.max(0, hsl.l - 0.01)
    }
    
    attempts++
  }
  
  return baseColor // Retourner la couleur originale si on ne peut pas l'améliorer
}

// Convertir hex en HSL
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.substr(1, 2), 16) / 255
  const g = parseInt(hex.substr(3, 2), 16) / 255
  const b = parseInt(hex.substr(5, 2), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return { h, s, l }
}

// Convertir HSL en hex
export function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  let r, g, b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Générer une palette de couleurs accessible
export function generateAccessiblePalette(
  baseColor: string,
  backgroundColor: string = '#ffffff'
): Record<string, string> {
  const palette: Record<string, string> = {}
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
  
  const baseHsl = hexToHsl(baseColor)
  
  shades.forEach(shade => {
    // Calculer la luminosité basée sur le shade
    const lightness = shade <= 500 
      ? 0.95 - (shade / 500) * 0.45  // De 95% à 50%
      : 0.5 - ((shade - 500) / 450) * 0.45  // De 50% à 5%
    
    const color = hslToHex({ ...baseHsl, l: lightness })
    
    // Vérifier l'accessibilité et ajuster si nécessaire
    if (shade === 500 || shade === 600 || shade === 700) {
      palette[shade] = generateAccessibleColor(color, backgroundColor)
    } else {
      palette[shade] = color
    }
  })
  
  return palette
}

// Valider un thème complet pour l'accessibilité
export function validateThemeAccessibility(tokens: DesignTokens): {
  isValid: boolean
  issues: Array<{
    type: 'contrast' | 'size' | 'spacing'
    severity: 'error' | 'warning'
    message: string
    suggestion?: string
  }>
} {
  const issues: Array<{
    type: 'contrast' | 'size' | 'spacing'
    severity: 'error' | 'warning'
    message: string
    suggestion?: string
  }> = []

  // Vérifier les ratios de contraste des couleurs principales
  const colorCombinations = [
    { fg: tokens.colors.primary[500], bg: '#ffffff', name: 'Primary on white' },
    { fg: tokens.colors.primary[600], bg: '#ffffff', name: 'Primary 600 on white' },
    { fg: tokens.colors.secondary[500], bg: '#ffffff', name: 'Secondary on white' },
    { fg: tokens.colors.neutral[900], bg: '#ffffff', name: 'Text on white' },
  ]

  colorCombinations.forEach(({ fg, bg, name }) => {
    const ratio = getContrastRatio(fg, bg)
    if (ratio < 4.5) {
      issues.push({
        type: 'contrast',
        severity: 'error',
        message: `${name} has insufficient contrast ratio: ${ratio.toFixed(2)}`,
        suggestion: `Use a darker shade or increase contrast to at least 4.5:1`
      })
    } else if (ratio < 7) {
      issues.push({
        type: 'contrast',
        severity: 'warning',
        message: `${name} meets AA but not AAA standards: ${ratio.toFixed(2)}`,
        suggestion: `Consider using a darker shade for AAA compliance (7:1)`
      })
    }
  })

  // Vérifier les tailles minimales
  const minTouchTarget = parseFloat(tokens.accessibility.minTouchTarget)
  if (minTouchTarget < 44) {
    issues.push({
      type: 'size',
      severity: 'error',
      message: `Minimum touch target size is ${minTouchTarget}px, should be at least 44px`,
      suggestion: 'Increase minTouchTarget to 44px or higher'
    })
  }

  // Vérifier les tailles de police
  const baseFontSize = parseFloat(tokens.typography.fontSizes.base)
  if (baseFontSize < 16) {
    issues.push({
      type: 'size',
      severity: 'warning',
      message: `Base font size is ${baseFontSize}px, recommended minimum is 16px`,
      suggestion: 'Consider increasing base font size to 16px for better readability'
    })
  }

  // Vérifier les hauteurs de ligne
  const baseLineHeight = tokens.typography.lineHeights.normal
  if (baseLineHeight < 1.4) {
    issues.push({
      type: 'spacing',
      severity: 'warning',
      message: `Base line height is ${baseLineHeight}, recommended minimum is 1.4`,
      suggestion: 'Increase line height to at least 1.4 for better readability'
    })
  }

  return {
    isValid: issues.filter(issue => issue.severity === 'error').length === 0,
    issues
  }
}

// Générer un rapport d'accessibilité
export function generateAccessibilityReport(tokens: DesignTokens): string {
  const validation = validateThemeAccessibility(tokens)
  
  let report = '# Rapport d\'Accessibilité du Thème\n\n'
  
  if (validation.isValid) {
    report += '✅ **Statut**: Conforme aux standards WCAG 2.1 AA\n\n'
  } else {
    report += '❌ **Statut**: Non conforme - corrections requises\n\n'
  }
  
  if (validation.issues.length > 0) {
    report += '## Problèmes Détectés\n\n'
    
    const errors = validation.issues.filter(issue => issue.severity === 'error')
    const warnings = validation.issues.filter(issue => issue.severity === 'warning')
    
    if (errors.length > 0) {
      report += '### ❌ Erreurs (correction requise)\n\n'
      errors.forEach((issue, index) => {
        report += `${index + 1}. **${issue.message}**\n`
        if (issue.suggestion) {
          report += `   - *Suggestion*: ${issue.suggestion}\n`
        }
        report += '\n'
      })
    }
    
    if (warnings.length > 0) {
      report += '### ⚠️ Avertissements (amélioration recommandée)\n\n'
      warnings.forEach((issue, index) => {
        report += `${index + 1}. **${issue.message}**\n`
        if (issue.suggestion) {
          report += `   - *Suggestion*: ${issue.suggestion}\n`
        }
        report += '\n'
      })
    }
  } else {
    report += '## ✅ Aucun Problème Détecté\n\n'
    report += 'Toutes les vérifications d\'accessibilité ont été passées avec succès.\n\n'
  }
  
  // Ajouter des métriques
  report += '## Métriques\n\n'
  report += `- **Taille de police de base**: ${tokens.typography.fontSizes.base}\n`
  report += `- **Hauteur de ligne de base**: ${tokens.typography.lineHeights.normal}\n`
  report += `- **Taille minimale de cible tactile**: ${tokens.accessibility.minTouchTarget}\n`
  report += `- **Largeur de l'anneau de focus**: ${tokens.accessibility.focusRing.width}\n\n`
  
  // Ajouter des recommandations générales
  report += '## Recommandations Générales\n\n'
  report += '1. Testez votre interface avec des utilisateurs utilisant des technologies d\'assistance\n'
  report += '2. Vérifiez la navigation au clavier sur toutes les pages\n'
  report += '3. Validez les couleurs avec des outils comme Colour Contrast Analyser\n'
  report += '4. Testez avec différentes tailles de police et niveaux de zoom\n'
  report += '5. Vérifiez la lisibilité en mode sombre et contraste élevé\n'
  
  return report
}

// Utilitaire pour créer des variantes de couleur accessibles
export function createAccessibleColorVariants(
  baseColor: string,
  backgrounds: string[] = ['#ffffff', '#000000']
): Record<string, string> {
  const variants: Record<string, string> = {}
  
  backgrounds.forEach((bg, index) => {
    const suffix = index === 0 ? 'light' : 'dark'
    variants[`accessible-${suffix}`] = generateAccessibleColor(baseColor, bg)
  })
  
  return variants
}

export default {
  getLuminance,
  getContrastRatio,
  isAccessibleContrast,
  generateAccessibleColor,
  generateAccessiblePalette,
  validateThemeAccessibility,
  generateAccessibilityReport,
  createAccessibleColorVariants,
}