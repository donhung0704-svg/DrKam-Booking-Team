"use client";

import { supabase } from "@/lib/supabase/client";
import KpiAchievement from "@/components/KpiAchievement";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as XLSX from "xlsx";

type DbRow = Record<string, any>;

type ReportRow = {
  employeeId: string;
  employeeName: string;
  isRealPic: boolean;
  lienHe: number;
  phanHoi: number;
  bookingMoi: number;
  dailyVideoNew: number;
  dailyVideoOld: number;
  gmvNgay: number;
};

// Status được coi là "chưa phản hồi" -> không tính vào cột Phản hồi
const notRespondedStatuses = ["Chờ phản hồi", "Đã phản hồi"];

type KpiInput = {
  lienHe: string;
  phanHoi: string;
  bookingMoi: string;
  gmv: string;
};

// KPI của từng chỉ tiêu lưu vào cột tương ứng trong bảng employees
const KPI_COLUMN: Record<keyof KpiInput, string> = {
  lienHe: "kpi_thang_lien_he",
  phanHoi: "kpi_thang_phan_hoi",
  bookingMoi: "kpi_thang_booking_moi",
  gmv: "kpi_thang_gmv",
};

const EMPTY_KPI: KpiInput = {
  lienHe: "",
  phanHoi: "",
  bookingMoi: "",
  gmv: "",
};

const KPI_FIELDS: (keyof KpiInput)[] = [
  "lienHe",
  "phanHoi",
  "bookingMoi",
  "gmv",
];

