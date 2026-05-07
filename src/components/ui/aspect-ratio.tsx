
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"
import { cn } from "@/lib/utils"
import React from "react"

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> & {
    className?: string;
    containerClassName?: string;
  }
>(({ className, containerClassName, ...props }, ref) => (
  <div className={cn("overflow-hidden rounded-md", containerClassName)}>
    <AspectRatioPrimitive.Root
      ref={ref}
      className={cn("relative", className)}
      {...props}
    />
  </div>
))

AspectRatio.displayName = "AspectRatio"

export { AspectRatio }
