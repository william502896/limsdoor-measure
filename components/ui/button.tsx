import * as React from "react"
// import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/app/lib/utils"

// Removing Slot dependency for simplicity since we probably don't have radix installed
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link", size?: "default" | "sm" | "lg" | "icon", asChild?: boolean }>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        // const Comp = asChild ? Slot : "button"
        const Comp = "button"

        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90 bg-slate-100 text-slate-900 hover:bg-slate-200",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 bg-red-500 text-white hover:bg-red-600",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 bg-slate-800 text-slate-200 hover:bg-slate-700",
            ghost: "hover:bg-accent hover:text-accent-foreground hover:bg-slate-800 text-slate-300",
            link: "text-primary underline-offset-4 hover:underline text-indigo-400",
        }

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
