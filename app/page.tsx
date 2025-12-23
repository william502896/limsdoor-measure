"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalStore } from "./lib/store-context";

export default function RootRedirector() {
  const { user, loaded, login } = useGlobalStore();
  const router = useRouter();

  useEffect(() => {
    if (!loaded) return;

    if (!user) {
      // No User -> For now, auto-login as Master (DEMO) 
      // In production, this would go to /login
      // login("u_master"); 
      return;
    }

    // Role based redirect
    const tenantId = user.currentTenantId || "t_head";
    const role = user.roles[tenantId];

    if (role === "OWNER" || role === "ADMIN" || role === "OFFICE") {
      router.replace("/admin");
    } else if (role === "MEASURER") {
      router.replace("/field/new");
    } else if (role === "INSTALLER") {
      router.replace("/install");
    } else if (role === "CONSUMER") {
      router.replace("/shop");
    } else {
      router.replace("/shop"); // Default fallback
    }

  }, [user, loaded, router]);

  if (!loaded) return <div className="h-screen flex items-center justify-center text-slate-400">Loading System...</div>;

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        {/* Demo Login Selector */}
        <h1 className="text-3xl font-bold mb-8">LIMSDOOR Platform</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
          <button onClick={() => login("u_master")} className="p-4 bg-indigo-600 rounded-xl hover:bg-indigo-500 font-bold">
            관리자 (Admin App)
          </button>
          <button onClick={() => login("u_field")} className="p-4 bg-blue-600 rounded-xl hover:bg-blue-500 font-bold">
            실측자 (Field App)
          </button>
          <button onClick={() => login("u_install")} className="p-4 bg-orange-600 rounded-xl hover:bg-orange-500 font-bold">
            시공자 (Install App)
          </button>
          <button onClick={() => login("u_consumer")} className="p-4 bg-pink-600 rounded-xl hover:bg-pink-500 font-bold">
            소비자 (Shop App)
          </button>
        </div>
      </div>
    );
  }

  return <div className="h-screen flex items-center justify-center text-slate-500">Redirecting to module...</div>;
}
