"use client";

import { useState } from "react";

type DbRow = Record<string, any>;

// Bộ lọc chọn nhân sự (PIC) hiển thị trong báo cáo. Lựa chọn được trang lưu lại
// (localStorage) nên "cố định" giữa các lần mở.
export default function PicFilter({
  employees,
  selectedIds,
  onChange,
}: {
  employees: DbRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedSet = new Set(selectedIds);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
      >
        Nhân sự hiển thị ({selectedIds.length}/{employees.length}){" "}
        {open ? "▲" : "▼"}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 z-30 mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => onChange(employees.map((item) => String(item.id)))}
                className="h-8 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[12px] font-bold text-slate-700 hover:bg-slate-100"
              >
                Chọn tất cả
              </button>

              <button
                type="button"
                onClick={() => onChange([])}
                className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
              >
                Bỏ chọn
              </button>
            </div>

            <div className="max-h-[280px] space-y-0.5 overflow-y-auto">
              {employees.length === 0 && (
                <p className="px-2 py-3 text-center text-[12px] text-slate-400">
                  Chưa có nhân sự.
                </p>
              )}

              {employees.map((employee) => {
                const id = String(employee.id);

                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(id)}
                      onChange={() => toggle(id)}
                      className="h-4 w-4 accent-[#3964ff]"
                    />
                    {employee.full_name ||
                      employee.employee_code ||
                      employee.email ||
                      id}
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
