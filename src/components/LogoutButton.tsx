"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-red-900 bg-red-950/40 px-5 py-3 text-sm font-bold text-red-200 hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Đang thoát..." : "Đăng xuất"}
    </button>
  );
}