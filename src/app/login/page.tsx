"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function mapLoginError(message: string) {
  const msg = message.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }

  if (msg.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Vào Supabase Auth để confirm email.";
  }

  if (msg.includes("network")) {
    return "Không kết nối được tới hệ thống. Vui lòng kiểm tra mạng.";
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim() !== "" && password.trim() !== "" && !loading;
  }, [email, password, loading]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(`Đăng nhập lỗi: ${mapLoginError(error.message)}`);
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,241,201,0.08),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(57,100,255,0.14),transparent_28%),linear-gradient(180deg,#070b14_0%,#0b1220_100%)] px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Khối giới thiệu */}
        <div className="hidden lg:block">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#14f1c9]/20 bg-[#14f1c9]/10 px-4 py-2 text-sm font-semibold text-[#14f1c9]">
            DRKAM CRM PORTAL
          </div>

          <h1 className="max-w-xl text-5xl font-black leading-tight text-white">
            Đăng nhập vào hệ thống quản lý KOC, Booking và Campaign
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Giao diện quản trị nội bộ dành cho DrKam Team. Theo dõi KOC, quản lý
            booking, chiến dịch và báo cáo hiệu suất trên cùng một hệ thống.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              "Quản lý KOC đầy đủ",
              "Theo dõi Booking theo PIC",
              "Quản lý Campaign",
              "Xuất Excel & báo cáo nhanh",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14f1c9_0%,#3964ff_100%)] font-black text-[#06111f]">
                  ✓
                </div>
                <div className="font-semibold text-white">{item}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form login */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-8">
            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#14f1c9]/20 bg-[#14f1c9]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-[#14f1c9]">
                DRKAM CRM
              </div>

              <h2 className="text-4xl font-black text-white">Đăng nhập</h2>
              <p className="mt-2 text-sm text-slate-400">
                Nhập tài khoản Supabase Auth để vào hệ thống.
              </p>
            </div>

            {message ? (
              <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {message}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email đăng nhập"
                  className="w-full rounded-2xl border border-white/10 bg-[#0d1524] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-2xl border border-white/10 bg-[#0d1524] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/20"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#3964ff_0%,#14b8ff_100%)] px-4 py-3.5 text-base font-bold text-white shadow-[0_12px_30px_rgba(57,100,255,0.35)] transition hover:scale-[1.01] hover:shadow-[0_16px_34px_rgba(57,100,255,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-200">
              Nếu báo lỗi <b>Email not confirmed</b>, vào Supabase Auth xác nhận
              user hoặc tạo user với <b>Auto Confirm User</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}