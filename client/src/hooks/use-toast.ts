/**
 * ========================================
 * Toast Hook - User Notification Management
 * ========================================
 * 
 * Advanced toast notification system providing consistent user feedback
 * throughout the enterprise platform. Manages toast state, timing, and
 * deduplication with professional UX patterns and accessibility features.
 * 
 * Key Features:
 * - Intelligent toast deduplication to prevent spam
 * - Configurable timeout management with standard durations
 * - Toast limit enforcement for clean UI experience
 * - Type-safe toast variants with consistent styling
 * - Comprehensive logging and error tracking
 * 
 * Toast Management:
 * - Auto-dismissal with configurable timeouts
 * - Queue management with limit enforcement
 * - Message deduplication within time windows
 * - Action button support for interactive toasts
 * - Accessibility-compliant notification patterns
 * 
 * @module hooks/use-toast
 * @version 1.0.0
 * @since 2025-05-23
 */

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"
import getLogger from '@/utils/logger'

const logger = getLogger('ToastSystem')

const TOAST_LIMIT = 3 // Allow up to 3 toasts at once
// Standard timeout for all toasts (3 seconds)
const TOAST_REMOVE_DELAY = 3000
// Kept for backward compatibility but we'll use TOAST_REMOVE_DELAY for error toasts too
const ERROR_TOAST_REMOVE_DELAY = TOAST_REMOVE_DELAY
// Deduplication timeout window in milliseconds
const DEDUPLICATION_WINDOW = 1500

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

// Track recent toast signatures to prevent duplicates
const recentToasts = new Map<string, { timestamp: number, id: string }>()

// Function to generate a unique signature for a toast
function generateToastSignature(props: Toast): string {
  // Create a signature based on title, description, and variant
  return `${props.variant || 'default'}-${props.title || ''}-${props.description || ''}`
}

// Cleanup function for removing old toast signatures
function cleanupOldToastSignatures() {
  const now = Date.now()
  for (const [signature, data] of recentToasts.entries()) {
    if (now - data.timestamp > DEDUPLICATION_WINDOW) {
      recentToasts.delete(signature)
    }
  }
}

export type Toast = Omit<ToasterToast, "id"> & { id?: string }

function toast({ ...props }: Toast) {
  // Use provided ID or generate one
  const id = props.id || genId()
  
  // Generate a signature for deduplication
  const signature = generateToastSignature(props)
  
  // Check for recent duplicate toast
  const existingToast = recentToasts.get(signature)
  
  if (existingToast) {
    // If we have a recent duplicate, update the existing toast instead
    const timeSinceLastToast = Date.now() - existingToast.timestamp
    
    if (timeSinceLastToast < DEDUPLICATION_WINDOW) {
      logger.info('Deduplicating toast with signature: ' + signature)
      // If the ID is provided and doesn't match existing toast, update existing
      if (props.id && props.id !== existingToast.id) {
        // Update the existing toast with new properties
        dispatch({
          type: "UPDATE_TOAST",
          toast: { ...props, id: existingToast.id },
        })
      }
      // Return the existing toast controls to allow chaining/dismissal
      return {
        id: existingToast.id,
        dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: existingToast.id }),
        update: (props: ToasterToast) => dispatch({
          type: "UPDATE_TOAST",
          toast: { ...props, id: existingToast.id },
        }),
      } as const
    }
  }
  
  // Store this toast in recent history for deduplication
  recentToasts.set(signature, {
    timestamp: Date.now(),
    id
  })
  
  // Run cleanup of old signatures periodically
  cleanupOldToastSignatures()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // For destructive/error toasts, automatically start the dismiss timer with shorter duration
  if (props.variant === 'destructive') {
    setTimeout(() => {
      dismiss()
    }, ERROR_TOAST_REMOVE_DELAY)
  }

  return {
    id,
    dismiss,
    update,
  } as const
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
