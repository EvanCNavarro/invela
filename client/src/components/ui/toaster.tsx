import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastViewportProps
} from "@/components/ui/toast"

export interface ToasterProps {
  /**
   * Position of the toast viewport
   */
  position?: ToastViewportProps['position'];
}

export function Toaster({ position = 'bottom-right' }: ToasterProps) {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport position={position} />
    </ToastProvider>
  )
}
