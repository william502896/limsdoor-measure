"use client";

import React, { Suspense } from 'react';
import RadioClient from '@/app/components/RadioClient';

export default function RadioPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-slate-900 text-white flex items-center justify-center">Loading Radio...</div>}>
            <RadioClient />
        </Suspense>
    );
}
