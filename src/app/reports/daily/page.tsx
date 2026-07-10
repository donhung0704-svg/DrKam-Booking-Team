"use client";

import { supabase } from "@/lib/supabase/client";
import DatePickerInput from "@/components/DatePickerInput";
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
  soVideoThang: number;
  gmvNgay: number;
  gmvThang: number;
};

// Status được coi là "chưa phản hồi" -> không tính vào cột Phản hồi
const notRespondedStatuses = ["Chờ phản hồi", "Đã phản hồi"];

export default function PicReportPage() {
  const [reportDate, setReportDate] = useState(getVietnamTodayDisplay());

  const [bookings, setBookings] = useState<DbRow[]>([]);
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // KPI GMV nhập tay theo từng PIC (lưu vào employees.kpi_gmv)
  const [kpiMap, setKpiMap] = useState<Record<string, string>>({});
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

  // Khởi tạo KPI GMV từ dữ liệu nhân sự
  useEffect(() => {
    const map: Record<string, string> = {};

    employees.forEach((employee) => {
      const value = employee.kpi_gmv;
      map[String(employee.id)] =
        value === null || value === undefined || value === ""
          ? ""
          : String(value);
    });

    setKpiMap(map);
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
    const dayKey = parseDisplayDateToKey(reportDate);

    if (!dayKey) return [];

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
          soVideoThang: 0,
          gmvNgay: 0,
          gmvThang: 0,
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

      // Liên hệ = số KOC tạo mới trong ngày + số KOC được chăm sóc (CS gần nhất) trong ngày
      if (createdKey === dayKey) {
        row.lienHe += 1;
      }

      if (contactKey === dayKey) {
        row.lienHe += 1;
      }

      // Phản hồi: KOC tạo mới trong ngày và Status khác Chờ phản hồi & Đã phản hồi
      if (createdKey === dayKey && !notRespondedStatuses.includes(status)) {
        row.phanHoi += 1;
      }

      // Tổng theo KOC phụ trách (không lọc theo ngày)
      row.soVideoThang += parseNumber(koc.number_of_videos);
      row.gmvNgay += parseNumber(koc.gmv);
      row.gmvThang += parseNumber(koc.gmv_thang);
    });

    bookings.forEach((booking) => {
      const row = ensureRow(String(booking.employee_id || ""));

      if (toVietnamDateKey(booking.created_at) === dayKey) {
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
          row.soVideoThang > 0 ||
          row.gmvNgay > 0 ||
          row.gmvThang > 0
        );
      })
      .sort((a, b) => {
        if (!a.isRealPic) return 1;
        if (!b.isRealPic) return -1;
        return a.employeeName.localeCompare(b.employeeName, "vi");
      });
  }, [bookings, kocs, employees, employeeMap, reportDate]);

  const totals = useMemo(() => {
    return reportRows.reduce(
      (total, row) => {
        total.lienHe += row.lienHe;
        total.phanHoi += row.phanHoi;
        total.bookingMoi += row.bookingMoi;
        total.soVideoThang += row.soVideoThang;
        total.gmvNgay += row.gmvNgay;
        total.gmvThang += row.gmvThang;
        total.kpiGmv += parseNumber(kpiMap[row.employeeId]);

        return total;
      },
      {
        lienHe: 0,
        phanHoi: 0,
        bookingMoi: 0,
        soVideoThang: 0,
        gmvNgay: 0,
        gmvThang: 0,
        kpiGmv: 0,
      }
    );
  }, [reportRows, kpiMap]);

  function setToday() {
    setReportDate(getVietnamTodayDisplay());
  }

  async function saveKpi(employeeId: string) {
    if (employeeId === "no-pic") return;

    const raw = (kpiMap[employeeId] ?? "").trim();
    const value = raw === "" ? null : parseNumber(raw);

    setSavingKpiId(employeeId);

    const { error } = await supabase
      .from("employees")
      .update({ kpi_gmv: value })
      .eq("id", employeeId);

    setSavingKpiId("");

    if (error) {
      setMessage(`Lỗi lưu KPI GMV: ${error.message}`);
    } else {
      setMessage("");
    }
  }

  function exportExcel() {
    const exportRows = reportRows.map((row) => {
      const kpi = parseNumber(kpiMap[row.employeeId]);

      return {
        PIC: row.employeeName,
        "Liên hệ": row.lienHe,
        "Phản hồi": row.phanHoi,
        "Booking mới": row.bookingMoi,
        "Số video trong tháng": row.soVideoThang,
        "GMV ngày": row.gmvNgay,
        "GMV tháng": row.gmvThang,
        "KPI GMV": kpi,
        "Tỷ lệ hoàn thành KPI": formatPercent(row.gmvThang, kpi),
      };
    });

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
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao cao PIC");

    XLSX.writeFile(
      workbook,
      `bao-cao-nhan-su-${reportDate.replaceAll("/", "-")}.xlsx`
    );
  }

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
                Báo cáo nhân sự
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
              Ngày báo cáo
            </label>

            <DatePickerInput
              name="report_date"
              value={reportDate}
              onChange={setReportDate}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
            />
          </div>

          <button
            type="button"
            onClick={setToday}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
          >
            Hôm nay
          </button>

          <p className="text-[12px] font-semibold text-slate-400 md:ml-auto">
            Liên hệ / Phản hồi / Booking mới tính theo ngày đã chọn. Số video,
            GMV tính trên toàn bộ KOC phụ trách.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <Th>PIC</Th>
                <Th>Liên hệ</Th>
                <Th>Phản hồi</Th>
                <Th>Booking mới</Th>
                <Th>Số video trong tháng</Th>
                <Th>GMV ngày</Th>
                <Th>GMV tháng</Th>
                <Th>KPI GMV</Th>
                <Th>Tỷ lệ hoàn thành KPI</Th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Đang tải dữ liệu báo cáo...
                  </td>
                </tr>
              )}

              {!loading && reportRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              )}

              {!loading &&
                reportRows.map((row) => {
                  const kpi = parseNumber(kpiMap[row.employeeId]);

                  return (
                    <tr key={row.employeeId} className="hover:bg-slate-50">
                      <Td>
                        <span className="font-bold text-slate-950">
                          {row.employeeName}
                        </span>
                      </Td>

                      <Td>{row.lienHe}</Td>
                      <Td>{row.phanHoi}</Td>
                      <Td>{row.bookingMoi}</Td>
                      <Td>{formatNumber(row.soVideoThang)}</Td>
                      <Td>{formatMoney(row.gmvNgay)}</Td>
                      <Td>{formatMoney(row.gmvThang)}</Td>

                      <Td>
                        {row.isRealPic ? (
                          <input
                            value={kpiMap[row.employeeId] ?? ""}
                            onChange={(event) =>
                              setKpiMap((prev) => ({
                                ...prev,
                                [row.employeeId]: event.target.value,
                              }))
                            }
                            onBlur={() => saveKpi(row.employeeId)}
                            placeholder="Nhập KPI"
                            className="h-9 w-[130px] rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}

                        {savingKpiId === row.employeeId && (
                          <span className="ml-2 text-[11px] font-semibold text-slate-400">
                            Đang lưu…
                          </span>
                        )}
                      </Td>

                      <Td>
                        <span
                          className={`font-bold ${completionColor(
                            row.gmvThang,
                            kpi
                          )}`}
                        >
                          {formatPercent(row.gmvThang, kpi)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}

              {!loading && reportRows.length > 0 && (
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-5 py-4 font-bold text-slate-950">
                    Tổng cộng
                  </td>
                  <td className="px-5 py-4 font-bold">{totals.lienHe}</td>
                  <td className="px-5 py-4 font-bold">{totals.phanHoi}</td>
                  <td className="px-5 py-4 font-bold">{totals.bookingMoi}</td>
                  <td className="px-5 py-4 font-bold">
                    {formatNumber(totals.soVideoThang)}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {formatMoney(totals.gmvNgay)}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {formatMoney(totals.gmvThang)}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {formatMoney(totals.kpiGmv)}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {formatPercent(totals.gmvThang, totals.kpiGmv)}
                  </td>
                </tr>
              )}
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

function formatPercent(gmvThang: number, kpi: number) {
  if (!kpi || kpi <= 0) return "—";

  const pct = (gmvThang / kpi) * 100;

  return `${pct.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function completionColor(gmvThang: number, kpi: number) {
  if (!kpi || kpi <= 0) return "text-slate-400";

  const pct = (gmvThang / kpi) * 100;

  if (pct >= 100) return "text-emerald-600";
  if (pct >= 70) return "text-orange-600";

  return "text-red-600";
}

function getVietnamTodayDisplay() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${day}/${month}/${year}`;
}

function parseDisplayDateToKey(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (/^\d{8}$/.test(raw)) {
    const day = raw.slice(0, 2);
    const month = raw.slice(2, 4);
    const year = raw.slice(4, 8);

    return `${year}-${month}-${day}`;
  }

  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split(/[\/-]/);
    return `${year}-${monthRaw.padStart(2, "0")}-${dayRaw.padStart(2, "0")}`;
  }

  const parsedDate = new Date(raw);

  if (!Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(parsedDate);
  }

  return "";
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
