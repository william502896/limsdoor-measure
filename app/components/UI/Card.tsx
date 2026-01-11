import React from "react";
import { cn } from "@/app/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Card({ className, children, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
