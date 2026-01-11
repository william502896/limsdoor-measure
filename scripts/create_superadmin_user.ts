
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Error: .env.local 파일에서 NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY를 찾을 수 없습니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// ==========================================
// 👇 여기에 생성할 관리자 정보를 입력하세요 👇
// ==========================================
const ADMIN_EMAIL = "ceo122278@gmail.com";
const ADMIN_PASSWORD = "dlagudxo502896@";
// ==========================================

async function createSuperAdmin() {
    console.log(`🚀 Creating Superadmin: ${ADMIN_EMAIL}`);

    // 1. Create User (or Get ID if exists)
    // supabase.auth.admin.createUser automatically handles hashing
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true // Auto confirm email
    });

    let userId = user?.id;

    if (createError) {
        if (createError.message.includes("already registered")) {
            console.log("⚠️ User already exists. Fetching ID...");
            // For security, admin.createUser doesn't return ID if exists, strictly. 
            // But we can try to get it via listUsers by email logic or just tell user to login.
            // Ops, Supabase Admin API 'listUsers' is better.
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existing = users.find(u => u.email === ADMIN_EMAIL);
            if (existing) {
                userId = existing.id;
                console.log(`✅ Found existing user ID: ${userId}`);
            } else {
                console.error("❌ Could not find existing user.");
                return;
            }
        } else {
            console.error("❌ Failed to create user:", createError.message);
            return;
        }
    } else {
        console.log(`✅ User created successfully! ID: ${userId}`);
    }

    if (!userId) return;

    // 2. Grant Superadmin in 'profiles'
    // Wait a bit used to be needed for triggers, but direct update is safer if row exists.
    // We will use upsert to ensure row exists.
    console.log("⚡ Granting Superadmin privileges...");

    // Check if profile exists
    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();

    if (!profile) {
        // If trigger failed or didn't run, insert manually
        const { error: insertError } = await supabase.from('profiles').insert({
            user_id: userId,
            email: ADMIN_EMAIL, // In case schema has email
            is_superadmin: true,
            name: 'Super Admin'
        });
        if (insertError) console.error("❌ Profile creation failed:", insertError.message);
        else console.log("✅ Profile created with Superadmin rights.");
    } else {
        // Update existing
        const { error: updateError } = await supabase.from('profiles').update({ is_superadmin: true }).eq('user_id', userId);
        if (updateError) console.error("❌ Failed to update profile:", updateError.message);
        else console.log("✅ Profile updated to Superadmin.");
    }

    console.log("\n🎉 완료되었습니다! 이제 아래 정보로 로그인하여 /_ops/console 에 접속하세요.");
    console.log(`UNKNOWN: ${ADMIN_EMAIL}`);
    console.log(`PASS: ${ADMIN_PASSWORD}`);
}

createSuperAdmin();
