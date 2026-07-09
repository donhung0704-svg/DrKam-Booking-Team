"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DbRow = Record<string, any>;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("employee_code", { ascending: true });

    if (error) {
      setMessage(`Lỗi tải danh sách PIC: ${error.message}`);
      setEmployees([]);
    } else {
      setEmployees(data || []);
    }

    setLoading(false);
  }

  const filteredEmployees = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return employees.filter((employee) => {
      const searchableText = [
        employee.employee_code,
        employee.full_name,
        employee.email,
        employee.phone,
        employee.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = keyword ? searchableText.includes(keyword) : true;

      const matchActive =
        activeFilter === "active"
          ? employee.active === true
          : activeFilter === "inactive"
            ? employee.active === false
            : true;

      return matchSearch && matchActive;
    });
  }, [employees, searchText, activeFilter]);

  const activeCount = employees.filter((employee) => employee.active === true).length;
  const inactiveCount = employees.filter((employee) => employee.active === false).length;

  function clearFilters() {
    setSearchText("");
    setActiveFilter("");
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg">
              👤
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase leading-[1.3] tracking-[0.22em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[26px] font-bold leading-tight tracking-normal text-slate-950 md:text-[28px]">
                Nhân sự / PIC
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-5 text-slate-500">
                Quản lý danh sách PIC phụ trách KOC và Booking. PIC active sẽ
                hiển thị trong các dropdown chọn nhân sự.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/employees/new"
              className="flex h-10 items-center rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
            >
              + Thêm PIC mới
            </Link>

            <Link
              href="/"
              className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {message}
        </div>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MiniMetricCard
          title="Tổng PIC"
          value={employees.length}
          note="Tổng trong database"
          icon="🗂️"
          tone="slate"
        />

        <MiniMetricCard
          title="Đang hoạt động"
          value={activeCount}
          note="Hiện trong dropdown"
          icon="✅"
          tone="green"
        />

        <MiniMetricCard
          title="Đã tắt"
          value={inactiveCount}
          note="Không hiện khi chọn mới"
          icon="⏸️"
          tone="orange"
        />
      </section>

      <section className="mb-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[210px_1.6fr_0.9fr_auto] xl:items-end">
          <div className="pb-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
              Bộ lọc dữ liệu
            </p>

            <h2 className="mt-1 text-[18px] font-bold leading-tight text-slate-950">
              Tìm kiếm PIC
            </h2>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-600">
              Tìm kiếm
            </label>

            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Mã, tên, email, SĐT, vai trò..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-600">
              Trạng thái
            </label>

            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
            >
              <option value="">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã tắt</option>
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
          >
            Xóa bộ lọc
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
              Employees database
            </p>

            <h2 className="mt-1 text-[20px] font-bold leading-tight text-slate-950">
              Danh sách PIC
            </h2>

            <p className="mt-1 text-[13px] text-slate-500">
              Đang hiển thị{" "}
              <span className="font-bold text-slate-950">
                {filteredEmployees.length}
              </span>{" "}
              / {employees.length} PIC phù hợp.
            </p>
          </div>

          <Link
            href="/employees/new"
            className="flex h-10 w-fit items-center rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
          >
            + Thêm PIC mới
          </Link>
        </div>

        <div className="max-h-[calc(100vh-310px)] overflow-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr>
                <Th>Sửa</Th>
                <Th>Mã PIC</Th>
                <Th>Họ tên</Th>
                <Th>SĐT/Zalo</Th>
                <Th>Email</Th>
                <Th>Vai trò</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Đang tải danh sách PIC...
                  </td>
                </tr>
              )}

              {!loading && filteredEmployees.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Không có PIC phù hợp với bộ lọc.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50">
                    <Td>
                      <Link
                        href={`/employees/${employee.id}/edit`}
                        title="Sửa PIC"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[14px] shadow-sm hover:border-blue-200 hover:bg-blue-50"
                      >
                        ✏️
                      </Link>
                    </Td>

                    <Td>
                      <span className="font-bold text-slate-950">
                        {employee.employee_code || "-"}
                      </span>
                    </Td>

                    <Td>{employee.full_name || "-"}</Td>
                    <Td>{employee.phone || "-"}</Td>
                    <Td>{employee.email || "-"}</Td>
                    <Td>{employee.role || "-"}</Td>

                    <Td>
                      {employee.active ? (
                        <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                          Đã tắt
                        </span>
                      )}
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

function MiniMetricCard({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: number | string;
  note: string;
  icon: string;
  tone: "slate" | "green" | "orange";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50"
      : tone === "orange"
        ? "border-orange-100 bg-orange-50"
        : "border-slate-200 bg-slate-50";

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-[26px] font-bold leading-none tracking-normal text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-[12px] font-semibold text-slate-400">
            {note}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg ${toneClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-700">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-slate-100 px-4 py-3 align-middle text-[13px] text-slate-700">
      {children}
    </td>
  );
}
