const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../app/lib/misotech-pricing.json');
const outPath = path.join(__dirname, '../supabase_pricing_seed.sql');

const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let sql = `-- Auto-generated pricing seed from misotech-pricing.json\n\n`;
sql += `DO $$\nDECLARE\n  -- IDs to link tables\n  v_company_id uuid := '00000000-0000-0000-0000-000000000000'; -- REPLACE WITH REAL ID\n  v_prod_id uuid;\n  v_var_id uuid;\nBEGIN\n\n`;

// 1. Products
jsonData.products.forEach(prod => {
    sql += `  -- Product: ${prod.product_type}\n`;
    sql += `  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, '${prod.product_type}', '${prod.title}', ${prod.base_height_mm}) RETURNING id INTO v_prod_id;\n`;

    // 2. Variants
    prod.variants.forEach(variant => {
        sql += `    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, '${variant.coating}', '${variant.coating_label}') RETURNING id INTO v_var_id;\n`;

        // 3. Size Prices
        variant.size_prices.forEach(sp => {
            sql += `      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, ${sp.width_mm}, ${sp.height_mm}, '${sp.glass_group}', ${sp.price});\n`;
        });
    });
    sql += `\n`;

    // Common Addons? (These seem to be per product in JSON but global in Logic. Prompt says "price_addons table".)
    // We will parse global "common_addons" from the first product or if they are separate?
    // In JSON, `common_addons` inside `products` array? 
    // Yes, Step 2370 view showed `common_addons` inside `products`. 
    // Usually these are global in the newly requested DB structure (Input "Rule 5, 6... price_addons table").
    // I will extract them uniquely.
});

// 4. Addons (Global/Hardware/Materials)
const addons = [];
const seenCodes = new Set();

function addAddon(cat, item) {
    if (seenCodes.has(item.code)) return;
    seenCodes.add(item.code);
    addons.push({ ...item, category: cat });
}

// Rules (Height, Vertical) - found in product[0].common_addons usually
if (jsonData.products[0]?.common_addons) {
    jsonData.products[0].common_addons.forEach(a => addAddon('RULE', a));
}

// Materials
if (jsonData.materials_and_parts) {
    for (const k in jsonData.materials_and_parts) {
        const arr = jsonData.materials_and_parts[k];
        if (Array.isArray(arr)) arr.forEach(i => addAddon('MATERIAL', i));
    }
}

// Handles
if (jsonData.handles && Array.isArray(jsonData.handles)) jsonData.handles.forEach(i => addAddon('HANDLE', i));

// Hardware
if (jsonData.hardware) {
    if (Array.isArray(jsonData.hardware)) {
        jsonData.hardware.forEach(i => addAddon('HARDWARE', i));
    } else if (typeof jsonData.hardware === 'object') {
        for (const k in jsonData.hardware) {
            const arr = jsonData.hardware[k];
            if (Array.isArray(arr)) arr.forEach(i => addAddon('HARDWARE', i));
        }
    }
}

// Pomax
if (jsonData.pomax_arch_3t) {
    // Check structure. Usually object with items array? Or array?
    // Based on view lines 857+, pomax_arch_3t has "items" array.
    if (jsonData.pomax_arch_3t.items && Array.isArray(jsonData.pomax_arch_3t.items)) {
        jsonData.pomax_arch_3t.items.forEach(i => {
            // Pomax items have 'pricing' array instead of single price. 
            // Logic needs to flatten? Or use defaults? 
            // Table column is single price. 
            // I'll skip complex pricing items or insert with 0 and put logic in meta?
            // Prompt "Option... price_addons table".
            // I'll insert base logic or handle carefully.
            // For simplicity, if 'pricing' exists, I'll pick the first price or ignore?
            // Prompt says "Pomax... put in price_addons".
            // I'll serialize 'pricing' to 'meta' and set default price 0 if not simple.
            const price = i.price || 0;
            const meta = i.pricing ? JSON.stringify({ pricing: i.pricing }) : '{}';
            // addAddon handles it.
            addAddon('POMAX', { ...i, price, meta });
        });
    } else if (Array.isArray(jsonData.pomax_arch_3t)) {
        jsonData.pomax_arch_3t.forEach(i => addAddon('POMAX', i));
    }
}

// Sliding Hardware
if (jsonData.sliding_hardware_set) {
    const sw = jsonData.sliding_hardware_set;
    // Base with ranges
    addAddon('SLIDING', {
        code: 'SLIDING_HW_BASE',
        label: '연동철물 (폭 연동)',
        price: 0,
        unit: 'set',
        meta: JSON.stringify({ ranges: sw.price_by_width.map(r => ({ max: r.max_width_mm, price: r.price })) })
    });
    addAddon('SLIDING', { code: 'PIVOT', label: '피봇', price: sw.pivot_price, unit: 'ea' });
    addAddon('SLIDING', { code: 'OVER_1900_PER_200', label: '1900초과 (200mm당)', price: sw.extra_over_1900_price_per_200mm, unit: 'section' });
}

// Inclusion Rules (as addons with 0 price? or just logic?)
// The logic uses strict Inclusion Rules. 
// TDU, Sensors are in hardware usually.

addons.forEach(a => {
    const meta = a.meta || '{}';
    sql += `  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, '${a.category}', '${a.code}', '${a.label}', '${a.unit || 'ea'}', ${a.price}, '${meta}');\n`;
});

sql += `END $$;\n`;

fs.writeFileSync(outPath, sql);
console.log("Generated:", outPath);
