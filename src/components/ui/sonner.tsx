import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { useEffect, useState } from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use a safe theme getter that handles the case where ThemeProvider might not be ready
  let theme: string = "system"
  try {
    const themeContext = useTheme()
    theme = themeContext.theme || "system"
  } catch {
    // ThemeProvider not ready yet, use system default
    theme = "system"
  }

  if (!mounted) {
    return null
  }

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir="rtl"
      className="toaster group"
      richColors
      closeButton
      expand={false}
      visibleToasts={1}
      position="top-center"
      toastOptions={{
        duration: 4000,
        className: "z-[2000] !max-w-[85vw] sm:!max-w-[340px]",
        classNames: {
          toast:
            "group toast group-[.toaster]:z-[2000] group-[.toaster]:bg-white dark:group-[.toaster]:bg-gray-900 group-[.toaster]:text-gray-900 dark:group-[.toaster]:text-gray-100 group-[.toaster]:border-gray-200 dark:group-[.toaster]:border-gray-700 group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg group-[.toaster]:p-3 group-[.toaster]:border group-[.toaster]:text-sm",
          title: 
            "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:mb-0.5 group-[.toast]:text-gray-900 dark:group-[.toast]:text-gray-100",
          description: 
            "group-[.toast]:text-gray-600 dark:group-[.toast]:text-gray-400 group-[.toast]:text-xs",
          success:
            "!bg-emerald-50 dark:!bg-emerald-950 !border-emerald-300 dark:!border-emerald-700 !text-emerald-800 dark:!text-emerald-200",
          error:
            "!bg-red-50 dark:!bg-red-950 !border-red-300 dark:!border-red-700 !text-red-800 dark:!text-red-200",
          info:
            "!bg-blue-50 dark:!bg-blue-950 !border-blue-300 dark:!border-blue-700 !text-blue-800 dark:!text-blue-200",
          warning:
            "!bg-amber-50 dark:!bg-amber-950 !border-amber-300 dark:!border-amber-700 !text-amber-800 dark:!text-amber-200",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-gray-100 dark:group-[.toast]:bg-gray-800 group-[.toast]:text-gray-700 dark:group-[.toast]:text-gray-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
export { toast } from "sonner"
