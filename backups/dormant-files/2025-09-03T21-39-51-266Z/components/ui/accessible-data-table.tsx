"use client"

import * as React from "react"
import { useAccessibility } from "@/lib/contexts/accessibility-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react"

export interface Column<T = any> {
  key: string
  header: string
  accessor: keyof T | ((_item: T) => React.ReactNode)
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  ariaLabel?: string
  description?: string
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface AccessibleDataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  
  // Propriétés d'accessibilité
  caption?: string
  summary?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  
  // Tri
  sortable?: boolean
  sortConfig?: SortConfig
  onSort?: (config: SortConfig) => void
  
  // Sélection
  selectable?: boolean
  selectedRows?: Set<string | number>
  onSelectionChange?: (selectedRows: Set<string | number>) => void
  getRowId?: (_item: T, _index: number) => string | number
  
  // Pagination
  pagination?: {
    currentPage: number
    totalPages: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
  }
  
  // Apparence
  striped?: boolean
  bordered?: boolean
  compact?: boolean
  
  // Actions sur les lignes
  onRowClick?: (_item: T, _index: number) => void
  onRowDoubleClick?: (_item: T, _index: number) => void
  
  // États
  loading?: boolean
  error?: string
  emptyMessage?: string
  
  // Callbacks
  onFocusRow?: (_item: T, _index: number) => void
}

