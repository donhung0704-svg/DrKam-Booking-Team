"use client";

import { useEffect, useRef, useState } from "react";

type Preset = { id: string; name: string };

export default function SavedFiltersDropdown({
  presets,
  onApply,
  onDelete,
  onSaveCurrent,
}: {
  presets: Preset[];
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveCurrent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-[13px] font-bold shadow-sm ${
          open
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span>★ Bộ lọc đã lưu</span>
        {presets.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-1.5 text-[11px] font-black text-emerald-700">
            {presets.length}
          </span>
        )}
        <span className="text-[11px] text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <button
            type="button"
            onClick={() => {
              onSaveCurrent();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-left text-[12.5px] font-bold text-[#3964ff] hover:bg-blue-50"
          >
            + Lưu bộ lọc hiện tại
          </button>

          <div className="max-h-72 overflow-auto p-1.5">
            {presets.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] font-semibold text-slate-400">
                Chưa có bộ lọc nào được lưu.
              </div>
            )}

            {presets.map((preset) => (
              <div
                key={preset.id}
                className="group flex items-center gap-1 rounded-xl hover:bg-emerald-50"
              >
                <button
                  type="button"
                  onClick={() => {
                    onApply(preset.id);
                    setOpen(false);
                  }}
                  title="Áp dụng bộ lọc này"
                  className="flex-1 truncate px-3 py-2 text-left text-[12.5px] font-bold text-slate-700"
                >
                  ★ {preset.name}
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(preset.id)}
                  title="Xóa bộ lọc đã lưu"
                  className="mr-1.5 rounded-lg px-2 py-1 text-[13px] text-slate-300 hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
