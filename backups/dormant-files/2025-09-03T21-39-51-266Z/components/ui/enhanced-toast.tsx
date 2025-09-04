"use client"

import { toast } from "./use-toast"
import { cn } from "@/lib/utils"
import { ToastAction, type ToastActionElement } from "@/components/ui/toast"

export interface EnhancedToastOptions {
  title?: string
  description?: string
  duration?: number
  action?: ToastActionElement
  className?: string
}

function buildToastOptions(
  base: any
) {
  const { action, ...rest } = base
  return action
    ? { ...rest, action }
    : rest
}

// Success toast with celebration animation
export function successToast(options: EnhancedToastOptions) {
  return toast(
    buildToastOptions({
      title: options.title || "Success!",
      description: options.description,
      duration: options.duration || 4000,
      action: options.action,
      className: cn(
        "border-success/20 bg-success/10 backdrop-blur-sm",
        options.className
      ),
    })
  )
}

// Error toast with shake animation
export function errorToast(options: EnhancedToastOptions) {
  return toast(
    buildToastOptions({
      title: options.title || "Error",
      description: options.description,
      duration: options.duration || 6000,
      action: options.action,
      className: cn(
        "border-destructive/20 bg-destructive/10 backdrop-blur-sm animate-shake",
        options.className
      ),
    })
  )
}

// Warning toast with attention-grabbing animation
export function warningToast(options: EnhancedToastOptions) {
  return toast(
    buildToastOptions({
      title: options.title || "Warning",
      description: options.description,
      duration: options.duration || 5000,
      action: options.action,
      className: cn(
        "border-warning/20 bg-warning/10 backdrop-blur-sm",
        options.className
      ),
    })
  )
}

// Info toast with subtle animation
export function infoToast(options: EnhancedToastOptions) {
  return toast(
    buildToastOptions({
      title: options.title || "Information",
      description: options.description,
      duration: options.duration || 4000,
      action: options.action,
      className: cn(
        "border-info/20 bg-info/10 backdrop-blur-sm",
        options.className
      ),
    })
  )
}

// Loading toast with spinner
export function loadingToast(options: EnhancedToastOptions & { 
  onCancel?: () => void 
}) {
  const action =
    options.onCancel != null
      ? (
        <ToastAction altText="Cancel" onClick={options.onCancel}>
          Cancel
        </ToastAction>
      )
      : options.action

  return toast(
    buildToastOptions({
      title: options.title || "Loading...",
      description: options.description,
      duration: options.duration || 0,
      action,
      className: cn(
        "border bg-background/95 backdrop-blur-sm",
        options.className
      ),
    })
  )
}

// Promise toast - shows loading, then success/error based on promise result
export function promiseToast<T>(
  promise: Promise<T>,
  options: {
    loading?: EnhancedToastOptions
    success?: (_data: T) => EnhancedToastOptions
    error?: (error: unknown) => EnhancedToastOptions
  }
) {
  const loadingToastInstance = loadingToast(
    options.loading || { title: "Loading..." }
  )

  promise
    .then((_data) => {
      loadingToastInstance.dismiss()
      if (options.success) {
        successToast(options.success(_data))
      }
    })
    .catch((error: unknown) => {
      loadingToastInstance.dismiss()
      if (options.error) {
        errorToast(options.error(error))
      } else {
        errorToast({
          title: "Error",
          description: (error as Error)?.message || "Something went wrong"
        })
      }
    })

  return loadingToastInstance
}

// Batch toast for multiple operations
export function batchToast(
  operations: Array<{
    name: string
    promise: Promise<unknown>
  }>,
  options?: {
    onComplete?: (results: Array<{ name: string; success: boolean; result?: unknown; error?: unknown }>) => void
  }
) {
  const results: Array<{ name: string; success: boolean; result?: unknown; error?: unknown }> = []
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
      .catch((error: unknown) => {
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
  return toast(
    buildToastOptions({
      title: options.title,
      description: options.description,
      duration: options.duration || 8000,
      action: (
        <ToastAction altText={options.undoLabel || "Undo"} onClick={options.onUndo}>
          {options.undoLabel || "Undo"}
        </ToastAction>
      ),
      className: cn(
        "border bg-background/95 backdrop-blur-sm",
        options.className
      ),
    })
  )
}

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