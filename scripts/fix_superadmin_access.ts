
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const TARGET_EMAIL = "ceo122278@gmail.com";

async function fixAccess() {
    console.log(`🔧 Fixing access for ${TARGET_EMAIL}...`);

    // 1. Get User ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === TARGET_EMAIL);

    if (!user) {
        console.error("❌ User not found in Auth. Please sign up first.");
        return;
    }
    const userId = user.id;
    console.log(`✅ Found User ID: ${userId}`);

    // 2. Fix 'profiles' (New Table)
    const { error: e1 } = await supabase.from('profiles').upsert({
        user_id: userId,
        email: TARGET_EMAIL,
        is_superadmin: true,
        name: 'Super CEO'
    }, { onConflict: 'user_id' });

    if (e1) console.error("⚠️ Profiles Error:", e1.message);
    else console.log("✅ 'profiles' table updated.");

    // 3. Fix '프로필' (Legacy Table) - Vital for AdminLayoutClient check
    // Check if table exists first by trying generic select, if fails ignore
    const { error: e2 } = await supabase.from('프로필').upsert({
        id: userId, // Legacy often uses 'id' as PK matching auth.uid
        email: TARGET_EMAIL,
        is_superadmin: true,
        company_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID or real one if possible, just to bypass onboarding
    }, { onConflict: 'id' });

    if (e2) {
        // Maybe company_id FK failed? Try getting a real company.
        const { data: comp } = await supabase.from('companies').select('id').limit(1).single();
        if (comp) {
            await supabase.from('프로필').update({ company_id: comp.id }).eq('id', userId);
            console.log("✅ '프로필' company_id linked to:", comp.id);
        } else {
            console.error("⚠️ '프로필' Error (could not link company):", e2.message);
        }
    } else {
        console.log("✅ '프로필' table updated.");
    }

    console.log("🎉 Fix Complete. Try logging in again.");
}

fixAccess();
