import { headers } from "next/headers";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Dedicated layout for Onboarding (No Sidebar)
  if (pathname === "/admin/onboarding") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center">
        {children}
      </div>
    );
  }

  // Standard Admin Layout (with Sidebar & Guard)
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
