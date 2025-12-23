"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio } from 'lucide-react';

export default function GlobalRadioButton() {
    const pathname = usePathname();
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isMoved, setIsMoved] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    // Initial position on mount (avoid SSR mismatch)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPosition({ x: window.innerWidth - 180, y: 24 });
        }
    }, []);

    const isMovable = pathname.startsWith('/admin') || pathname.startsWith('/manage') || pathname.startsWith('/install');

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isMovable) return;

        let currentX = position?.x;
        let currentY = position?.y;

        if (currentX === undefined || currentY === undefined) {
            const rect = e.currentTarget.getBoundingClientRect();
            currentX = rect.left;
            currentY = rect.top;
            setPosition({ x: currentX, y: currentY });
        }

        setIsDragging(true);
        setIsMoved(false);
        dragStartRef.current = { x: e.clientX - currentX, y: e.clientY - currentY };
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
        if (!isDragging || !dragStartRef.current) return;

        e.preventDefault();
        const newX = e.clientX - dragStartRef.current.x;
        const newY = e.clientY - dragStartRef.current.y;

        setPosition({ x: newX, y: newY });
        setIsMoved(true);
    };

    const handleWindowMouseUp = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [isDragging]);


    // Return null if hidden (BUT AFTER HOOKS)
    if (pathname === '/radio' || pathname.startsWith('/shop') || pathname === '/') return null;

    const handleClick = (e: React.MouseEvent) => {
        if (isMoved) {
            e.preventDefault();
        }
    };

    const style: React.CSSProperties = (isMovable && position)
        ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }
        : { position: 'fixed', top: 24, right: 24, zIndex: 9999 };

    return (
        <div
            style={style}
            className={`transition-shadow ${isMovable ? 'cursor-move' : ''}`}
            onMouseDown={handleMouseDown}
        >
            <Link
                href="/radio"
                onClick={handleClick}
                draggable={false}
                className={`group flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-full hover:bg-slate-800 hover:scale-105 transition-all shadow-xl ${isDragging ? 'scale-105 ring-2 ring-indigo-500' : ''}`}
            >
                <Radio className="animate-pulse text-red-500" />
                <span className="font-bold">무전기 ON</span>
                <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">LIVE</span>
            </Link>
        </div>
    );
}
