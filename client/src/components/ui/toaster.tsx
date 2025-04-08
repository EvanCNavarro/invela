import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastIcon
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Skip empty toasts
        if (!id || (!title && !description && !action)) {
          return null;
        }
        
        // Normalize the variant
        const normalizedVariant = variant as "default" | "success" | "info" | "warning" | "error" | "file-upload" | "clipboard" | "destructive" | undefined;
        
        return (
          <Toast key={id} variant={normalizedVariant} {...props}>
            <div className="flex items-start w-full">
              {normalizedVariant && normalizedVariant !== "default" && (
                <ToastIcon variant={normalizedVariant} />
              )}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
