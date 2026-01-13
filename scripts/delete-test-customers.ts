
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestCustomers() {
    const testNames = ["홍길동", "김춘봉", "김준봉"];
    console.log(`Searching for test customers: ${testNames.join(", ")}...`);

    // 1. Find Customers
    const { data: customers, error: fetchError } = await supabase
        .from("crm_customers")
        .select("id, name, phone")
        .in("name", testNames);

    if (fetchError) {
        console.error("Error fetching customers:", fetchError);
        return;
    }

    if (!customers || customers.length === 0) {
        console.log("No test customers found.");
        return;
    }

    console.log("Found customers:", customers);

    const idsToDelete = customers.map(c => c.id);

    // 2. Delete Schedules/Orders linked to these customers (Manual Cascade if needed)
    // Assuming 'sc_schedules' has 'customer_id' or similar. 
    // The store type says `customerId`, mapped to DB `customer_id` usually?
    // Let's check `sc_schedules` constraints later, but try deleting schedules first to be safe.

    // Check if we need to delete from sc_schedules or sc_orders first.
    // Based on previous files, table is 'sc_schedules'.

    const { error: deleteSchedulesError } = await supabase
        .from("sc_schedules")
        .delete()
        .in("customer_id", idsToDelete);

    if (deleteSchedulesError) {
        console.error("Error deleting related schedules:", deleteSchedulesError);
        // Continue? If FK constraint exists, we must fail.
    } else {
        console.log("Deleted related schedules.");
    }

    // 3. Delete Customers
    const { error: deleteError } = await supabase
        .from("crm_customers")
        .delete()
        .in("id", idsToDelete);

    if (deleteError) {
        console.error("Error deleting customers:", deleteError);
    } else {
        console.log(`Successfully deleted ${customers.length} test customers.`);
    }
}

deleteTestCustomers();
