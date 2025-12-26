"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/app/lib/supabase';
import { PriceRule, Item } from '@/app/lib/admin/types';

interface PriceItem extends PriceRule {
    item_name: string;
    item_unit: string;
    item_category: string;
}

interface PriceState {
    version: string | null;
    prices: PriceItem[];
    lastSynced: string | null;
    isSyncing: boolean;
    syncPrices: () => Promise<void>;
    getPrice: (itemId: string) => number; // Returns sales_price
}

export const usePriceSystem = create<PriceState>()(
    persist(
        (set, get) => ({
            version: null,
            prices: [],
            lastSynced: null,
            isSyncing: false,

            syncPrices: async () => {
                set({ isSyncing: true });
                try {
                    // 1. Check Latest Release
                    const { data: releaseData, error: releaseError } = await supabase
                        .from('price_releases')
                        .select('version_name, created_at')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (releaseError || !releaseData) {
                        console.log("No price releases found.");
                        set({ isSyncing: false });
                        return;
                    }

                    const serverVersion = releaseData.version_name;
                    const localVersion = get().version;

                    // If same version, skip (Optimization)
                    // But maybe user wants to force sync? Let's just sync if different OR if no prices.
                    if (serverVersion === localVersion && get().prices.length > 0) {
                        set({ isSyncing: false });
                        return;
                    }

                    // 2. Fetch Confirmed Prices (Active)
                    // We fetch ALL confirmed rules. 
                    // Ideally we should filter by the "latest" confirmed rule for each item per partner.
                    // For simplicity, we assume the Admin backend handles "Archiving" old rules 
                    // so that only one 'confirmed' rule exists per item/partner.
                    const { data: rulesData, error: rulesError } = await supabase
                        .from('price_rules')
                        .select('*, item:items(name, unit, category)')
                        .eq('status', 'confirmed');

                    if (rulesError) throw rulesError;

                    // Flatten structure
                    const formattedPrices: PriceItem[] = (rulesData || []).map((r: any) => ({
                        ...r,
                        item_name: r.item?.name || 'Unknown',
                        item_unit: r.item?.unit || '-',
                        item_category: r.item?.category || 'etc'
                    }));

                    set({
                        version: serverVersion,
                        prices: formattedPrices,
                        lastSynced: new Date().toISOString()
                    });

                } catch (e) {
                    console.error("Price Sync Failed:", e);
                } finally {
                    set({ isSyncing: false });
                }
            },

            getPrice: (itemId: string) => {
                // Logic to find price.
                // Note: prices might vary by Partner. 
                // Context: The App user (Measurer) might need a specific Partner's price 
                // OR a "Standard Selling Price".
                // Assuming 'sales_price' is the standard selling price for now.
                // If multiple prices exist for same item (different partners), we might need logic.
                // For now, take the first matching one or Max?
                // Let's assume the system uses a specific "Default Sales Partner" for general quotes,
                // or we pick the MAX sales_price to be safe.
                const rules = get().prices.filter(p => p.item_id === itemId);
                if (rules.length === 0) return 0;

                // Return Max Sales Price among all active rules for this item
                return Math.max(...rules.map(r => Number(r.sales_price) || 0));
            }
        }),
        {
            name: 'price-system-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
