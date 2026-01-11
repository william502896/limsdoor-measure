import React from "react";
import { cn } from "@/app/lib/utils";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";

        // Height: sm=36, md=44, lg=52
        const sizeClasses = {
            sm: "h-9 px-3 text-xs",
            md: "h-[44px] px-4 text-sm",
            lg: "h-[52px] px-6 text-base"
        };

        const variantClasses = {
            primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
            secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
            outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
            ghost: "hover:bg-slate-100 text-slate-600",
            danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm"
        };

        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
                    sizeClasses[size],
                    variantClasses[variant],
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";
