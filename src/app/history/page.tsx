"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

type DbRow = Record<string, any>;

type HistoryRow = {
  id: number;
  action: string;
  changed_at: string;
  old_data: DbRow | null;
  new_data: DbRow | null;
  recordId: string;
};

// Nhãn tiếng Việt cho các trường (trường không có trong map -> hiện tên gốc)
const KOC_LABELS: Record<string, string> = {
  name: "Tên KOC",
  Id_tiktok_Ten_fb: "ID TikTok/Tên FB",
  koc_code: "Mã KOC",
  status: "Status",
  tier: "Tier",
  channel_type: "Channel type",
  platform: "Nền tảng",
  employee_id: "PIC phụ trách",
  phone: "SĐT/Zalo",
  email: "Email",
  address: "Address",
  note: "Note",
  booking_date: "Booking date",
  follower: "Follower",
  number_of_videos: "Daily Videos(T-1)",
  monthly_videos: "Monthly Videos",
  videos_with_revenue: "Video có DT",
  gmv: "GMV ngày",
  gmv_thang: "GMV tháng",
  cast_price: "Giá cast",
  new_contact_date: "CS gần nhất",
  date_of_birth: "Date of birth",
  marital_status: "Marital status",
  campaign_id: "Campaign",
  tiktok_link: "Link TikTok",
  facebook_link: "Link Facebook",
  engagement_rate: "Engagement rate",
  created_at: "Ngày tạo",
};

const BOOKING_LABELS: Record<string, string> = {
  status_booking: "Status booking",
  booking_type: "Loại booking",
  cast_price: "Giá cast",
  product: "Sản phẩm",
  order_items: "Chi tiết SP",
  note: "Ghi chú",
  employee_id: "PIC phụ trách",
  expected_post_date: "Ngày dự kiến đăng",
  actual_post_date: "Ngày đăng thực tế",
  quantity: "Số lượng",
  order_value: "Giá trị đơn",
  delivery_address: "Địa chỉ giao hàng",
  recipient_phone: "SĐT nhận hàng",
  ship_date: "Ngày gửi",
  tracking_code: "Mã vận đơn",
  order_status: "Tình trạng đơn hàng",
  commission: "Hoa hồng",
  expense: "Chi phí",
  booking_code: "Mã booking",
  koc_id: "KOC",
  campaign_id: "Campaign",
  created_at: "Ngày tạo",
};

export default function EditHistoryPage() {
  const [dateKey, setDateKey] = useState(getVietnamTodayKey());
  const [kocHistory, setKocHistory] = useState<HistoryRow[]>([]);
  const [bookingHistory, setBookingHistory] = useState<HistoryRow[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Map<string, string>>(new Map());
  const [kocNameMap, setKocNameMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");

      // Khoảng thời gian của NGÀY chọn theo giờ Việt Nam
      const startIso = `${dateKey}T00:00:00+07:00`;
      const endIso = new Date(
        new Date(startIso).getTime() + 24 * 60 * 60 * 1000
      ).toISOString();

      try {
        const [kocRes, bookingRes, empRes] = await Promise.all([
          supabase
            .from("koc_history")
            .select("id, koc_id, action, changed_at, old_data, new_data")
            .gte("changed_at", startIso)
            .lt("changed_at", endIso)
            .order("changed_at", { ascending: false }),
          supabase
            .from("bookings_history")
            .select("id, booking_id, action, changed_at, old_data, new_data")
            .gte("changed_at", startIso)
            .lt("changed_at", endIso)
            .order("changed_at", { ascending: false }),
          supabase.from("employees").select("id, full_name, employee_code, email"),
        ]);

        if (kocRes.error) throw new Error(kocRes.error.message);
        if (bookingRes.error) throw new Error(bookingRes.error.message);

        const empMap = new Map<string, string>();
        (empRes.data || []).forEach((e) => {
          empMap.set(
            String(e.id),
            e.full_name || e.employee_code || e.email || "Chưa rõ PIC"
          );
        });
        setEmployeeMap(empMap);

        const kocRows: HistoryRow[] = (kocRes.data || []).map((r) => ({
          id: r.id,
          action: r.action,
          changed_at: r.changed_at,
          old_data: r.old_data,
          new_data: r.new_data,
          recordId: String(r.koc_id ?? ""),
        }));

        const bookingRows: HistoryRow[] = (bookingRes.data || []).map((r) => ({
          id: r.id,
          action: r.action,
          changed_at: r.changed_at,
          old_data: r.old_data,
          new_data: r.new_data,
          recordId: String(r.booking_id ?? ""),
        }));

        setKocHistory(kocRows);
        setBookingHistory(bookingRows);

        // Lấy tên KOC cho các booking (nhẹ vì chỉ các koc_id xuất hiện trong ngày)
        const kocIds = new Set<string>();
        bookingRows.forEach((r) => {
          const kid = (r.new_data || r.old_data)?.koc_id;
          if (kid) kocIds.add(String(kid));
        });

        if (kocIds.size > 0) {
          const { data: kocData } = await supabase
            .from("koc")
            .select("id, name, Id_tiktok_Ten_fb")
            .in("id", Array.from(kocIds));

          const km = new Map<string, string>();
          (kocData || []).forEach((k) => {
            km.set(String(k.id), k.name || k.Id_tiktok_Ten_fb || "Chưa rõ KOC");
          });
          setKocNameMap(km);
        } else {
          setKocNameMap(new Map());
        }
      } catch (error) {
        setMessage(
          `Lỗi tải lịch sử: ${
            error instanceof Error ? error.message : String(error)
          }. (Đã chạy supabase/add-edit-history.sql chưa?)`
        );
        setKocHistory([]);
        setBookingHistory([]);
      }

      setLoading(false);
    }

    load();
  }, [dateKey]);

  const renderValue = (field: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return "(trống)";
    if (field === "employee_id") return employeeMap.get(String(value)) || String(value);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const totalChanges = kocHistory.length + bookingHistory.length;

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 md:px-8">
      <header className="mb-5 rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
          DRKAM CRM PORTAL
        </p>
        <h1 className="mt-1 text-[26px] font-bold text-slate-950">
          Lịch sử chỉnh sửa
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Xem các KOC / Booking đã sửa hoặc xóa trong ngày, kèm giá trị cũ → mới.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-[13px] font-bold text-slate-600">Ngày:</label>
          <input
            type="date"
            value={dateKey}
            onChange={(event) => setDateKey(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff]"
          />
          <button
            type="button"
            onClick={() => setDateKey(getVietnamTodayKey())}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
          >
            Hôm nay
          </button>
          <span className="text-[12.5px] font-semibold text-slate-500">
            {loading
              ? "Đang tải…"
              : `${totalChanges} thay đổi (KOC: ${kocHistory.length}, Booking: ${bookingHistory.length})`}
          </span>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {message}
        </div>
      )}

      <HistorySection
        title="KOC"
        rows={kocHistory}
        labels={KOC_LABELS}
        loading={loading}
        renderValue={renderValue}
        identityOf={(row) => {
          const d = row.new_data || row.old_data || {};
          return d.name || d.Id_tiktok_Ten_fb || d.koc_code || "Chưa rõ KOC";
        }}
      />

      <div className="h-4" />

      <HistorySection
        title="Booking"
        rows={bookingHistory}
        labels={BOOKING_LABELS}
        loading={loading}
        renderValue={renderValue}
        identityOf={(row) => {
          const d = row.new_data || row.old_data || {};
          const kocName = d.koc_id ? kocNameMap.get(String(d.koc_id)) : "";
          return [d.booking_code, kocName].filter(Boolean).join(" · ") || "Booking";
        }}
      />
    </section>
  );
}

