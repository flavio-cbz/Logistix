"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/shared/utils"
import { Check, X, Loader2 } from "lucide-react"

export type EditableCellType = "text" | "number" | "select"

export interface SelectOption {
    value: string
    label: string
}

export interface EditableCellProps {
    value: string | number | null | undefined
    type?: EditableCellType
    options?: SelectOption[] // For select type
    onSave: (newValue: string | number) => Promise<void> | void
    placeholder?: string
    className?: string
    displayClassName?: string
    inputClassName?: string
    formatter?: (value: string | number | null | undefined) => string
    disabled?: boolean
    min?: number
    max?: number
    step?: number | string
}

export function EditableCell({
    value,
    type = "text",
    options = [],
    onSave,
    placeholder = "-",
    className,
    displayClassName,
    inputClassName,
    formatter,
    disabled = false,
    min,
    max,
    step,
}: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState<string>(String(value ?? ""))
    const [isSaving, setIsSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

    // Update editValue when value prop changes
    useEffect(() => {
        if (!isEditing) {
            setEditValue(String(value ?? ""))
        }
    }, [value, isEditing])

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            if (inputRef.current instanceof HTMLInputElement) {
                inputRef.current.select()
            }
        }
    }, [isEditing])

    const handleStartEdit = useCallback(() => {
        if (disabled) return
        setEditValue(String(value ?? ""))
        setIsEditing(true)
    }, [disabled, value])

    const handleCancel = useCallback(() => {
        setEditValue(String(value ?? ""))
        setIsEditing(false)
    }, [value])

    const handleSave = useCallback(async () => {
        const newValue = type === "number" ? parseFloat(editValue) || 0 : editValue

        // Don't save if value hasn't changed
        if (String(newValue) === String(value ?? "")) {
            setIsEditing(false)
            return
        }

        setIsSaving(true)
        try {
            await onSave(newValue)
            setIsEditing(false)
        } catch {
            // Keep in edit mode on error
        } finally {
            setIsSaving(false)
        }
    }, [editValue, type, value, onSave])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleSave()
        } else if (e.key === "Escape") {
            e.preventDefault()
            handleCancel()
        }
    }, [handleSave, handleCancel])

    const handleBlur = useCallback(() => {
        // Small delay to allow clicking save button
        setTimeout(() => {
            if (isEditing && !isSaving) {
                handleSave()
            }
        }, 150)
    }, [isEditing, isSaving, handleSave])

    // Display value
    const displayValue = formatter
        ? formatter(value)
        : (value !== null && value !== undefined && value !== "")
            ? String(value)
            : placeholder

    if (disabled) {
        return (
            <span className={cn("text-muted-foreground", displayClassName)}>
                {displayValue}
            </span>
        )
    }

    if (isEditing) {
        return (
            <div className={cn("flex items-center gap-1", className)}>
                {type === "select" ? (
                    <select
                        ref={inputRef as React.RefObject<HTMLSelectElement>}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isSaving}
                        className={cn(
                            "h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                            inputClassName
                        )}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <Input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type={type}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isSaving}
                        min={min}
                        max={max}
                        step={step}
                        className={cn("h-8 px-2 py-1 text-sm", inputClassName)}
                    />
                )}
                {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                            title="Sauvegarder (Entrée)"
                        >
                            <Check className="h-4 w-4 text-green-600" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                            title="Annuler (Échap)"
                        >
                            <X className="h-4 w-4 text-red-600" />
                        </button>
                    </>
                )}
            </div>
        )
    }

    return (
        <span
            onClick={handleStartEdit}
            className={cn(
                "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors inline-block min-w-[2rem]",
                displayClassName
            )}
            title="Cliquer pour modifier"
        >
            {displayValue}
        </span>
    )
}
