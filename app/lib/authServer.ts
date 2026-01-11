
import { createSupabaseServer } from "./supabaseServer";
import { redirect, notFound } from "next/navigation";
import { NextResponse } from "next/server";

export async function getUserProfile() {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Check New System First
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (profile) return { user, profile };

    // Check Legacy System (Fallback)
    const { data: legacy } = await supabase
        .from("프로필")
        .select("*")
        .eq("id", user.id)
        .single();

    return { user, profile: legacy }; // legacy object has similar structure?
}

export async function requireAuth() {
    const res = await getUserProfile();
    if (!res?.user) {
        redirect("/login");
    }
    return res;
}

export async function requireSuperAdmin() {
    const { user, profile } = await getUserProfile() || {};

    if (user?.email === 'ceo122278@gmail.com') {
        return { authorized: true, response: null, user, profile: { ...profile, is_superadmin: true } };
    }

    if (!user || !profile?.is_superadmin) {
        // Return unauthorized response or redirect
        // For API routes, usually filtering happen before this, but if called:
        return { authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }), user: null };
    }

    return { authorized: true, response: null, user, profile };
}