function HistorySection({
  title,
  rows,
  labels,
  loading,
  renderValue,
  identityOf,
}: {
  title: string;
  rows: HistoryRow[];
  labels: Record<string, string>;
  loading: boolean;
  renderValue: (field: string, value: unknown) => string;
  identityOf: (row: HistoryRow) => string;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <p className="text-[13px] font-black text-slate-800">
          {title}{" "}
          <span className="font-bold text-slate-400">({rows.length})</span>
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {!loading && rows.length === 0 && (
          <div className="px-5 py-8 text-center text-[13px] text-slate-400">
            Không có thay đổi nào trong ngày.
          </div>
        )}

        {rows.map((row) => {
          const changes = diffChanges(row);

          return (
            <div key={row.id} className="px-5 py-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-black ${
                    row.action === "DELETE"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {row.action === "DELETE" ? "XÓA" : "SỬA"}
                </span>
                <span className="text-[13px] font-bold text-slate-950">
                  {identityOf(row)}
                </span>
                <span className="text-[11.5px] text-slate-400">
                  {formatTime(row.changed_at)}
                </span>
              </div>

              {row.action === "DELETE" ? (
                <p className="text-[12.5px] font-semibold text-red-600">
                  Bản ghi đã bị xóa. Xem giá trị cũ ở dữ liệu gốc bên dưới nếu cần
                  khôi phục.
                </p>
              ) : changes.length === 0 ? (
                <p className="text-[12.5px] text-slate-400">
                  (Không có trường nào thay đổi giá trị)
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12.5px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="py-1 pr-4 font-bold">Trường</th>
                        <th className="py-1 pr-4 font-bold">Giá trị cũ</th>
                        <th className="py-1 font-bold">Giá trị mới</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((field) => (
                        <tr key={field} className="border-t border-slate-50">
                          <td className="py-1.5 pr-4 font-bold text-slate-700">
                            {labels[field] || field}
                          </td>
                          <td className="py-1.5 pr-4 text-slate-500 line-through decoration-slate-300">
                            {renderValue(field, row.old_data?.[field])}
                          </td>
                          <td className="py-1.5 font-semibold text-emerald-700">
                            {renderValue(field, row.new_data?.[field])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Danh sách trường thực sự đổi giá trị giữa old_data và new_data
function diffChanges(row: HistoryRow): string[] {
  if (!row.old_data || !row.new_data) return [];

  const keys = new Set([
    ...Object.keys(row.old_data),
    ...Object.keys(row.new_data),
  ]);

  const changed: string[] = [];
  keys.forEach((key) => {
    const before = JSON.stringify(row.old_data?.[key] ?? null);
    const after = JSON.stringify(row.new_data?.[key] ?? null);
    if (before !== after) changed.push(key);
  });

  return changed;
}

function getVietnamTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
