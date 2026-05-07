import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs = ({ items, className = '' }: BreadcrumbsProps) => {
  const handleNavigation = (href: string) => {
    window.location.href = href;
  };

  return (
    <nav
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground w-full min-w-0 ${className}`}
      aria-label="Breadcrumb"
      dir="rtl"
    >
      <button
        onClick={() => handleNavigation('/')}
        className="hover:text-foreground transition-colors cursor-pointer shrink-0"
        aria-label="الصفحة الرئيسية"
      >
        الرئيسية
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const baseClasses = isLast
          ? 'block max-w-full truncate align-bottom'
          : 'shrink-0';

        return (
          <Fragment key={index}>
            <span className="mx-1 shrink-0" aria-hidden="true">/</span>

            {item.href && !item.active ? (
              <button
                onClick={() => handleNavigation(item.href!)}
                className={`hover:text-foreground transition-colors cursor-pointer ${baseClasses}`}
                aria-current={item.active ? 'page' : undefined}
                title={item.label}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`${item.active ? 'text-foreground font-medium' : ''} ${baseClasses}`}
                aria-current={item.active ? 'page' : undefined}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};
