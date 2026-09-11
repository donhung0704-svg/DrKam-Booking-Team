"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// Vai trò cổng:
// - "admin"   = toàn quyền như hiện tại.
// - "shipper" = chỉ xem Danh sách Booking + sửa 3 trường giao hàng.
// - "intern"  = TTS: xem tất cả; thêm/sửa KOC & Booking CHỈ của PIC mình
//               (PIC = nhân sự có email = email đăng nhập); KHÔNG xóa.
export type PortalRole = "admin" | "shipper" | "intern";

export function getRoleFromUser(user: unknown): PortalRole {
  const u = user as
    | { app_metadata?: { role?: string }; user_metadata?: { role?: string } }
    | null
    | undefined;

  const raw = String(
    u?.app_metadata?.role || u?.user_metadata?.role || ""
  ).toLowerCase();

  if (raw === "shipper") return "shipper";
  if (raw === "intern") return "intern";
  return "admin";
}

export function useUserRole() {
  const [role, setRole] = useState<PortalRole | null>(null);
  const [email, setEmail] = useState<string>("");
  // Tên PIC gán với tài khoản intern (nhân sự có email trùng) -> hiển thị thay "admin"
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const r = getRoleFromUser(data.user);
      const mail = String(data.user?.email || "").toLowerCase();
      setRole(r);
      setEmail(mail);

      // intern: lấy tên nhân sự (PIC) theo email để hiển thị
      if (r === "intern" && mail) {
        const { data: emp } = await supabase
          .from("employees")
          .select("full_name")
          .ilike("email", mail)
          .limit(1)
          .maybeSingle();
        if (active && emp?.full_name) setDisplayName(String(emp.full_name));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    role,
    email,
    displayName,
    loaded: role !== null,
    isShipper: role === "shipper",
    isIntern: role === "intern",
  };
}
