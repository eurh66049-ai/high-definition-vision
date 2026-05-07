
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted relative overflow-hidden", className)}
      {...props}
    >
      {/* Add animated shine effect */}
      <div className="absolute inset-0 w-full h-full" 
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          animation: 'shimmer 1.5s infinite',
          backgroundSize: '200% 100%',
        }}
      />
      <style>
        {`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        `}
      </style>
    </div>
  )
}

export { Skeleton }
