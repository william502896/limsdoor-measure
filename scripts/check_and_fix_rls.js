
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

// Service Role Client (Bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const email = "ceo122278@gmail.com";
    console.log(`Checking DB status for ${email}...`);

    // 1. Get User
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.find(u => u.email === email);
    if (!user) return console.error("User not found via Admin API");

    // 2. Read Profile via Service Role (The Truth)
    const { data: profiles, error: pError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', user.id);

    if (pError) console.error("Admin Read Error:", pError);

    if (!profiles || profiles.length === 0) {
        console.error("CRITICAL: No profile row found in DB!");
        // Re-create it?
        const { error: insertError } = await supabaseAdmin.from('profiles').insert({
            user_id: user.id,
            email: email,
            is_superadmin: true,
            role: 'OWNER'
        });
        if (insertError) console.error("Insert Failed:", insertError);
        else console.log("Re-created profile.");
    } else {
        const p = profiles[0];
        console.log(`DB Row Content: is_superadmin = ${p.is_superadmin}`);

        if (p.is_superadmin !== true) {
            console.log("Fixing is_superadmin to true...");
            await supabaseAdmin.from('profiles').update({ is_superadmin: true }).eq('id', p.id);
            console.log("Fixed.");
        } else {
            console.log("Data is CORRECT in DB. The issue is likely RLS.");
        }
    }

    // 3. Force RLS Policy Update (Just in case)
    // We can't run raw SQL easily via JS client without postgres connection string or rpc
    // But we can infer RLS issue.

    console.log("Please run SQL to fix RLS if data was correct.");
}

main();
