import React from "react";

type ChipButtonProps = {
    active?: boolean;
    label: string;
    onClick: () => void;
    colorClass?: string; // e.g., "text-indigo-700 bg-white border-2 border-indigo-100"
};

export function ChipButton({ active, label, onClick, colorClass }: ChipButtonProps) {
    // Base classes for a unified look
    const base = "h-8 px-3 rounded-full text-xs font-bold transition-all border flex items-center justify-center shrink-0";

    // Default active/inactive logic if colorClass is not manual override
    const activeStyle = "bg-indigo-600 text-white border-indigo-600 shadow-sm";
    const inactiveStyle = "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";

    const style = colorClass ? colorClass : (active ? activeStyle : inactiveStyle);

    return (
        <button onClick={onClick} className={`${base} ${style}`}>
            {label}
        </button>
    );
}
