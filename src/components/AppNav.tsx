"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { useUserRole } from "@/lib/useUserRole";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { label: "Tổng quan", href: "/", icon: "▣" },
  { label: "Danh sách KOC", href: "/koc", icon: "👥" },
  { label: "Danh sách Booking", href: "/bookings", icon: "📦" },
  { label: "Danh sách Campaign", href: "/campaigns", icon: "🚀" },
  { label: "Nhân sự", href: "/employees", icon: "👤" },
  { label: "Báo cáo ngày", href: "/reports/daily", icon: "📊" },
  { label: "Báo cáo tháng", href: "/reports/monthly", icon: "📆" },
];

export default function AppNav() {
  const pathname = usePathname();
  const { isShipper } = useUserRole();

  // Shipper chỉ thấy mục Danh sách Booking
  const items = isShipper
    ? navItems.filter((item) => item.href === "/bookings")
    : navItems;

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] border-r border-slate-200 bg-white lg:block">
        <div className="flex h-[92px] items-center gap-3 border-b border-slate-200 px-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            🧰
          </div>

          <div>
            <div className="flex items-end gap-1">
              <span className="text-[24px] font-black leading-none tracking-[-0.04em] text-slate-950">
                DRKAM
              </span>
              <span className="pb-[2px] text-sm font-black text-red-600">
                pharma
              </span>
            </div>

            <p className="mt-1 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
              Portal V2.5
            </p>
          </div>
        </div>

        <div className="portal-sidebar-scroll h-[calc(100vh-92px)] overflow-y-auto px-4 py-4">
          <nav className="space-y-1">
            {items.map((item) => (
              <MainNavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 h-[92px] border-b border-slate-200 bg-white/95 backdrop-blur lg:left-[280px]">
        <div className="flex h-full items-center justify-between gap-5 px-5 md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-xl">
              🧰
            </div>

            <div>
              <p className="text-lg font-black text-slate-950">DRKAM</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Portal V2.5
              </p>
            </div>
          </div>

          <div className="hidden min-w-[320px] max-w-[520px] flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex">
            <span className="mr-3 text-xl text-slate-400">⌕</span>
            <input
              placeholder="Tìm kiếm nhanh..."
              className="h-6 w-full border-0 bg-transparent text-sm font-semibold text-slate-600 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="ml-auto flex items-center gap-5">
            <div className="relative hidden md:block">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl text-slate-500"
              >
                🔔
              </button>

              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-black text-white">
                3
              </span>
            </div>

            <div className="hidden h-10 w-px bg-slate-200 md:block" />

            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-sm font-black text-slate-950">
                  {isShipper ? "shipper" : "admin"}
                </p>
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-red-600">
                  {isShipper ? "Giao hàng" : "Admin"}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white ring-4 ring-slate-100">
                {isShipper ? "GH" : "AD"}
              </div>
            </div>

            <LogoutButton />
          </div>
        </div>
      </header>
    </>
  );
}

function MainNavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black transition ${
        active
          ? "bg-red-50 text-red-600"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${
          active ? "bg-white text-red-600" : "bg-slate-50 text-slate-400"
        }`}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  return pathname === href || pathname.startsWith(`${href}/`);
}
