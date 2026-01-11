
import React from "react";
import { headers, cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Flag, Key, FileText, Lock } from "lucide-react";
import { PLATFORM_NAME } from "@/app/lib/constants";
import { Container } from "@/app/components/layout/Container";

export const dynamic = "force-dynamic";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
    console.log(`[OpsLayout] Layout Rendered at ${new Date().toISOString()}`);
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: { get: (name) => cookieStore.get(name)?.value }
        }
    );

    // 2nd Layer Lock: Server Side Check
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("[OpsLayout] No User -> Redirecting");
        redirect("/login");
    }

    console.log("[OpsLayout] Check User:", user.email, user.id);

    let isSuperAdmin = false;
    let p1Error: any = null;
    let profile: any = null;
    let p2Error: any = null;
    let p2: any = null;

    // 1. Check New Profile
    const { data: d1, error: e1 } = await supabase.from("profiles").select("is_superadmin").eq("user_id", user.id).limit(1);
    console.log("[OpsLayout] Fetched Data:", d1, "Error:", e1);

    profile = d1?.[0];
    p1Error = e1;

    if (p1Error) console.log("[OpsLayout] Profile Check Error:", p1Error.message);
    if (profile?.is_superadmin) {
        console.log("[OpsLayout] SuperAdmin Confirmed via 'profiles'");
        isSuperAdmin = true;
    }

    // EMERGENCY OVERRIDE
    if (user.email === 'ceo122278@gmail.com') {
        console.log("[OpsLayout] Emergency Access Granted (Email Whitelist)");
        isSuperAdmin = true;
    }

    // 2. Check Legacy Profile (Fallback)
    if (!isSuperAdmin) {
        const { data: d2, error: e2 } = await supabase.from("프로필").select("is_superadmin").eq("id", user.id).single();
        p2 = d2;
        p2Error = e2;

        if (p2Error) console.log("[OpsLayout] Legacy Check Error:", p2Error.message);
        if (p2?.is_superadmin) {
            console.log("[OpsLayout] SuperAdmin Confirmed via '프로필'");
            isSuperAdmin = true;
        }
    }

    if (!isSuperAdmin) {
        console.log("[OpsLayout] Access Denied -> 404");
        // Ninja Mode: If not admin, return 404 to hide existence
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500 selection:text-white">
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="text-indigo-500" size={20} />
                        <span className="font-bold text-lg tracking-tight text-white">{PLATFORM_NAME} <span className="text-indigo-400">OPS</span></span>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        <OpsTab href="/ops/console" label="Console" icon={<LayoutDashboard size={16} />} />
                        <OpsTab href="/ops/companies" label="Companies" icon={<Users size={16} />} />
                        <OpsTab href="/ops/flags" label="Flags" icon={<Flag size={16} />} />
                        <OpsTab href="/ops/invites" label="Invites" icon={<Key size={16} />} />
                        <OpsTab href="/ops/logs" label="Logs" icon={<FileText size={16} />} />
                    </div>
                </div>
            </nav>
            <main>
                <Container className="py-4 md:py-8">
                    {children}
                </Container>
            </main>
        </div>
    );
}

function OpsTab({ href, label, icon }: { href: string, label: string, icon: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap"
        >
            {icon}
            {label}
        </Link>
    );
}
