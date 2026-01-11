import React from "react";
import { cn } from "@/app/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Container({ className, children, ...props }: ContainerProps) {
    return (
        <div
            className={cn(
                "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
