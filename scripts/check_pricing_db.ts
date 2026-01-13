
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log("Checking pricing data count...");
    const { count, error } = await supabase.from("price_size_prices").select("*", { count: "exact", head: true });

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Total Size Prices:", count);
    }

    const { data: variants } = await supabase.from("price_products").select("product_type, price_variants(coating, price_size_prices(width_mm))");
    if (variants) {
        variants.forEach((p: any) => {
            console.log(`Product: ${p.product_type}`);
            p.price_variants.forEach((v: any) => {
                console.log(`  Variant: ${v.coating} - Count: ${v.price_size_prices.length} - MaxWidth: ${Math.max(...v.price_size_prices.map((s: any) => s.width_mm))}`);
            });
        });
    }
}

check();
