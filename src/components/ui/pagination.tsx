
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-2", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"button">

// تحديث عنصر الرابط من 'a' إلى 'button' مع تحسين الأداء
const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <button
    aria-current={isActive ? "page" : undefined}
    type="button"
    className={cn(
      buttonVariants({
        variant: isActive ? "default" : "outline",
        size,
      }),
      isActive && "pointer-events-none",
      !isActive && "hover:bg-primary/10 hover:text-primary",
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

// تحديث مكون التنقل السابق لإصلاح مشكلة التوقيع وتحسين الأداء
const PaginationPrevious = ({
  className,
  onClick,
  disabled,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { disabled?: boolean }) => (
  <PaginationLink
    aria-label="الانتقال إلى الصفحة السابقة"
    size="default"
    className={cn(
      "gap-1 pr-2.5 select-none", 
      disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : "cursor-pointer",
      className
    )}
    onClick={(e) => {
      if (!disabled && onClick) {
        e.preventDefault();
        onClick(e);
      }
    }}
    disabled={disabled}
    type="button"
    {...props}
  >
    <span>السابق</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

// تحديث مكون التنقل التالي لإصلاح مشكلة التوقيع وتحسين الأداء
const PaginationNext = ({
  className,
  onClick,
  disabled,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { disabled?: boolean }) => (
  <PaginationLink
    aria-label="الانتقال إلى الصفحة التالية"
    size="default"
    className={cn(
      "gap-1 pl-2.5 select-none",
      disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : "cursor-pointer",
      className
    )}
    onClick={(e) => {
      if (!disabled && onClick) {
        e.preventDefault();
        onClick(e);
      }
    }}
    disabled={disabled}
    type="button"
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>التالي</span>
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">صفحات إضافية</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
