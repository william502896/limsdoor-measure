
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDuplicates() {
    const email = "ceo122278@gmail.com";
    console.log(`Fixing for ${email}...`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) return console.error("List Users Error:", userError);

    const user = users.find(u => u.email === email);
    if (!user) return console.error("User not found!");

    console.log(`Found User ID: ${user.id}`);

    // 2. Fetch all profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (pError) return console.error("Profiles Fetch Error:", pError);

    console.log(`Found ${profiles.length} profiles.`);

    if (profiles.length > 1) {
        console.log("Values:", profiles.map(p => p.id));
        // Keep the first one (most recent), delete others
        const toKeep = profiles[0];
        const toDelete = profiles.slice(1);

        console.log(`Keeping ID: ${toKeep.id}`);

        for (const p of toDelete) {
            console.log(`Deleting Duplicate ID: ${p.id}`);
            await supabase.from('profiles').delete().eq('id', p.id);
        }
    } else if (profiles.length === 0) {
        // Create if missing
        console.log("No profile found, creating one...");
        await supabase.from('profiles').insert({
            user_id: user.id,
            email: email,
            is_superadmin: true,
            role: 'OWNER'
        });
        console.log("Created.");
        return;
    }

    // 3. Update the (now unique) profile
    console.log("Updating User Rights...");
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_superadmin: true, role: 'OWNER' })
        .eq('user_id', user.id);

    if (updateError) console.error("Update Failed:", updateError);
    else console.log("SUCCESS: User is now Superadmin and Unique.");
}

fixDuplicates();
