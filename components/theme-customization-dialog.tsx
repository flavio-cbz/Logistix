"use client"

import { useState } from "react"
import { Settings } from "lucide-react"

import { AnimatedButton } from "@/components/ui/animated-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ThemeConfig } from "@/components/theme-config"

interface ThemeCustomizationDialogProps {
  trigger?: React.ReactNode
}

export function ThemeCustomizationDialog({ trigger }: ThemeCustomizationDialogProps) {
  const [open, setOpen] = useState(false)

  const defaultTrigger = (
    <AnimatedButton 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-2"
      ripple={true}
      haptic={true}
      screenReaderDescription="Ouvrir les options de personnalisation du thème"
    >
      <Settings className="h-4 w-4" />
      Personnaliser
    </AnimatedButton>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personnalisation du thème</DialogTitle>
          <DialogDescription>
            Configurez l'apparence de l'application selon vos préférences
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ThemeConfig />
        </div>
      </DialogContent>
    </Dialog>
  )
}