"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// Vai trò cổng: "admin" = toàn quyền như hiện tại; "shipper" = chỉ xem Danh
// sách Booking và sửa 3 trường giao hàng (Ngày gửi, Mã vận đơn, Tình trạng đơn).
export type PortalRole = "admin" | "shipper";

export function getRoleFromUser(user: unknown): PortalRole {
  const u = user as
    | { app_metadata?: { role?: string }; user_metadata?: { role?: string } }
    | null
    | undefined;

  const raw = u?.app_metadata?.role || u?.user_metadata?.role || "";

  return String(raw).toLowerCase() === "shipper" ? "shipper" : "admin";
}

export function useUserRole() {
  const [role, setRole] = useState<PortalRole | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setRole(getRoleFromUser(data.user));
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    role,
    loaded: role !== null,
    isShipper: role === "shipper",
  };
}
