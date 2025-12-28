"use client";

import React, { useEffect, useState, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowser } from '@/app/lib/supabaseClient';
import {
    readUiSettings,
    writeUiSettings,
    applyCssVarsFromSettings,
    getDefaultSettings,
    UiSettings,
    MultiAppUiConfig,
    resolveUiSettings,
    getInitialMultiAppConfig,
    AppScope
} from '@/app/lib/uiSettings';

const ThemeContext = createContext<{ theme: UiSettings | null }>({ theme: null });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<MultiAppUiConfig | null>(null);
    const [resolvedTheme, setResolvedTheme] = useState<UiSettings | null>(null);
    const pathname = usePathname();

    // Determine Scope based on Path
    const getScope = (path: string): AppScope => {
        if (path?.startsWith("/shop")) return "SHOP";
        if (path?.startsWith("/field")) return "FIELD";
        return "GLOBAL";
    };

    const scope = getScope(pathname || "");

    useEffect(() => {
        const loadTheme = async () => {
            try {
                // 1. Local Cache
                let currentConfig = readUiSettings();

                // If null, use defaults
                if (!currentConfig) {
                    currentConfig = getInitialMultiAppConfig();
                }

                // Initial Apply (Optimistic)
                setConfig(currentConfig);

                // 2. DB Sync
                const supabase = createSupabaseBrowser();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
                    if (profile?.company_id) {
                        const { data: companyData } = await supabase
                            .from('회사들')
                            .select('design_config')
                            .eq('id', profile.company_id)
                            .single();

                        if (companyData?.design_config) {
                            const dbRaw = companyData.design_config;
                            // Migrate DB data if old format
                            let dbConfig: MultiAppUiConfig;
                            if (dbRaw.colors && !dbRaw.global) {
                                // Old format
                                dbConfig = { global: dbRaw as UiSettings };
                            } else {
                                dbConfig = dbRaw as MultiAppUiConfig;
                            }

                            // Update if different
                            if (JSON.stringify(dbConfig) !== JSON.stringify(currentConfig)) {
                                setConfig(dbConfig);
                                writeUiSettings(dbConfig);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Theme Bootstrap Error", e);
            }
        };

        loadTheme();
    }, []);

    // Apply Styles whenever Config or Scope changes
    useEffect(() => {
        if (!config) return;
        const resolved = resolveUiSettings(config, scope);
        setResolvedTheme(resolved);
        applyCssVarsFromSettings(resolved);
    }, [config, scope]);

    return (
        <ThemeContext.Provider value={{ theme: resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