export default function MonthlyReportPage() {
  const [reportMonth, setReportMonth] = useState(getVietnamCurrentMonth());

  const [bookings, setBookings] = useState<DbRow[]>([]);
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // KPI ngày nhập tay theo từng PIC (lưu vào employees.kpi_*)
  const [kpiInputs, setKpiInputs] = useState<Record<string, KpiInput>>({});
  const [savingKpiId, setSavingKpiId] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      try {
        // Supabase giới hạn 1000 dòng/lần -> phải phân trang để lấy đủ dữ liệu
        const [bookingRows, kocRows, employeeRows] = await Promise.all([
          loadAllRows("bookings"),
          loadAllRows("koc"),
          loadAllRows("employees", (query) => query.eq("active", true)),
        ]);

        setBookings(bookingRows);
        setKocs(kocRows);
        setEmployees(employeeRows);
      } catch (error) {
        setMessage(
          `Lỗi tải dữ liệu báo cáo: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      setLoading(false);
    }

    loadData();
  }, []);

  // Khởi tạo KPI từ dữ liệu nhân sự
  useEffect(() => {
    const map: Record<string, KpiInput> = {};

    employees.forEach((employee) => {
      map[String(employee.id)] = {
        lienHe: toKpiInput(employee.kpi_thang_lien_he),
        phanHoi: toKpiInput(employee.kpi_thang_phan_hoi),
        bookingMoi: toKpiInput(employee.kpi_thang_booking_moi),
        gmv: toKpiInput(employee.kpi_thang_gmv),
      };
    });

    setKpiInputs(map);
  }, [employees]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, DbRow>();

    employees.forEach((employee) => {
      if (employee.id) {
        map.set(String(employee.id), employee);
      }
    });

    return map;
  }, [employees]);

  const reportRows = useMemo(() => {
    const monthKey = reportMonth;

    if (!monthKey) return [];

    const rowMap = new Map<string, ReportRow>();

    function ensureRow(employeeId: string) {
      const key = employeeId || "no-pic";

      if (!rowMap.has(key)) {
        const employee = employeeId ? employeeMap.get(employeeId) : null;

        rowMap.set(key, {
          employeeId: key,
          employeeName: employee
            ? getEmployeeDisplayName(employee)
            : "Chưa có PIC",
          isRealPic: Boolean(employee),
          lienHe: 0,
          phanHoi: 0,
          bookingMoi: 0,
          dailyVideoNew: 0,
          dailyVideoOld: 0,
          gmvNgay: 0,
        });
      }

      return rowMap.get(key)!;
    }

    // Luôn hiển thị mọi PIC đang hoạt động
    employees.forEach((employee) => {
      ensureRow(String(employee.id));
    });

    kocs.forEach((koc) => {
      const row = ensureRow(String(koc.employee_id || ""));

      const createdKey = toVietnamDateKey(koc.created_at);
      const contactKey = toVietnamDateKey(koc.new_contact_date);
      const status = String(koc.status || "").trim();

      // Liên hệ = số KOC tạo mới trong tháng + số KOC được chăm sóc (CS gần nhất) trong tháng
      if (createdKey.slice(0, 7) === monthKey) {
        row.lienHe += 1;
      }

      if (contactKey.slice(0, 7) === monthKey) {
        row.lienHe += 1;
      }

      // Phản hồi: KOC tạo mới trong tháng và Status khác Chờ phản hồi & Đã phản hồi
      if (
        createdKey.slice(0, 7) === monthKey &&
        !notRespondedStatuses.includes(status)
      ) {
        row.phanHoi += 1;
      }

      // Tổng theo KOC phụ trách: Monthly Videos + GMV tháng
      const monthlyVideos = parseNumber(koc.monthly_videos);
      if (String(koc.tier || "").trim() === "Mới hoạt động") {
        row.dailyVideoNew += monthlyVideos;
      } else {
        row.dailyVideoOld += monthlyVideos;
      }

      row.gmvNgay += parseNumber(koc.gmv_thang);
    });

    bookings.forEach((booking) => {
      const row = ensureRow(String(booking.employee_id || ""));

      if (toVietnamDateKey(booking.created_at).slice(0, 7) === monthKey) {
        row.bookingMoi += 1;
      }
    });

    return Array.from(rowMap.values())
      .filter((row) => {
        // Giữ mọi PIC thật; nhóm "Chưa có PIC" chỉ hiện khi có số liệu
        if (row.isRealPic) return true;

        return (
          row.lienHe > 0 ||
          row.phanHoi > 0 ||
          row.bookingMoi > 0 ||
          row.dailyVideoNew > 0 ||
          row.dailyVideoOld > 0 ||
          row.gmvNgay > 0
        );
      })
      .sort((a, b) => {
        if (!a.isRealPic) return 1;
        if (!b.isRealPic) return -1;
        return a.employeeName.localeCompare(b.employeeName, "vi");
      });
  }, [bookings, kocs, employees, employeeMap, reportMonth]);

  const totals = useMemo(() => {
    return reportRows.reduce(
      (total, row) => {
        total.lienHe += row.lienHe;
        total.phanHoi += row.phanHoi;
        total.bookingMoi += row.bookingMoi;
        total.dailyVideoNew += row.dailyVideoNew;
        total.dailyVideoOld += row.dailyVideoOld;
        total.gmvNgay += row.gmvNgay;

        return total;
      },
      {
        lienHe: 0,
        phanHoi: 0,
        bookingMoi: 0,
        dailyVideoNew: 0,
        dailyVideoOld: 0,
        gmvNgay: 0,
      }
    );
  }, [reportRows]);

  function setThisMonth() {
    setReportMonth(getVietnamCurrentMonth());
  }

  function updateKpiInput(
    employeeId: string,
    field: keyof KpiInput,
    value: string
  ) {
    setKpiInputs((prev) => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || EMPTY_KPI), [field]: value },
    }));
  }

  async function saveKpi(employeeId: string, field: keyof KpiInput) {
    if (!employeeId || employeeId === "no-pic") return;

    const raw = (kpiInputs[employeeId]?.[field] ?? "").trim();
    const value = raw === "" ? null : parseNumber(raw);

    setSavingKpiId(employeeId);

    const { error } = await supabase
      .from("employees")
      .update({ [KPI_COLUMN[field]]: value })
      .eq("id", employeeId);

    setSavingKpiId("");

    if (error) {
      setMessage(`Lỗi lưu KPI: ${error.message}`);
    }
  }

  function exportExcel() {
    const exportRows = reportRows.map((row) => ({
      PIC: row.employeeName,
      "Liên hệ": row.lienHe,
      "Phản hồi": row.phanHoi,
      "Booking mới": row.bookingMoi,
      "Monthly Videos (New KOCs)": row.dailyVideoNew,
      "Monthly Videos (Old KOCs)": row.dailyVideoOld,
      "Monthly Videos": row.dailyVideoNew + row.dailyVideoOld,
      GMV: row.gmvNgay,
    }));

    if (exportRows.length === 0) {
      alert("Không có dữ liệu để xuất Excel.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    worksheet["!cols"] = [
      { wch: 24 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao cao PIC");

    XLSX.writeFile(
      workbook,
      `bao-cao-thang-${reportMonth}.xlsx`
    );
  }

  const kpiRows = reportRows.filter((row) => row.isRealPic);

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-4 rounded-[18px] border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-base">
              📈
            </div>

            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase leading-[1.3] tracking-[0.2em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[20px] font-bold leading-tight tracking-normal text-slate-950 md:text-[22px]">
                Báo cáo tháng
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportExcel}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Xuất Excel
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {message}
        </div>
      )}

      <section className="mb-4 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <div className="md:w-[240px]">
            <label className="mb-1.5 block text-[13px] font-bold text-slate-600">
              Tháng báo cáo
            </label>

            <input
              type="month"
              value={reportMonth}
              onChange={(event) => setReportMonth(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
            />
          </div>

          <button
            type="button"
            onClick={setThisMonth}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
          >
            Tháng này
          </button>

          <p className="text-[12px] font-semibold text-slate-400 md:ml-auto">
            Liên hệ / Phản hồi / Booking mới tính theo tháng đã chọn. Monthly
            Videos, GMV tháng tính trên toàn bộ KOC phụ trách.
          </p>
        </div>
      </section>

      {!loading && (
        <KpiAchievement rows={reportRows} kpiInputs={kpiInputs} />
      )}

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <Th>PIC</Th>
                <Th>Liên hệ</Th>
                <Th>Phản hồi</Th>
                <Th>Booking mới</Th>
                <Th>Monthly Videos (New KOCs)</Th>
                <Th>Monthly Videos (Old KOCs)</Th>
                <Th>Monthly Videos</Th>
                <Th>GMV</Th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Đang tải dữ liệu báo cáo...
                  </td>
                </tr>
              )}

              {!loading && reportRows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              )}

              {!loading &&
                reportRows.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-bold text-slate-950">
                        {row.employeeName}
                      </span>
                    </Td>

                    <Td>{row.lienHe}</Td>
                    <Td>{row.phanHoi}</Td>
                    <Td>{row.bookingMoi}</Td>
                    <Td>{formatNumber(row.dailyVideoNew)}</Td>
                    <Td>{formatNumber(row.dailyVideoOld)}</Td>
                    <Td>
                      {formatNumber(row.dailyVideoNew + row.dailyVideoOld)}
                    </Td>
                    <Td>{formatMoney(row.gmvNgay)}</Td>
                  </tr>
                ))}

              {!loading && reportRows.length > 0 && (
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-5 py-4 font-bold text-slate-950">
                    Tổng cộng
                  </td>
                  <td className="px-5 py-4 font-bold">{totals.lienHe}</td>
                  <td className="px-5 py-4 font-bold">{totals.phanHoi}</td>
                  <td className="px-5 py-4 font-bold">{totals.bookingMoi}</td>
                  <td className="px-5 py-4 font-bold">
                    {formatNumber(totals.dailyVideoNew)}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {formatNumber(totals.dailyVideoOld)}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {formatNumber(totals.dailyVideoNew + totals.dailyVideoOld)}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {formatMoney(totals.gmvNgay)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
            KPI tháng
          </p>

          <p className="mt-1 text-[12.5px] text-slate-500">
            Nhập KPI mục tiêu cho từng PIC. Tỷ lệ % thực đạt = số thực tế (bảng
            Báo cáo tháng) / KPI.
            {savingKpiId && (
              <span className="ml-2 font-semibold text-slate-400">
                Đang lưu…
              </span>
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th
                  rowSpan={2}
                  className="border-b border-r border-slate-200 px-5 py-3 text-[11px] font-black uppercase tracking-[0.06em] text-slate-700"
                >
                  PIC
                </th>
                <th
                  colSpan={4}
                  className="border-b border-r border-slate-200 px-5 py-2 text-center text-[11px] font-black uppercase tracking-[0.1em] text-blue-700"
                >
                  KPI
                </th>
                <th
                  colSpan={4}
                  className="border-b border-slate-200 px-5 py-2 text-center text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700"
                >
                  Tỷ lệ % thực đạt
                </th>
              </tr>

              <tr className="bg-slate-50">
                <KpiTh>Liên hệ</KpiTh>
                <KpiTh>Phản hồi</KpiTh>
                <KpiTh>Booking mới</KpiTh>
                <KpiTh borderRight>GMV</KpiTh>
                <KpiTh>Liên hệ</KpiTh>
                <KpiTh>Phản hồi</KpiTh>
                <KpiTh>Booking mới</KpiTh>
                <KpiTh>GMV</KpiTh>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}

              {!loading && kpiRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Không có PIC.
                  </td>
                </tr>
              )}

              {!loading &&
                kpiRows.map((row) => {
                  const k = kpiInputs[row.employeeId] || EMPTY_KPI;
                  const actual: Record<keyof KpiInput, number> = {
                    lienHe: row.lienHe,
                    phanHoi: row.phanHoi,
                    bookingMoi: row.bookingMoi,
                    gmv: row.gmvNgay,
                  };

                  return (
                    <tr key={row.employeeId} className="hover:bg-slate-50">
                      <Td>
                        <span className="font-bold text-slate-950">
                          {row.employeeName}
                        </span>
                      </Td>

                      {KPI_FIELDS.map((field) => (
                        <Td key={`kpi-${field}`}>
                          <input
                            value={k[field]}
                            onChange={(event) =>
                              updateKpiInput(
                                row.employeeId,
                                field,
                                event.target.value
                              )
                            }
                            onBlur={() => saveKpi(row.employeeId, field)}
                            placeholder="KPI"
                            className="h-9 w-[100px] rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                          />
                        </Td>
                      ))}

                      {KPI_FIELDS.map((field) => (
                        <Td key={`pct-${field}`}>
                          <span
                            className={`font-bold ${pctColor(
                              actual[field],
                              parseNumber(k[field])
                            )}`}
                          >
                            {formatPercent(actual[field], parseNumber(k[field]))}
                          </span>
                        </Td>
                      ))}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
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

function KpiTh({
  children,
  borderRight,
}: {
  children: ReactNode;
  borderRight?: boolean;
}) {
  return (
    <th
      className={`border-b border-slate-200 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 ${
        borderRight ? "border-r" : ""
      }`}
    >
      {children}
    </th>
  );
}

function toKpiInput(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function formatPercent(actual: number, kpi: number) {
  if (!kpi || kpi <= 0) return "—";

  const pct = (actual / kpi) * 100;

  return `${pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function pctColor(actual: number, kpi: number) {
  if (!kpi || kpi <= 0) return "text-slate-400";

  const pct = (actual / kpi) * 100;

  if (pct >= 100) return "text-emerald-600";
  if (pct >= 70) return "text-orange-600";

  return "text-red-600";
}

// Tải hết dữ liệu từ Supabase (mặc định trả tối đa 1000 dòng/lần -> phân trang)
async function loadAllRows(
  table: string,
  applyFilter?: (query: any) => any
): Promise<DbRow[]> {
  const pageSize = 1000;
  const rows: DbRow[] = [];
  let from = 0;

  for (;;) {
    let query: any = supabase.from(table).select("*");

    if (applyFilter) {
      query = applyFilter(query);
    }

    query = query
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const batch: DbRow[] = data || [];
    rows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
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
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatMoney(value: unknown) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getVietnamCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";

  return `${year}-${month}`;
}

function toVietnamDateKey(value: unknown) {
  if (!value) return "";

  const raw = String(value).trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
  }

  const shortDate = raw.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) {
    return shortDate;
  }

  return "";
}
