import React from "react";
import { Card } from "./Card";

type KPIStatCardProps = {
    label: string;
    value: string | number;
    subValue?: string;
    icon?: React.ReactNode; // Optional Icon
    trend?: "up" | "down" | "neutral";
};

export function KPIStatCard({ label, value, subValue, icon }: KPIStatCardProps) {
    return (
        <Card className="flex flex-col justify-between h-full min-h-[100px]">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
                {icon && <div className="text-slate-400 opacity-80">{icon}</div>}
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-900 leading-none mb-1 tracking-tight">{value}</div>
                {subValue && <div className="text-xs font-medium text-slate-400">{subValue}</div>}
            </div>
        </Card>
    );
}
