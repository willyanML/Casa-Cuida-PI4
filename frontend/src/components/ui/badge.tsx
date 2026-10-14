import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-sky-600 text-white shadow hover:bg-sky-500",
        secondary:
          "border-transparent bg-slate-800 text-slate-200 hover:bg-slate-700",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
        warning:
          "border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
        outline: "border-white/15 text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
