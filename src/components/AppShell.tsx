"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";

// Nhớ trạng thái ẩn/hiện menu trái cho tới khi người dùng mở lại
const navCollapsedKey = "drkam_nav_collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    try {
      setNavCollapsed(window.localStorage.getItem(navCollapsedKey) === "1");
    } catch {
      // bỏ qua nếu không đọc được localStorage
    }
  }, []);

  function toggleNav() {
    setNavCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(navCollapsedKey, next ? "1" : "0");
      } catch {
        // bỏ qua nếu không ghi được localStorage
      }
      return next;
    });
  }

  if (pathname === "/login") {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="portal-shell min-h-screen bg-[#f4f7fb] text-slate-900">
      <AppNav collapsed={navCollapsed} onToggle={toggleNav} />

      <main
        className={`portal-content min-h-screen pt-[92px] ${
          navCollapsed ? "" : "lg:pl-[280px]"
        }`}
      >
        <div className="px-5 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
