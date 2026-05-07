import { toast as sonnerToast } from "sonner";

// Interface for toast options
export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "info" | "warning" | "error";
  duration?: number;
}

// Main toast function that uses sonner directly
function toast(props: ToastProps) {
  const { title, description, variant = "default", duration } = props;
  
  const message = title || description || "";
  const options = {
    description: title ? description : undefined,
    duration,
  };

  switch (variant) {
    case "success":
      return sonnerToast.success(message, options);
    case "error":
    case "destructive":
      return sonnerToast.error(message, options);
    case "warning":
      return sonnerToast.warning(message, options);
    case "info":
      return sonnerToast.info(message, options);
    default:
      return sonnerToast(message, options);
  }
}

// Convenience methods
toast.success = (message: string, options?: { description?: string; duration?: number }) => {
  return sonnerToast.success(message, options);
};

toast.error = (message: string, options?: { description?: string; duration?: number }) => {
  return sonnerToast.error(message, options);
};

toast.info = (message: string, options?: { description?: string; duration?: number }) => {
  return sonnerToast.info(message, options);
};

toast.warning = (message: string, options?: { description?: string; duration?: number }) => {
  return sonnerToast.warning(message, options);
};

toast.loading = (message: string, options?: { description?: string; duration?: number }) => {
  return sonnerToast.loading(message, options);
};

toast.dismiss = (toastId?: string | number) => {
  return sonnerToast.dismiss(toastId);
};

// Hook for React components
function useToast() {
  return {
    toast,
    dismiss: toast.dismiss,
  };
}

export { useToast, toast };
