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

    // Initial position on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Default: Bottom-Right or Top-Right? Previous code had Top-Right (window.innerWidth - 180, 24)
            // Let's stick to that, or better, maybe a safe bottom right?
            // The previous code had: setPosition({ x: window.innerWidth - 180, y: 24 });
            // Let's keep it consistent but ensure it's not off-screen
            setPosition({ x: window.innerWidth - 180, y: 80 });
        }
    }, []);

    // Return null if hidden 
    // Hidden on: /radio (itself), /shop (consumer view?), / (home?) -> as per previous logic
    if (pathname === '/radio') return null;

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e: React.MouseEvent) => {
        startDrag(e.clientX, e.clientY, e.currentTarget);
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
        moveDrag(e.clientX, e.clientY);
    };

    const handleWindowMouseUp = () => {
        endDrag();
    };

    // --- TOUCH HANDLERS ---
    const handleTouchStart = (e: React.TouchEvent) => {
        // Prevent scrolling while dragging
        // e.preventDefault(); // Can't preventDefault on passive listener, handle with style touch-action: none
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY, e.currentTarget);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        moveDrag(touch.clientX, touch.clientY);
    };

    const handleWindowTouchEnd = () => {
        endDrag();
    };

    // --- SHARED LOGIC ---
    const startDrag = (clientX: number, clientY: number, target: Element) => {
        let currentX = position?.x;
        let currentY = position?.y;

        // Verify initial calc
        if (currentX === undefined || currentY === undefined) {
            const rect = target.getBoundingClientRect();
            currentX = rect.left;
            currentY = rect.top;
            setPosition({ x: currentX, y: currentY });
        }

        setIsDragging(true);
        setIsMoved(false);
        dragStartRef.current = { x: clientX - currentX, y: clientY - currentY };
    };

    const moveDrag = (clientX: number, clientY: number) => {
        if (!isDragging || !dragStartRef.current) return;

        const newX = clientX - dragStartRef.current.x;
        const newY = clientY - dragStartRef.current.y;

        // Optional: Clamp to screen?
        // Let's allow free move for now
        setPosition({ x: newX, y: newY });

        // If moved more than tiny threshold, consider it a move
        setIsMoved(true);
    };

    const endDrag = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };

    // Global Listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
            window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
            window.addEventListener('touchend', handleWindowTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            window.removeEventListener('touchmove', handleWindowTouchMove);
            window.removeEventListener('touchend', handleWindowTouchEnd);
        };
    }, [isDragging]);


    const handleClick = (e: React.MouseEvent) => {
        // If it was a drag, prevent the link click
        if (isMoved) {
            e.preventDefault();
        }
    };

    // Always movable now
    const style: React.CSSProperties = position
        ? { position: 'fixed', left: position.x, top: position.y, zIndex: 9999, touchAction: 'none' }
        : { position: 'fixed', top: 80, right: 20, zIndex: 9999, opacity: 0 }; // Hide until mounted/positioned

    return (
        <div
            style={style}
            className="cursor-move touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <Link
                href="/radio"
                onClick={handleClick}
                draggable={false}
                className={`group flex items-center gap-2 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-full shadow-2xl hover:bg-slate-800 transition-all ${isDragging ? 'scale-105 ring-4 ring-indigo-500/30' : ''}`}
            >
                <div className="relative">
                    <Radio size={20} className="text-white animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                </div>
                <span className="font-bold text-sm" suppressHydrationWarning>무전기</span>
            </Link>
        </div>
    );
}
