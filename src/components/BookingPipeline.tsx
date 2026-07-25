"use client";

import { useMemo, useState } from "react";

type DbRow = Record<string, any>;

// Bộ màu mỗi cột: viền trên đậm + nền cột + header (lặp nếu nhiều cột hơn)
const columnStyles = [
  { accent: "#f59e0b", soft: "#fff7ed", head: "#fef3c7", text: "#b45309" }, // cam
  { accent: "#8b5cf6", soft: "#f5f3ff", head: "#ede9fe", text: "#6d28d9" }, // tím
  { accent: "#06b6d4", soft: "#ecfeff", head: "#cffafe", text: "#0e7490" }, // ngọc
  { accent: "#22c55e", soft: "#f0fdf4", head: "#dcfce7", text: "#15803d" }, // lá
  { accent: "#ef4444", soft: "#fef2f2", head: "#fee2e2", text: "#b91c1c" }, // đỏ (Hủy)
  { accent: "#3b82f6", soft: "#eff6ff", head: "#dbeafe", text: "#1d4ed8" }, // dương
];

export default function BookingPipeline({
  bookings,
  kocMap,
  statuses,
  onStatusChange,
  onFieldChange,
}: {
  bookings: DbRow[];
  kocMap: Map<string, DbRow>;
  statuses: string[];
  onStatusChange: (bookingId: string, newStatus: string) => void;
  // Sửa trực tiếp trên card (Ngày dự kiến đăng / Ngày thực tế đăng)
  onFieldChange: (
    bookingId: string,
    field: string,
    value: string | null
  ) => void;
}) {
  const [dragId, setDragId] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState("");
  // Vừa copy cái gì (để hiện "Đã copy" trong ~1.2s)
  const [copied, setCopied] = useState("");

  function copyText(text: string) {
    const value = String(text || "").trim();
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied((cur) => (cur === value ? "" : cur)), 1200);
  }

  // Gom booking theo status_booking; giữ đủ các cột chuẩn + cột lạ (nếu có).
  // Quy tắc: đã có "Ngày thực tế đăng" -> luôn xếp vào cột "Đã đăng video"
  // (trừ khi đang là "Hủy" / "Không cần lên vid").
  const { columns, groups } = useMemo(() => {
    const g = new Map<string, DbRow[]>();
    statuses.forEach((s) => g.set(s, []));

    bookings.forEach((booking) => {
      const stored = String(booking.status_booking || "").trim() || statuses[0];
      const hasActual = String(booking.actual_post_date ?? "").trim() !== "";
      const raw =
        hasActual && stored !== "Hủy" && stored !== "Không cần lên vid"
          ? "Đã đăng video"
          : stored;
      if (!g.has(raw)) g.set(raw, []);
      g.get(raw)!.push(booking);
    });

    return { columns: Array.from(g.keys()), groups: g };
  }, [bookings, statuses]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status, index) => {
        const cards = groups.get(status) || [];
        const style = columnStyles[index % columnStyles.length];
        const isOver = dragOverStatus === status;

        return (
          <div
            key={status}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragOverStatus !== status) setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus("")}
            onDrop={() => {
              if (dragId) onStatusChange(dragId, status);
              setDragId("");
              setDragOverStatus("");
            }}
            className={`flex min-w-[320px] flex-1 flex-col overflow-hidden rounded-2xl ${
              isOver ? "ring-2 ring-[#3964ff] ring-offset-1" : ""
            }`}
            style={{ backgroundColor: style.soft }}
          >
            {/* Header ĐƯỢC GHIM: dính đầu cột khi cuộn danh sách card.
                Chiều cao cột vừa khung màn hình -> cuộn NỘI BỘ cột (không cuộn
                cả trang) nên tiêu đề luôn dính. */}
            <div className="flex h-[calc(100vh-300px)] min-h-[360px] flex-col overflow-y-auto">
              <div
                className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 shadow-sm"
                style={{ backgroundColor: style.head }}
              >
                <span
                  className="text-[13.5px] font-black"
                  style={{ color: style.text }}
                >
                  {status}
                </span>
                <span
                  className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-black shadow-sm"
                  style={{ color: style.text }}
                >
                  {cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
              {cards.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[12px] text-slate-400">
                  Kéo card vào đây
                </div>
              )}

              {cards.map((booking) => {
                const koc = booking.koc_id
                  ? kocMap.get(String(booking.koc_id))
                  : null;
                const kocName =
                  koc?.name || koc?.Id_tiktok_Ten_fb || "Chưa rõ KOC";
                const tiktok = koc?.Id_tiktok_Ten_fb || "";
                const value =
                  Number(booking.order_value) || Number(booking.cast_price) || 0;

                return (
                  <div
                    key={booking.id}
                    draggable
                    onDragStart={() => setDragId(String(booking.id))}
                    onDragEnd={() => {
                      setDragId("");
                      setDragOverStatus("");
                    }}
                    className={`cursor-grab rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm hover:border-slate-300 active:cursor-grabbing ${
                      dragId === String(booking.id) ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="truncate text-[13px] font-bold text-slate-950">
                        {kocName}
                      </p>
                      {/* Copy nhanh: ID TikTok (hoặc tên) để check KOC */}
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => copyText(tiktok || kocName)}
                        title="Copy thông tin KOC"
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {copied === (tiktok || kocName) ? "✓ Đã copy" : "📋"}
                      </button>
                    </div>
                    {tiktok && (
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => copyText(tiktok)}
                        title="Bấm để copy ID TikTok"
                        className="block max-w-full truncate text-left text-[11.5px] font-semibold text-[#3964ff] hover:underline"
                      >
                        @{tiktok}
                      </button>
                    )}
                    {booking.product && (
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                        {booking.product}
                      </p>
                    )}
                    {value > 0 && (
                      <p className="mt-1 text-[12px] font-black text-emerald-600">
                        {compactMoney(value)}
                      </p>
                    )}

                    {/* Ngày gửi + Mã vận đơn cùng hàng; Dự kiến + Thực tế cùng hàng.
                        Chặn kéo thả khi thao tác trong khu vực này. */}
                    <div
                      className="mt-2 space-y-1.5 border-t border-slate-100 pt-2"
                      draggable={false}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Ngày gửi
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {formatDateDisplay(booking.ship_date) || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Mã vận đơn
                          </span>
                          {booking.tracking_code ? (
                            <button
                              type="button"
                              draggable={false}
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={() => copyText(booking.tracking_code)}
                              title="Bấm để copy mã vận đơn"
                              className="block max-w-full truncate text-left text-[11px] font-semibold text-slate-700 hover:text-[#3964ff] hover:underline"
                            >
                              {copied === String(booking.tracking_code).trim()
                                ? "✓ Đã copy"
                                : booking.tracking_code}
                            </button>
                          ) : (
                            <span className="block text-[11px] font-semibold text-slate-600">
                              —
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Tình trạng giao hàng
                        </span>
                        <span className="block truncate text-[11px] font-semibold text-slate-600">
                          {booking.order_status || "—"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">
                            Dự kiến đăng
                          </span>
                          <input
                            type="date"
                            draggable={false}
                            value={toDateInput(booking.expected_post_date)}
                            onChange={(event) =>
                              onFieldChange(
                                String(booking.id),
                                "expected_post_date",
                                event.target.value || null
                              )
                            }
                            className="h-6 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] outline-none focus:border-[#3964ff]"
                          />
                        </div>
                        <div>
                          <span className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">
                            Thực tế đăng
                          </span>
                          <input
                            type="date"
                            draggable={false}
                            value={toDateInput(booking.actual_post_date)}
                            onChange={(event) =>
                              onFieldChange(
                                String(booking.id),
                                "actual_post_date",
                                event.target.value || null
                              )
                            }
                            className="h-6 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] outline-none focus:border-[#3964ff]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function compactMoney(value: number) {
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}Tđ`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}Mđ`;
  return `${value.toLocaleString("vi-VN")}đ`;
}

// Giá trị cho <input type="date"> -> "YYYY-MM-DD" (rỗng nếu không có)
function toDateInput(value: unknown) {
  const match = String(value ?? "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

// Hiển thị ngày dạng dd/mm/yyyy
function formatDateDisplay(value: unknown) {
  const key = toDateInput(value);
  if (!key) return "";
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}
