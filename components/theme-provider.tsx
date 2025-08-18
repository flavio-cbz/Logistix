"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"
import { useEffect, useState } from "react"

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
    
    // Add a small delay to ensure theme is applied before enabling transitions
    const timer = setTimeout(() => {
      document.documentElement.classList.add('theme-transitions-enabled')
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider 
      {...props}
      enableSystem
      disableTransitionOnChange={false}
      storageKey="logistix-theme"
    >
      {children}
    </NextThemesProvider>
  )
}

