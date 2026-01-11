"use client";

import React, { useMemo } from "react";
import { AppShell } from "@/app/components/layout/AppShell";
import { Ruler, Camera, Home, Image as ImageIcon } from "lucide-react";
import { useGlobalStore } from "@/app/lib/store-context";

export default function FieldLayoutClient({ children }: { children: React.ReactNode }) {
    const { settings } = useGlobalStore();
    const [googlePhotosUrl, setGooglePhotosUrl] = React.useState<string>("");

    React.useEffect(() => {
        // Fetch latest settings slightly delayed or directly
        fetch("/api/company/settings")
            .then(res => res.json())
            .then(json => {
                if (json.data?.google_photos_url) {
                    setGooglePhotosUrl(json.data.google_photos_url);
                }
            })
            .catch(e => console.error(e));
    }, []);

    const navItems = useMemo(() => [
        { label: "실측 입력", href: "/field/new", icon: Ruler },
        // { label: "현장 목록", href: "/field/list", icon: Home }, // Future
        { label: "AR 도어", href: "/field/ar", icon: Camera },
        ...(googlePhotosUrl ? [{
            label: "구글 사진첩",
            href: googlePhotosUrl,
            icon: ImageIcon,
            external: true
        }] : []),
    ], [googlePhotosUrl]);

    return (
        <AppShell
            brandName="FieldX Field"
            navItems={navItems}
        >
            {children}
        </AppShell>
    );
}
