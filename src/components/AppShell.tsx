"use client";

import { usePathname } from "next/navigation";
import AppNav from "@/components/AppNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="portal-shell min-h-screen bg-[#f4f7fb] text-slate-900">
      <AppNav />

      <main className="portal-content min-h-screen pt-[92px] lg:pl-[280px]">
        <div className="px-5 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}