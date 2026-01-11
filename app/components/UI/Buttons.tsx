import React, { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    icon?: React.ReactNode;
}

export function PrimaryButton({ children, className = "", loading, icon, ...props }: ButtonProps) {
    return (
        <button
            {...props}
            disabled={loading || props.disabled}
            className={`h-11 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
            {children}
        </button>
    );
}

export function SecondaryButton({ children, className = "", loading, icon, ...props }: ButtonProps) {
    return (
        <button
            {...props}
            disabled={loading || props.disabled}
            className={`h-11 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
            {children}
        </button>
    );
}
