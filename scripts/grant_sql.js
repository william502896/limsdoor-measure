
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use Service Role Key

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const email = "ceo122278@gmail.com";
    console.log(`Granting Superadmin to ${email}...`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error("List Users Error:", userError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error("User not found!");
        return;
    }

    console.log(`Found User ID: ${user.id}`);

    // 2. Update 'profiles'
    const { error: p1Error } = await supabase
        .from('profiles')
        .upsert({
            user_id: user.id,
            email: email,
            is_superadmin: true,
            role: 'OWNER'
        }, { onConflict: 'user_id' });

    if (p1Error) console.error("Profiles Update Error:", p1Error);
    else console.log("Updated 'profiles' table -> SUCCESS");

    // 3. Update Legacy Table
    const { error: p2Error } = await supabase
        .from('프로필')
        .update({ is_superadmin: true })
        .eq('id', user.id);

    if (!p2Error) console.log("Updated '프로필' table -> SUCCESS");
}

main();
