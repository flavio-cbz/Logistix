"use client"

import { useEffect, useState } from "react"

/**
 * This component ensures that its children are only rendered on the client side.
 * This is useful to prevent hydration mismatches, especially for components
 * that rely on browser-specific APIs like localStorage for theme management.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // On the server or before the component has mounted, render nothing.
  // This ensures that the server-rendered HTML and the initial client-rendered HTML match.
  if (!mounted) {
    return null
  }

  // After mounting, render the children, which can now safely access browser APIs.
  return <>{children}</>
}