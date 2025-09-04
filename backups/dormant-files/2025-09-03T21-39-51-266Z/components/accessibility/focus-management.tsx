"use client"

import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react"
import { useAnnouncer } from "./screen-reader"

// Définition de l'interface pour la position focusée
interface FocusedPosition {
  row: number
  col: number
}

interface FocusManagementContextType {
  focusedPosition: FocusedPosition
  setFocusedPosition: React.Dispatch<React.SetStateAction<FocusedPosition>>
  rowCount: number
  colCount: number
  setRowCount: React.Dispatch<React.SetStateAction<number>>
  setColCount: React.Dispatch<React.SetStateAction<number>>
  moveFocus: (direction: "up" | "down" | "left" | "right" | "first" | "last") => void
}

const FocusManagementContext = createContext<FocusManagementContextType | undefined>(undefined)

export function FocusManagementProvider({ children }: { children: React.ReactNode }) {
  const [focusedPosition, setFocusedPosition] = useState<FocusedPosition>({ row: 0, col: 0 })
  const [rowCount, setRowCount] = useState(0)
  const [colCount, setColCount] = useState(0)
  const { announceToScreenReader } = useAnnouncer() // Correction: utiliser announceToScreenReader

  const moveFocus = useCallback(
    (direction: "up" | "down" | "left" | "right" | "first" | "last") => {
      setFocusedPosition((prev) => {
        const rows = rowCount
        const cols = colCount
        let newRow = prev.row
        let newCol = prev.col

        switch (direction) {
          case "up":
            newRow = prev.row > 0 ? prev.row - 1 : rows - 1
            break
          case "down":
            newRow = prev.row < rows - 1 ? prev.row + 1 : 0
            break
          case "left":
            newCol = prev.col > 0 ? prev.col - 1 : cols - 1
            break
          case "right":
            newCol = prev.col < cols - 1 ? prev.col + 1 : 0
            break
          case "first":
            newRow = 0
            newCol = 0
            break
          case "last":
            newRow = rows - 1
            newCol = cols - 1
            break
        }

        // Annonce pour les lecteurs d'écran
        if (direction === "up" || direction === "down") {
          announceToScreenReader(`Ligne ${newRow + 1}`, "polite")
        } else if (direction === "left" || direction === "right") {
          announceToScreenReader(`Colonne ${newCol + 1}`, "polite")
        } else if (direction === "first" || direction === "last") {
          announceToScreenReader(`Ligne ${newRow + 1}, colonne ${newCol + 1}`, "polite")
        }

        return { row: newRow, col: newCol }
      })
    },
    [rowCount, colCount, announceToScreenReader] // Correction: announcer en announceToScreenReader
  )

  const value = {
    focusedPosition,
    setFocusedPosition,
    rowCount,
    colCount,
    setRowCount,
    setColCount,
    moveFocus,
  }

  return <FocusManagementContext.Provider value={value}>{children}</FocusManagementContext.Provider>
}

export function useFocusManagement() {
  const context = useContext(FocusManagementContext)
  if (context === undefined) {
    throw new Error("useFocusManagement must be used within a FocusManagementProvider")
  }
  return context
}

interface FocusableElementProps extends React.HTMLAttributes<HTMLElement> {
  row: number
  col: number
  children: React.ReactNode
}

export function FocusableElement({ row, col, children, ...props }: FocusableElementProps) {
  const { focusedPosition, setFocusedPosition } = useFocusManagement()
  const ref = useRef<HTMLDivElement>(null) // Correction: HTMLElement en HTMLDivElement

  const isFocused = focusedPosition.row === row && focusedPosition.col === col

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus()
    }
  }, [isFocused])

  const handleFocus = useCallback(() => {
    setFocusedPosition({ row, col })
  }, [row, col, setFocusedPosition])

  return (
    <div
      ref={ref}
      tabIndex={isFocused ? 0 : -1}
      onFocus={handleFocus}
      aria-rowindex={row + 1}
      aria-colindex={col + 1}
      {...props}
    >
      {children}
    </div>
  )
}

interface FocusGridProps {
  rows: number
  cols: number
  children: React.ReactNode
}

export function FocusGrid({ rows, cols, children }: FocusGridProps) {
  const { setRowCount, setColCount, moveFocus } = useFocusManagement()

  useEffect(() => {
    setRowCount(rows)
    setColCount(cols)
  }, [rows, cols, setRowCount, setColCount])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          moveFocus("up")
          event.preventDefault()
          break
        case "ArrowDown":
          moveFocus("down")
          event.preventDefault()
          break
        case "ArrowLeft":
          moveFocus("left")
          event.preventDefault()
          break
        case "ArrowRight":
          moveFocus("right")
          event.preventDefault()
          break
        case "Home":
          moveFocus("first")
          event.preventDefault()
          break
        case "End":
          moveFocus("last")
          event.preventDefault()
          break
      }
    },
    [moveFocus]
  )

  return (
    <div role="grid" aria-rowcount={rows} aria-colcount={cols} onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}