const AccessibleDataTable = <T extends Record<string, any>>({
  data,
  columns,
  caption,
  summary,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  sortable = false,
  sortConfig,
  onSort,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange, // Garder ici pour le destructuring
  getRowId = (_item, _index) => _index,
  pagination,
  striped = false,
  bordered = false,
  compact = false,
  onRowClick,
  onRowDoubleClick,
  loading = false,
  error,
  emptyMessage = "Aucune donnée disponible",
  onFocusRow,
}: AccessibleDataTableProps<T>) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1)
  const [focusedColumnIndex, setFocusedColumnIndex] = React.useState<number>(-1)
  const tableRef = React.useRef<HTMLTableElement>(null)

  // Navigation clavier pour la table
  const { containerRef } = useKeyboardNavigation({
    enableArrowNavigation: true,
    orientation: 'both',
  })

  // Combiner les refs
  const combinedRef = React.useCallback((node: HTMLTableElement) => {
    // containerRef may be a RefObject with readonly current in typings; cast to MutableRefObject
    ;(tableRef as React.MutableRefObject<HTMLTableElement | null>).current = node
    ;(containerRef as React.MutableRefObject<HTMLTableElement | null>).current = node
  }, [containerRef])

  // Gérer la navigation clavier personnalisée pour les tables
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    const { key, ctrlKey } = event

    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        if (focusedRowIndex < data.length - 1) {
          const newIndex = focusedRowIndex + 1
          setFocusedRowIndex(newIndex)
          onFocusRow?.(data[newIndex]!, newIndex)
          announceToScreenReader(`Ligne ${newIndex + 1} sur ${data.length}`)
        }
        break

      case 'ArrowUp':
        event.preventDefault()
        if (focusedRowIndex > 0) {
          const newIndex = focusedRowIndex - 1
          setFocusedRowIndex(newIndex)
          onFocusRow?.(data[newIndex]!, newIndex)
          announceToScreenReader(`Ligne ${newIndex + 1} sur ${data.length}`)
        }
        break

      case 'ArrowRight':
        event.preventDefault()
        if (focusedColumnIndex < columns.length - 1) {
          setFocusedColumnIndex(focusedColumnIndex + 1)
          announceToScreenReader(`Colonne ${columns[focusedColumnIndex + 1]!.header}`)
        }
        break

      case 'ArrowLeft':
        event.preventDefault()
        if (focusedColumnIndex > 0) {
          setFocusedColumnIndex(focusedColumnIndex - 1)
          announceToScreenReader(`Colonne ${columns[focusedColumnIndex - 1]!.header}`)
        }
        break

      case 'Home':
        event.preventDefault()
        if (ctrlKey) {
          setFocusedRowIndex(0)
          setFocusedColumnIndex(0)
          announceToScreenReader('Début du tableau')
        } else {
          setFocusedColumnIndex(0)
          announceToScreenReader(`Première colonne: ${columns[0]!.header}`)
        }
        break

      case 'End':
        event.preventDefault()
        if (ctrlKey) {
          setFocusedRowIndex(data.length - 1)
          setFocusedColumnIndex(columns.length - 1)
          announceToScreenReader('Fin du tableau')
        } else {
          setFocusedColumnIndex(columns.length - 1)
          announceToScreenReader(`Dernière colonne: ${columns[columns.length - 1]!.header}`)
        }
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedRowIndex >= 0 && focusedRowIndex < data.length) {
          const item = data[focusedRowIndex]!
          if (selectable && key === ' ') {
            // Gérer la sélection
            const rowId = getRowId(item, focusedRowIndex)
            const newSelection = new Set(selectedRows)
            if (newSelection.has(rowId)) {
              newSelection.delete(rowId)
              announceToScreenReader('Ligne désélectionnée')
            } else {
              newSelection.add(rowId)
              announceToScreenReader('Ligne sélectionnée')
            }
            onSelectionChange?.(newSelection)
          } else if (onRowClick) {
            onRowClick(item, focusedRowIndex)
          }
        }
        break

      case 'a':
        if (ctrlKey && selectable) {
          event.preventDefault()
          // Sélectionner tout
          const allIds = new Set(data.map((_item, _index) => getRowId(_item, _index))) // Correction: utilise _index
          onSelectionChange?.(allIds)
          announceToScreenReader(`${data.length} lignes sélectionnées`)
        }
        break
    }
  }, [
    focusedRowIndex,
    focusedColumnIndex,
    data,
    columns,
    selectable,
    selectedRows,
    onSelectionChange, // C'est ici qu'il faut le laisser
    getRowId,
    onRowClick,
    onFocusRow,
    announceToScreenReader
  ])

  // Gérer le tri
  const handleSort = React.useCallback((columnKey: string) => {
    if (!sortable || !onSort) return

    const newDirection: 'asc' | 'desc' =
      sortConfig?.key === columnKey && sortConfig?.direction === 'asc'
        ? 'desc'
        : 'asc'

    const newSortConfig: SortConfig = { key: columnKey, direction: newDirection }
    onSort(newSortConfig)

    const column = columns.find(col => col.key === columnKey)
    announceToScreenReader(
      `Tableau trié par ${column?.header} en ordre ${newDirection === 'asc' ? 'croissant' : 'décroissant'}`
    )
  }, [sortable, onSort, sortConfig, columns, announceToScreenReader])

  // Gérer la sélection de toutes les lignes
  const handleSelectAll = React.useCallback((checked: boolean) => {
    if (!selectable || !onSelectionChange) return

    if (checked) {
      const allIds = new Set(data.map((_item, _index) => getRowId(_item, _index)))
      onSelectionChange(allIds)
      announceToScreenReader(`${data.length} lignes sélectionnées`)
    } else {
      onSelectionChange(new Set())
      announceToScreenReader('Toutes les lignes désélectionnées')
    }
  }, [selectable, onSelectionChange, data, getRowId, announceToScreenReader]) // C'est ici qu'il faut le laisser

  // Calculer les statistiques de sélection
  const selectionStats = React.useMemo(() => {
    const totalSelected = selectedRows.size
    const totalRows = data.length
    const allSelected = totalSelected === totalRows && totalRows > 0
    const someSelected = totalSelected > 0 && totalSelected < totalRows

    return { totalSelected, totalRows, allSelected, someSelected }
  }, [selectedRows, data])

  // Rendu du contenu de cellule
  const renderCellContent = React.useCallback((column: Column<T>, _item: T) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(_item)
    }
    return _item[column.accessor]! as React.ReactNode
  }, [])

  // Classes CSS
  const tableClasses = cn(
    "w-full border-collapse",
    bordered && "border border-border",
    preferences.highContrast && "border-2 border-foreground",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  )

  const headerClasses = cn(
    "bg-muted/50 text-left font-medium",
    compact ? "px-2 py-1 text-sm" : "px-4 py-3",
    preferences.highContrast && "bg-muted border-b-2 border-foreground"
  )

  const cellClasses = cn(
    "border-b border-border",
    compact ? "px-2 py-1 text-sm" : "px-4 py-3",
    preferences.highContrast && "border-b-2"
  )

  const rowClasses = (_index: number, isSelected: boolean) => cn(
    striped && _index % 2 === 1 && "bg-muted/25",
    isSelected && "bg-primary/10",
    focusedRowIndex === _index && "bg-accent ring-2 ring-ring ring-inset",
    onRowClick && "cursor-pointer hover:bg-muted/50",
    preferences.reducedMotion ? "transition-none" : "transition-colors"
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Chargement des données...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive" role="alert">
        <p>Erreur lors du chargement des données: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Informations sur la sélection */}
      {selectable && selectionStats.totalSelected > 0 && (
        <div className="text-sm text-muted-foreground" aria-live="polite">
          {selectionStats.totalSelected} ligne{selectionStats.totalSelected > 1 ? 's' : ''} sélectionnée{selectionStats.totalSelected > 1 ? 's' : ''} sur {selectionStats.totalRows}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto">
        <table
          ref={combinedRef}
          className={tableClasses ?? ''}
          role="table"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-rowcount={data.length + 1} // +1 pour l'en-tête
          aria-colcount={columns.length + (selectable ? 1 : 0)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          
          <thead>
            <tr role="row">
              {selectable && (
                <th
                  className={cn(headerClasses, "w-12")}
                  role="columnheader"
                  aria-label="Sélection"
                >
                  <input
                    type="checkbox"
                    checked={selectionStats.allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = selectionStats.someSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Sélectionner toutes les lignes"
                    className="rounded border-border"
                  />
                </th>
              )}
              
              {columns.map((column, _index) => ( // Correction : utilisation de _index
                <th
                  key={column.key}
                  className={cn(
                    headerClasses,
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    sortable && column.sortable && "cursor-pointer hover:bg-muted/75"
                  )}
                  role="columnheader"
                  aria-sort={
                    sortConfig?.key === column.key
                      ? sortConfig.direction === 'asc' ? 'ascending' : 'descending'
                      : column.sortable ? 'none' : undefined
                  }
                  aria-label={column.ariaLabel || column.header}
                  aria-describedby={column.description ? `${column.key}-desc` : undefined}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {sortable && column.sortable && (
                      <span className="flex flex-col">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                  
                  {column.description && (
                    <div id={`${column.key}-desc`} className="sr-only">
                      {column.description}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className={cn(cellClasses, "text-center text-muted-foreground")}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((_item, rowIndex) => {
                const rowId = getRowId(_item, rowIndex)
                const isSelected = selectedRows.has(rowId)
                
                return (
                  <tr
                    key={rowId}
                    className={rowClasses(rowIndex, isSelected)}
                    role="row"
                    aria-rowindex={rowIndex + 2} // +2 car l'en-tête est 1
                    aria-selected={selectable ? isSelected : undefined}
                    onClick={() => onRowClick?.(_item, rowIndex)}
                    onDoubleClick={() => onRowDoubleClick?.(_item, rowIndex)}
                  >
                    {selectable && (
                      <td className={cellClasses ?? ''} role="gridcell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelection = new Set(selectedRows)
                            if (e.target.checked) {
                              newSelection.add(rowId)
                            } else {
                              newSelection.delete(rowId)
                            }
                            onSelectionChange?.(newSelection) // Opérateur d'appel optionnel
                          }}
                          aria-label={`Sélectionner la ligne ${rowIndex + 1}`}
                          className="rounded border-border"
                        />
                      </td>
                    )}
                    
                    {columns.map((column, colIndex) => (
                      <td
                        key={column.key}
                        className={cn(
                          cellClasses,
                          column.align === 'center' && "text-center",
                          column.align === 'right' && "text-right",
                          focusedRowIndex === rowIndex && focusedColumnIndex === colIndex && "ring-2 ring-ring ring-inset"
                        )}
                        role="gridcell"
                        aria-describedby={column.description ? `${column.key}-desc` : undefined}
                      >
                        {renderCellContent(column, _item)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.currentPage} sur {pagination.totalPages} 
            ({pagination.totalItems} élément{pagination.totalItems > 1 ? 's' : ''} au total)
          </div>
          
          <button
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage <= 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Page précédente"
          >
            Précédent
          </button>
          
          <button
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Page suivante"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Résumé pour lecteurs d'écran */}
      {summary && (
        <div className="sr-only" aria-live="polite">
          {summary}
        </div>
      )}
    </div>
  )
}

export { AccessibleDataTable }