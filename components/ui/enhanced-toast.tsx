"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import { toast } from "./use-toast"
import { cn } from "@/lib/utils/cn"

// Enhanced toast variants with icons and modern styling
export interface EnhancedToastOptions {
  title?: string
  description?: string
  duration?: number
  action?: React.ReactElement
  className?: string
}

// Success toast with celebration animation
export function successToast(options: EnhancedToastOptions) {
  return toast({
    variant: "success",
    title: ((
      <div className="flex items-center space-x-2">
        <CheckCircle2 className="h-5 w-5 text-success animate-bounce" />
        <span>{options.title || "Success!"}</span>
      </div>
    ) as unknown) as string,
    description: options.description,
    duration: options.duration || 4000,
    action: options.action,
    className: cn(
      "border-success/20 bg-success/10 backdrop-blur-sm",
      options.className
    ),
  })
}

// Error toast with shake animation
export function errorToast(options: EnhancedToastOptions) {
  return toast({
    variant: "destructive",
    title: ((
      <div className="flex items-center space-x-2">
        <AlertCircle className="h-5 w-5 text-destructive animate-pulse" />
        <span>{options.title || "Error"}</span>
      </div>
    ) as unknown) as string,
    description: options.description,
    duration: options.duration || 6000,
    action: options.action,
    className: cn(
      "border-destructive/20 bg-destructive/10 backdrop-blur-sm animate-shake",
      options.className
    ),
  })
}

// Warning toast with attention-grabbing animation
export function warningToast(options: EnhancedToastOptions) {
  return toast({
    variant: "warning",
    title: ((
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-warning animate-pulse" />
        <span>{options.title || "Warning"}</span>
      </div>
    ) as unknown) as string,
    description: options.description,
    duration: options.duration || 5000,
    action: options.action,
    className: cn(
      "border-warning/20 bg-warning/10 backdrop-blur-sm",
      options.className
    ),
  })
}

// Info toast with subtle animation
export function infoToast(options: EnhancedToastOptions) {
  return toast({
    variant: "info",
    title: ((
      <div className="flex items-center space-x-2">
        <Info className="h-5 w-5 text-info" />
        <span>{options.title || "Information"}</span>
      </div>
    ) as unknown) as string,
    description: options.description,
    duration: options.duration || 4000,
    action: options.action,
    className: cn(
      "border-info/20 bg-info/10 backdrop-blur-sm",
      options.className
    ),
  })
}

// Loading toast with spinner
export function loadingToast(options: EnhancedToastOptions & { 
  onCancel?: () => void 
}) {
  return toast({
    variant: "default",
    title: ((
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>{options.title || "Loading..."}</span>
      </div>
    ) as unknown) as string,
    description: options.description,
    duration: options.duration || 0, // Don't auto-dismiss loading toasts
    action: options.onCancel ? (
      <button
        onClick={options.onCancel}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Cancel
      </button>
    ) : options.action,
    className: cn(
      "border bg-background/95 backdrop-blur-sm",
      options.className
    ),
  })
}

// Promise toast - shows loading, then success/error based on promise result
export function promiseToast<T>(
  promise: Promise<T>,
  options: {
    loading?: EnhancedToastOptions
    success?: (data: T) => EnhancedToastOptions
    error?: (error: any) => EnhancedToastOptions
  }
) {
  const loadingToastInstance = loadingToast(
    options.loading || { title: "Loading..." }
  )

  promise
    .then((data) => {
      loadingToastInstance.dismiss()
      if (options.success) {
        successToast(options.success(data))
      }
    })
    .catch((error) => {
      loadingToastInstance.dismiss()
      if (options.error) {
        errorToast(options.error(error))
      } else {
        errorToast({
          title: "Error",
          description: error.message || "Something went wrong"
        })
      }
    })

  return loadingToastInstance
}

// Batch toast for multiple operations
export function batchToast(
  operations: Array<{
    name: string
    promise: Promise<any>
  }>,
  options?: {
    onComplete?: (results: Array<{ name: string; success: boolean; result?: any; error?: any }>) => void
  }
) {
  const results: Array<{ name: string; success: boolean; result?: any; error?: any }> = []
  let completed = 0

  const loadingToastInstance = loadingToast({
    title: "Processing operations...",
    description: `0 of ${operations.length} completed`
  })

  operations.forEach((operation, index) => {
    operation.promise
      .then((result) => {
        results[index] = { name: operation.name, success: true, result }
        completed++
        
        loadingToastInstance.update({
          description: `${completed} of ${operations.length} completed`
        })

        if (completed === operations.length) {
          loadingToastInstance.dismiss()
          const successCount = results.filter(r => r.success).length
          const errorCount = results.length - successCount
          
          if (errorCount === 0) {
            successToast({
              title: "All operations completed",
              description: `${successCount} operations successful`
            })
          } else if (successCount === 0) {
            errorToast({
              title: "All operations failed",
              description: `${errorCount} operations failed`
            })
          } else {
            warningToast({
              title: "Operations completed with errors",
              description: `${successCount} successful, ${errorCount} failed`
            })
          }
          
          options?.onComplete?.(results)
        }
      })
      .catch((error) => {
        results[index] = { name: operation.name, success: false, error }
        completed++
        
        loadingToastInstance.update({
          description: `${completed} of ${operations.length} completed`
        })

        if (completed === operations.length) {
          loadingToastInstance.dismiss()
          const successCount = results.filter(r => r.success).length
          const errorCount = results.length - successCount
          
          if (errorCount === 0) {
            successToast({
              title: "All operations completed",
              description: `${successCount} operations successful`
            })
          } else if (successCount === 0) {
            errorToast({
              title: "All operations failed",
              description: `${errorCount} operations failed`
            })
          } else {
            warningToast({
              title: "Operations completed with errors",
              description: `${successCount} successful, ${errorCount} failed`
            })
          }
          
          options?.onComplete?.(results)
        }
      })
  })

  return loadingToastInstance
}

// Undo toast - shows action with undo button
export function undoToast(
  options: EnhancedToastOptions & {
    onUndo: () => void
    undoLabel?: string
  }
) {
  return toast({
    variant: "default",
    title: options.title,
    description: options.description,
    duration: options.duration || 8000, // Longer duration for undo actions
    action: (
      <button
        onClick={options.onUndo}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {options.undoLabel || "Undo"}
      </button>
    ),
    className: cn(
      "border bg-background/95 backdrop-blur-sm",
      options.className
    ),
  })
}

// Export all toast functions as a single object for easier importing
export const enhancedToast = {
  success: successToast,
  error: errorToast,
  warning: warningToast,
  info: infoToast,
  loading: loadingToast,
  promise: promiseToast,
  batch: batchToast,
  undo: undoToast,
}