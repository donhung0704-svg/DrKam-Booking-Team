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
}: {
  bookings: DbRow[];
  kocMap: Map<string, DbRow>;
  statuses: string[];
  onStatusChange: (bookingId: string, newStatus: string) => void;
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
            className={`flex w-[300px] shrink-0 flex-col rounded-2xl border bg-slate-50 ${
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
