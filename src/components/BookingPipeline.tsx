"use client";

import { useMemo, useState } from "react";

type DbRow = Record<string, any>;

// Màu viền trên mỗi cột (lặp lại nếu nhiều cột hơn)
const columnAccents = [
  "#f59e0b", // cam
  "#8b5cf6", // tím
  "#06b6d4", // xanh ngọc
  "#22c55e", // xanh lá
  "#ec4899", // hồng
  "#3b82f6", // xanh dương
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

  // Gom booking theo status_booking; giữ đủ các cột chuẩn + cột lạ (nếu có)
  const { columns, groups } = useMemo(() => {
    const g = new Map<string, DbRow[]>();
    statuses.forEach((s) => g.set(s, []));

    bookings.forEach((booking) => {
      const raw = String(booking.status_booking || "").trim() || statuses[0];
      if (!g.has(raw)) g.set(raw, []);
      g.get(raw)!.push(booking);
    });

    return { columns: Array.from(g.keys()), groups: g };
  }, [bookings, statuses]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status, index) => {
        const cards = groups.get(status) || [];
        const accent = columnAccents[index % columnAccents.length];
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
            className={`flex min-w-[320px] flex-1 flex-col rounded-2xl border bg-slate-50 ${
              isOver ? "border-[#3964ff] ring-2 ring-[#3964ff]/20" : "border-slate-200"
            }`}
            style={{ borderTop: `4px solid ${accent}` }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] font-black text-slate-800">
                {status}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-black text-slate-500">
                {cards.length}
              </span>
            </div>

            <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto px-3 pb-3">
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
                    <p className="truncate text-[13px] font-bold text-slate-950">
                      {kocName}
                    </p>
                    {tiktok && (
                      <p className="truncate text-[11.5px] font-semibold text-[#3964ff]">
                        @{tiktok}
                      </p>
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

                    {/* Ngày gửi (chỉ xem) + Dự kiến/Thực tế đăng (sửa trực tiếp).
                        Chặn kéo thả khi thao tác trong khu vực này. */}
                    <div
                      className="mt-2 space-y-1 border-t border-slate-100 pt-2"
                      draggable={false}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-[70px] shrink-0 text-[10.5px] font-bold text-slate-400">
                          Ngày gửi
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">
                          {formatDateDisplay(booking.ship_date) || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-[70px] shrink-0 text-[10.5px] font-bold text-slate-400">
                          Mã vận đơn
                        </span>
                        <span className="truncate text-[11px] font-semibold text-slate-600">
                          {booking.tracking_code || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-[70px] shrink-0 text-[10.5px] font-bold text-slate-400">
                          Tình trạng
                        </span>
                        <span className="truncate text-[11px] font-semibold text-slate-600">
                          {booking.order_status || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-[70px] shrink-0 text-[10.5px] font-bold text-slate-400">
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
                          className="h-6 flex-1 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] outline-none focus:border-[#3964ff]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-[70px] shrink-0 text-[10.5px] font-bold text-slate-400">
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
                          className="h-6 flex-1 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] outline-none focus:border-[#3964ff]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
