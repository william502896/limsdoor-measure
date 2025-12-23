"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Home, Mic, Users, Settings, Volume2, MicOff, Signal } from 'lucide-react';

export default function RadioPage() {
    const [isTalking, setIsTalking] = useState(false);
    const [status, setStatus] = useState("대기 중");
    const [volume, setVolume] = useState(70);
    const [onlineUsers, setOnlineUsers] = useState([
        { id: 1, name: "관리자 (나)", status: "online", isSpeaking: false },
        { id: 2, name: "박실장 (현장)", status: "online", isSpeaking: false },
        { id: 3, name: "김기사 (운전)", status: "offline", isSpeaking: false },
        { id: 4, name: "이대리 (사무실)", status: "online", isSpeaking: true },
    ]);

    // Mock receiving audio
    useEffect(() => {
        const interval = setInterval(() => {
            // Randomly toggle someone speaking
            setOnlineUsers(prev => prev.map(u => {
                if (u.id === 4) return { ...u, isSpeaking: !u.isSpeaking };
                return u;
            }));
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const handlePushDown = () => {
        setIsTalking(true);
        setStatus("송신 중...");
        // In real app, start WebRTC stream here
    };

    const handlePushUp = () => {
        setIsTalking(false);
        setStatus("대기 중");
        // In real app, stop stream here
    };

    return (
        <div className="h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur z-10">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                    <Home size={20} />
                    <span className="font-bold">Home</span>
                </Link>
                <div className="font-black text-xl tracking-widest text-indigo-500">
                    LIMSDOOR RADIO
                </div>
                <button className="text-slate-400 hover:text-white">
                    <Settings size={20} />
                </button>
            </div>

            {/* Main PTT Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Visual Rings Animation for Speaking */}
                {isTalking && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-64 h-64 border-4 border-indigo-500/30 rounded-full animate-ping absolute"></div>
                        <div className="w-80 h-80 border-4 border-indigo-500/20 rounded-full animate-ping delay-75 absolute"></div>
                    </div>
                )}

                {/* Status Badge */}
                <div className={`mb-12 px-6 py-2 rounded-full font-bold text-lg flex items-center gap-3 transition-colors
                    ${isTalking ? "bg-red-500 text-white animate-pulse" : "bg-slate-800 text-slate-300"}`}>
                    <Signal size={18} />
                    {status}
                </div>

                {/* BIG PTT BUTTON */}
                <button
                    onMouseDown={handlePushDown}
                    onMouseUp={handlePushUp}
                    onMouseLeave={handlePushUp} // Handle drag off
                    onTouchStart={handlePushDown}
                    onTouchEnd={handlePushUp}
                    className={`w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-100 transform active:scale-95 shadow-2xl z-20
                        ${isTalking
                            ? "bg-gradient-to-br from-red-500 to-red-700 shadow-red-900/50 scale-95 border-8 border-red-400"
                            : "bg-gradient-to-br from-indigo-600 to-slate-800 shadow-indigo-900/50 border-8 border-slate-700 hover:border-indigo-500"
                        }
                    `}
                >
                    {isTalking ? (
                        <>
                            <Mic size={64} className="text-white mb-2" />
                            <span className="text-xl font-black">TALKING</span>
                        </>
                    ) : (
                        <>
                            <div className="text-slate-400 text-xs font-bold mb-2 tracking-widest">HOLD TO TALK</div>
                            <MicOff size={48} className="text-slate-300 mb-2 opacity-50" />
                            <span className="text-2xl font-black text-white">PTT</span>
                        </>
                    )}
                </button>

                <p className="mt-8 text-slate-500 text-sm font-medium">
                    버튼을 누르고 있는 동안만 목소리가 전달됩니다.
                </p>
            </div>

            {/* Active Users List (Bottom Drawer style) */}
            <div className="bg-slate-950 border-t border-slate-800 p-6 z-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-300 flex items-center gap-2">
                        <Users size={18} />
                        채널 접속자 ({onlineUsers.filter(u => u.status === 'online').length}/10)
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Volume2 size={14} />
                        볼륨: {volume}%
                        <input
                            type="range"
                            min="0" max="100"
                            value={volume}
                            onChange={e => setVolume(Number(e.target.value))}
                            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {onlineUsers.map(user => (
                        <div
                            key={user.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border min-w-[160px] transition-all
                                ${user.isSpeaking
                                    ? "bg-indigo-900/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                    : "bg-slate-900 border-slate-800 opacity-80"
                                }
                                ${user.status === 'offline' ? "opacity-30 grayscale" : ""}
                            `}
                        >
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                    ${user.status === 'online' ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-500"}`}>
                                    {user.name.charAt(0)}
                                </div>
                                {/* Online Dot */}
                                {user.status === 'online' && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                                )}
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${user.isSpeaking ? "text-indigo-400" : "text-white"}`}>
                                    {user.name}
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                    {user.isSpeaking ? "말하는 중..." : user.status === 'online' ? "대기" : "오프라인"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
