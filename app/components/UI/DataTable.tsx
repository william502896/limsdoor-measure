import React from "react";
import { cn } from "@/app/lib/utils";

// Simple DataTable that renders Table on Desktop, Cards on Mobile
// Assumption: data is an array of objects. columns is definition.

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
}

export function DataTable<T>({
    data,
    columns,
    keyField,
    onRowClick,
    emptyMessage = "데이터가 없습니다."
}: DataTableProps<T>) {

    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-slate-400">{emptyMessage}</div>;
    }

    return (
        <>
            {/* Desktop View (Table) - Hidden on Mobile */}
            <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={cn("px-6 py-4 font-bold whitespace-nowrap", col.className)}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row) => (
                            <tr
                                key={String(row[keyField])}
                                onClick={() => onRowClick?.(row)}
                                className={cn(
                                    "hover:bg-slate-50 transition-colors",
                                    onRowClick && "cursor-pointer"
                                )}
                            >
                                {columns.map((col, idx) => (
                                    <td key={idx} className="px-6 py-4 text-slate-700 font-medium">
                                        {col.cell ? col.cell(row) : String(row[col.accessorKey as keyof T] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile/Tablet View (Cards) - Hidden on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {data.map((row) => (
                    <div
                        key={String(row[keyField])}
                        onClick={() => onRowClick?.(row)}
                        className={cn(
                            "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3",
                            onRowClick && "active:scale-[0.98] transition-transform"
                        )}
                    >
                        {columns.map((col, idx) => {
                            const content = col.cell ? col.cell(row) : String(row[col.accessorKey as keyof T] ?? "");
                            // First column usually Title
                            if (idx === 0) {
                                return (
                                    <div key={idx} className="font-bold text-slate-900 text-lg mb-1">
                                        {content}
                                    </div>
                                );
                            }
                            return (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">{col.header}</span>
                                    <span className="text-slate-800 font-bold text-right">{content}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </>
    );
}
