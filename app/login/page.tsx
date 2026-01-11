"use client";

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const supabase = createSupabaseBrowser();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        addLog(`Page Loaded at ${new Date().toLocaleTimeString()}`);
    }, []);

    const addLog = (msg: string) => {
        const entry = `${new Date().toLocaleTimeString()} ${msg}`;
        console.log("[LoginDebug]", msg);
        setLogs(prev => [...prev, entry]);
    };

    const handleAuth = async (e: any) => {
        if (e && e.preventDefault) e.preventDefault();

        try {
            setLoading(true);
            addLog(isSignUp ? "Signing Up..." : "Signing In...");

            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) {
                    addLog("Error: " + error.message);
                    alert("Signup Failed: " + error.message);
                    setLoading(false);
                } else {
                    addLog("Check email for confirmation link.");
                    setLoading(false);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) {
                    addLog("Error: " + error.message);
                    alert("Login Failed: " + error.message);
                    setLoading(false);
                } else {
                    addLog("Auth Success. Verifying Session...");

                    const { data: { user } } = await supabase.auth.getUser();

                    if (user) {
                        addLog(`User Verified: ${user.email}`);
                        addLog("Setting Cookies & Redirecting...");

                        const target = (email.trim() === "ceo122278@gmail.com") ? "/ops/console" : "/admin";
                        addLog(`Target: ${target}`);

                        setTimeout(() => {
                            addLog(`GO -> ${target}`);
                            window.location.href = target;
                        }, 1000);
                    } else {
                        addLog("CRITICAL: Session Missing after Success.");
                        alert("Session Error: User verified failed.");
                        setLoading(false);
                    }
                }
            }
        } catch (err: any) {
            console.error("Auth Exception", err);
            addLog("EXCEPTION: " + (err?.message || JSON.stringify(err)));
            alert("System Error: " + (err?.message || "Unknown error"));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative z-50">
            {/* Test Button for Interactivity */}
            <button
                type="button"
                onClick={() => addLog("Global Click Test")}
                className="absolute top-4 left-4 p-2 bg-red-500 text-white z-[100] text-xs"
                suppressHydrationWarning
            >
                UI INTERACTION TEST
            </button>

            <div className="bg-white p-8 rounded shadow-md w-full max-w-md relative z-50">
                <h1 className="text-2xl font-bold mb-6 text-center text-slate-800" suppressHydrationWarning>{isSignUp ? "회원가입" : "로그인"}</h1>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input
                        type="email"
                        placeholder="이메일"
                        className="w-full border p-3 rounded text-slate-900 bg-white"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        suppressHydrationWarning
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        className="w-full border p-3 rounded text-slate-900 bg-white"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        suppressHydrationWarning
                    />
                    <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => {
                            addLog("Manual Click Triggered");
                            handleAuth(e);
                        }}
                        className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:opacity-50 font-bold relative z-50"
                        suppressHydrationWarning
                    >
                        {loading ? "Process..." : (isSignUp ? "가입하기" : "로그인")}
                    </button>
                    <div className="text-center text-xs text-gray-400" suppressHydrationWarning>Press button to see logs below</div>
                </form>

                {/* Debug Console */}
                <div className="mt-6 p-3 bg-slate-950 text-emerald-400 text-xs font-mono rounded-lg max-h-48 overflow-y-auto shadow-inner border border-slate-800">
                    <div className="opacity-50 border-b border-slate-800 mb-2 pb-1 text-[10px] uppercase" suppressHydrationWarning>Debug Log</div>
                    {logs.length === 0 ? <span className="opacity-30" suppressHydrationWarning>Waiting for action...</span> : logs.map((l, i) => (
                        <div key={i} className="mb-1 last:mb-0 break-all leading-tight" suppressHydrationWarning>{l}</div>
                    ))}
                </div>

                <div className="mt-4 text-center text-sm">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-500 underline">
                        {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
                    </button>
                    <div className="mt-2 text-xs text-slate-400">
                        {email === "ceo122278@gmail.com" ? "Detected: Super Admin" : ""}
                    </div>
                </div>
            </div>
        </div>
    );
}
