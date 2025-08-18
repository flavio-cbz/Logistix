"use client"

import { Moon, Sun, Monitor, Check, Settings } from "lucide-react"
import { useTheme } from "next-themes"
import { useThemeConfig } from "@/lib/hooks/use-theme-config"

import { AnimatedButton } from "@/components/ui/animated-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { ThemeCustomizationDialog } from "@/components/theme-customization-dialog"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { config, updateThemeMode, currentTheme } = useThemeConfig()

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    // Temporarily disable transitions during theme change
    document.documentElement.classList.add('theme-changing')
    
    updateThemeMode(newTheme)
    setTheme(newTheme)
    
    // Re-enable transitions after theme change
    setTimeout(() => {
      document.documentElement.classList.remove('theme-changing')
    }, 100)
  }

  const getThemeIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-[1.2rem] w-[1.2rem]" />
    }
    return (
      <>
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedButton 
          variant="outline" 
          size="icon"
          className="relative overflow-hidden"
          ripple={true}
          haptic={true}
        >
          {getThemeIcon()}
          <span className="sr-only">Changer le thème</span>
        </AnimatedButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Apparence
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => handleThemeChange("light")}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Clair</span>
          </div>
          {theme === "light" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleThemeChange("dark")}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span>Sombre</span>
          </div>
          {theme === "dark" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleThemeChange("system")}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>Système</span>
          </div>
          {theme === "system" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <ThemeCustomizationDialog 
          trigger={
            <DropdownMenuItem 
              onSelect={(e) => e.preventDefault()}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Personnaliser</span>
            </DropdownMenuItem>
          }
        />
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Actuel: {currentTheme === 'dark' ? 'Sombre' : 'Clair'}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}