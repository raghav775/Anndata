import { Loader2 } from "lucide-react"
import { type ButtonHTMLAttributes, forwardRef } from "react"
import { clsx } from "clsx"

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-700 text-white shadow-sm hover:bg-primary-800 active:bg-primary-900 disabled:bg-primary-300",
  secondary:
    "bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 disabled:text-ink-400",
  ghost: "text-ink-700 hover:bg-ink-100 disabled:text-ink-300",
  danger: "bg-danger-500 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300",
  accent: "bg-accent-500 text-white shadow-sm hover:bg-accent-600 disabled:bg-accent-300",
}

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", isLoading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={clsx(
        "focus-ring inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
})
