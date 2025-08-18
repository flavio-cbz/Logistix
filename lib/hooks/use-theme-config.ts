"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  accentColor: string
  borderRadius: 'none' | 'sm' | 'md' | 'lg'
  animations: boolean
  reducedMotion: boolean
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'system',
  accentColor: '#3b82f6',
  borderRadius: 'md',
  animations: true,
  reducedMotion: false,
}

const THEME_CONFIG_KEY = 'logistix-theme-config'

export function useThemeConfig() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme()
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)
  const [mounted, setMounted] = useState(false)

  // Load theme config from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedConfig = localStorage.getItem(THEME_CONFIG_KEY)
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig)
        setConfig({ ...DEFAULT_THEME_CONFIG, ...parsedConfig })
      } catch (error) {
        console.warn('Failed to parse theme config from localStorage:', error)
      }
    }

    // Detect system preference for reduced motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setConfig(prev => ({ ...prev, reducedMotion: mediaQuery.matches }))

      const handleChange = (e: MediaQueryListEvent) => {
        setConfig(prev => ({ ...prev, reducedMotion: e.matches }))
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Save config to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(THEME_CONFIG_KEY, JSON.stringify(config))
    }
  }, [config, mounted])

  // Sync theme mode with next-themes
  useEffect(() => {
    if (mounted && config.mode !== theme) {
      setTheme(config.mode)
    }
  }, [config.mode, theme, setTheme, mounted])

  const updateConfig = (updates: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const updateThemeMode = (mode: ThemeConfig['mode']) => {
    updateConfig({ mode })
    setTheme(mode)
  }

  const resetToDefaults = () => {
    setConfig(DEFAULT_THEME_CONFIG)
    setTheme(DEFAULT_THEME_CONFIG.mode)
  }

  // Apply CSS custom properties for theme config
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    // Apply accent color
    root.style.setProperty('--theme-accent', config.accentColor)
    
    // Apply border radius
    const radiusMap = {
      none: '0px',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
    }
    root.style.setProperty('--theme-radius', radiusMap[config.borderRadius])
    
    // Apply animation preferences
    root.style.setProperty('--theme-animations', config.animations ? '1' : '0')
    root.style.setProperty('--theme-reduced-motion', config.reducedMotion ? '1' : '0')
    
    // Add/remove reduced motion class
    if (config.reducedMotion || !config.animations) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
  }, [config, mounted])

  if (!mounted) {
    return {
      config: DEFAULT_THEME_CONFIG,
      updateConfig: () => {},
      updateThemeMode: () => {},
      resetToDefaults: () => {},
      isLoading: true,
      currentTheme: 'light' as const,
      systemTheme: 'light' as const,
    }
  }

  return {
    config,
    updateConfig,
    updateThemeMode,
    resetToDefaults,
    isLoading: false,
    currentTheme: resolvedTheme as 'light' | 'dark',
    systemTheme: systemTheme as 'light' | 'dark',
  }
}