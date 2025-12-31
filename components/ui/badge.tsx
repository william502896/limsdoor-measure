import * as React from "react"
import { cn } from "@/app/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }>(
    ({ className, variant = "default", ...props }, ref) => {
        const variants = {
            default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 bg-slate-100 text-slate-900",
            secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 bg-slate-800 text-slate-200",
            destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 bg-red-500 text-white",
            outline: "text-foreground border-slate-700 text-slate-300",
        }

        return (
            <div
                ref={ref}
                className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)}
                {...props}
            />
        )
    }
)
Badge.displayName = "Badge"

export { Badge }
