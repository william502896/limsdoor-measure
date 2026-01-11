"use client";

import { useState, useEffect } from "react";
import { BusinessModuleType } from "../modules/types";

const KEY = "limsdoor_business_module";

export function useBusinessModule() {
    const [moduleType, setModuleType] = useState<BusinessModuleType>("DOOR");

    useEffect(() => {
        const saved = localStorage.getItem(KEY) as BusinessModuleType;
        if (saved) setModuleType(saved);
    }, []);

    const switchModule = (type: BusinessModuleType) => {
        setModuleType(type);
        localStorage.setItem(KEY, type);
        // 필요하다면 리로드: window.location.reload();
    };

    return {
        moduleType,
        switchModule
    };
}
