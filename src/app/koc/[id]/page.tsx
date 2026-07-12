"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type DbRow = Record<string, any>;

export default function KocProfilePage() {
  const params = useParams();
  const kocId = String(params?.id || "");

  const [koc, setKoc] = useState<DbRow | null>(null);
  const [bookings, setBookings] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!kocId) return;

    async function load() {
      setLoading(true);
      setMessage("");

      const [kocResult, bookingResult, employeeResult] = await Promise.all([
        supabase.from("koc").select("*").eq("id", kocId).single(),
        supabase
          .from("bookings")
          .select("*")
          .eq("koc_id", kocId)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("employees")
          .select("id, employee_code, full_name, email, phone, role")
          .limit(2000),
      ]);

      if (kocResult.error) {
        setMessage(`Lỗi tải KOC: ${kocResult.error.message}`);
        setKoc(null);
      } else {
        setKoc(kocResult.data);
      }

      if (!bookingResult.error) setBookings(bookingResult.data || []);
      if (!employeeResult.error) setEmployees(employeeResult.data || []);

      setLoading(false);
    }

    load();
  }, [kocId]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, DbRow>();
    employees.forEach((employee) => {
      if (employee.id) map.set(String(employee.id), employee);
    });
    return map;
  }, [employees]);

  const kocName = koc ? getKocDisplayName(koc) : "";
  const kocEmployee = koc?.employee_id
    ? employeeMap.get(String(koc.employee_id))
    : null;

  const totalCast = bookings.reduce(
    (sum, booking) => sum + parseNumber(booking.cast_price),
    0
  );

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-4 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg">
              👤
            </div>

            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase leading-[1.3] tracking-[0.2em] text-red-600">
                Hồ sơ KOC
              </p>
              <h1 className="text-[20px] font-bold leading-tight text-slate-950 md:text-[22px]">
                {loading ? "Đang tải..." : kocName || "Không tìm thấy KOC"}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/koc/${kocId}/edit`}
              className="flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Sửa KOC
            </Link>

            <Link
              href="/koc"
              className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ← Danh sách KOC
            </Link>
          </div>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {message}
        </div>
      )}

      {koc && (
        <section className="mb-4 rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <h2 className="mb-3 text-[14px] font-bold text-slate-800">
            Thông tin KOC
          </h2>

          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            <Info label="ID TikTok/Tên FB" value={koc.Id_tiktok_Ten_fb} />
            <Info label="Tên KOC" value={koc.name} />
            <Info label="Mã KOC" value={koc.koc_code} />
            <Info label="PIC phụ trách" value={getEmployeeDisplayName(kocEmployee)} />
            <Info label="Tier" value={koc.tier} />
            <Info label="Status" value={koc.status} />
            <Info label="Channel type" value={koc.channel_type} />
            <Info label="Follower" value={formatNumber(koc.follower)} />
            <Info label="SĐT/Zalo" value={koc.phone} />
            <Info label="Địa chỉ" value={koc.address} />
            <Info label="GMV ngày" value={formatMoney(koc.gmv)} />
            <Info label="GMV tháng" value={formatMoney(koc.gmv_thang)} />
            <Info label="Daily Videos(T-1)" value={formatNumber(koc.number_of_videos)} />
            <Info label="Monthly Videos" value={formatNumber(koc.monthly_videos)} />
            <Info label="CS gần nhất" value={formatDate(koc.new_contact_date)} />
            <Info label="Ngày tạo" value={formatDate(koc.created_at)} />
            <Info label="Ghi chú" value={koc.note} />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
              Đơn hàng (Booking) của KOC
            </p>
            <h2 className="mt-0.5 text-[15px] font-bold text-slate-950">
              {bookings.length} đơn · Tổng giá cast: {formatMoney(totalCast)}
            </h2>
          </div>

          <Link
            href={`/bookings/new?koc_id=${kocId}`}
            className="flex h-9 w-fit items-center rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
          >
            + Tạo đơn
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <Th>Mã đơn</Th>
                <Th>Loại booking</Th>
                <Th>Giá cast</Th>
                <Th>Status</Th>
                <Th>Sản phẩm</Th>
                <Th>Ngày tạo</Th>
                <Th>Dự kiến đăng</Th>
                <Th>Đăng thực tế</Th>
                <Th>Sửa</Th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                    Đang tải đơn hàng...
                  </td>
                </tr>
              )}

              {!loading && bookings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                    KOC này chưa có đơn hàng nào. Bấm "+ Tạo đơn" để thêm.
                  </td>
                </tr>
              )}

              {!loading &&
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-bold text-slate-950">
                        {booking.booking_code || "—"}
                      </span>
                    </Td>
                    <Td>{booking.booking_type || "—"}</Td>
                    <Td>{formatMoney(booking.cast_price)}</Td>
                    <Td>{booking.status_booking || "—"}</Td>
                    <Td>{booking.product || "—"}</Td>
                    <Td>{formatDate(booking.created_at)}</Td>
                    <Td>{formatDate(booking.expected_post_date)}</Td>
                    <Td>{formatDate(booking.actual_post_date)}</Td>
                    <Td>
                      <Link
                        href={`/bookings/${booking.id}/edit`}
                        title="Sửa đơn"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] shadow-sm hover:border-blue-200 hover:bg-blue-50"
                      >
                        ✏️
                      </Link>
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);

  return (
    <div className="flex items-baseline gap-2 border-b border-slate-100 py-1.5">
      <span className="w-36 shrink-0 text-[12px] font-semibold text-slate-500">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-slate-900">{text}</span>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-slate-200 px-5 py-3 text-[11px] font-black uppercase tracking-[0.06em] whitespace-nowrap text-slate-700">
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="border-b border-slate-100 px-5 py-3 align-middle text-[13px]">
      {children}
    </td>
  );
}

function getKocDisplayName(koc?: DbRow | null) {
  if (!koc) return "";
  return (
    koc.Id_tiktok_Ten_fb ||
    koc.name ||
    koc.koc_code ||
    koc.phone ||
    "Chưa rõ KOC"
  );
}

function getEmployeeDisplayName(employee?: DbRow | null) {
  if (!employee) return "Chưa có PIC";
  return (
    employee.full_name ||
    employee.employee_code ||
    employee.email ||
    "Chưa rõ PIC"
  );
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const raw = String(value).trim().replace(/\./g, "").replace(/,/g, "");
  const numberValue = Number(raw);
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("vi-VN");
}

function formatMoney(value: unknown) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }

  const shortDate = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) {
    const [year, month, day] = shortDate.split("-");
    return `${day}/${month}/${year}`;
  }

  return raw;
}
