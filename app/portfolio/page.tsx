"use client";

import React from "react";
import ManageLayout from "@/app/components/Manage/Layout/ManageLayout";
import GalleryView from "@/app/components/Manage/Gallery/GalleryView";

export default function PortfolioPage() {
    return (
        <ManageLayout title="시공 포트폴리오">
            <GalleryView />
        </ManageLayout>
    );
}
