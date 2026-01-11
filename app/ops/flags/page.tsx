"use client";

import React from 'react';

export default function FlagsPage() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-white mb-1">Feature Flags</h1>
                <p className="text-slate-400 text-sm">Advanced system switches and configurations.</p>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
                🚧 Flags Management UI is currently simplified.
                <br />
                Use <strong>Console Dashboard</strong> for Global Stop.
                <br />
                Use <strong>Companies Page</strong> for Company Suspend.
                <br /><br />
                (Advanced flag editor coming in v2)
            </div>
        </div>
    );
}
