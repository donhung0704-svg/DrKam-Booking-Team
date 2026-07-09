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
  kocCreated: number;
  kocCare: number;
  bookingCreated: number;
  bookingNew: number;
  bookingGift: number;
  videoPosted: number;
  paid: number;
  castTotal: number;
};

const contentBookingTypes = [
  "Booking vid",
  "Booking live",
  "Booking vid+live",
  "Booking mới",
];

const giftBookingTypes = [
  "Quà Tết",
  "Quà Tri Ân",
  "Quà Sinh Nhật",
  "Tặng quà",
];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isContentBookingType(value: unknown) {
  return contentBookingTypes.includes(normalizeText(value));
}

function isGiftBookingType(value: unknown) {
  return giftBookingTypes.includes(normalizeText(value));
}

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDisplay());
  const [bookings, setBookings] = useState<DbRow[]>([]);
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const [bookingResult, kocResult, employeeResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20000),

        supabase
          .from("koc")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20000),

        supabase
          .from("employees")
          .select("id, employee_code, full_name, email, phone, role, active, manager_id")
          .eq("active", true)
          .order("employee_code", { ascending: true })
          .limit(2000),
      ]);

      if (bookingResult.error) {
        setMessage(`Lỗi tải Booking: ${bookingResult.error.message}`);
      } else {
        setBookings(bookingResult.data || []);
      }

      if (kocResult.error) {
        setMessage(`Lỗi tải KOC: ${kocResult.error.message}`);
      } else {
        setKocs(kocResult.data || []);
      }

      if (employeeResult.error) {
        setMessage(`Lỗi tải nhân sự: ${employeeResult.error.message}`);
      } else {
        setEmployees(employeeResult.data || []);
      }

      setLoading(false);
    }

    loadData();
  }, []);

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
    const targetDate = parseDisplayDateToKey(selectedDate);
    const rowMap = new Map<string, ReportRow>();

    if (!targetDate) {
      return [];
    }

    function ensureRow(employeeId: string) {
      const key = employeeId || "no-pic";

      if (!rowMap.has(key)) {
        const employee = employeeId ? employeeMap.get(employeeId) : null;

        rowMap.set(key, {
          employeeId: key,
          employeeName: employee
            ? getEmployeeDisplayName(employee)
            : "Chưa có PIC",
          kocCreated: 0,
          kocCare: 0,
          bookingCreated: 0,
          bookingNew: 0,
          bookingGift: 0,
          videoPosted: 0,
          paid: 0,
          castTotal: 0,
        });
      }

      return rowMap.get(key)!;
    }

    employees.forEach((employee) => {
      ensureRow(String(employee.id));
    });

    kocs.forEach((koc) => {
      const employeeId = String(koc.employee_id || "");
      const row = ensureRow(employeeId);

      if (toVietnamDateKey(koc.created_at) === targetDate) {
        row.kocCreated += 1;
      }

      if (toVietnamDateKey(koc.new_contact_date) === targetDate) {
        row.kocCare += 1;
      }
    });

    bookings.forEach((booking) => {
      const employeeId = String(booking.employee_id || "");
      const row = ensureRow(employeeId);

      if (toVietnamDateKey(booking.created_at) === targetDate) {
        row.bookingCreated += 1;

        if (isContentBookingType(booking.booking_type)) {
          row.bookingNew += 1;
        }

        if (isGiftBookingType(booking.booking_type)) {
          row.bookingGift += 1;
        }

        row.castTotal += parseNumber(booking.cast_price);
      }

      if (
        booking.status_booking === "Đã đăng video" &&
        toVietnamDateKey(booking.actual_post_date) === targetDate
      ) {
        row.videoPosted += 1;
      }

      if (
        booking.status_booking === "Đã thanh toán" &&
        toVietnamDateKey(booking.actual_post_date || booking.created_at) ===
          targetDate
      ) {
        row.paid += 1;
      }
    });

    return Array.from(rowMap.values())
      .filter((row) => {
        return (
          row.kocCreated > 0 ||
          row.kocCare > 0 ||
          row.bookingCreated > 0 ||
          row.videoPosted > 0 ||
          row.paid > 0 ||
          row.castTotal > 0 ||
          row.employeeName !== "Chưa có PIC"
        );
      })
      .sort((a, b) => {
        if (a.employeeName === "Chưa có PIC") return 1;
        if (b.employeeName === "Chưa có PIC") return -1;
        return a.employeeName.localeCompare(b.employeeName, "vi");
      });
  }, [bookings, kocs, employees, employeeMap, selectedDate]);

  const totals = useMemo(() => {
    return reportRows.reduce(
      (total, row) => {
        total.kocCreated += row.kocCreated;
        total.kocCare += row.kocCare;
        total.bookingCreated += row.bookingCreated;
        total.bookingNew += row.bookingNew;
        total.bookingGift += row.bookingGift;
        total.videoPosted += row.videoPosted;
        total.paid += row.paid;
        total.castTotal += row.castTotal;

        return total;
      },
      {
        kocCreated: 0,
        kocCare: 0,
        bookingCreated: 0,
        bookingNew: 0,
        bookingGift: 0,
        videoPosted: 0,
        paid: 0,
        castTotal: 0,
      }
    );
  }, [reportRows]);

  function exportExcel() {
    const exportRows = reportRows.map((row) => ({
      PIC: row.employeeName,
      "KOC tạo mới": row.kocCreated,
      "KOC chăm sóc": row.kocCare,
      "Booking tạo mới": row.bookingCreated,
      "Booking nội dung": row.bookingNew,
      "Booking quà": row.bookingGift,
      "Video đã đăng": row.videoPosted,
      "Đã thanh toán": row.paid,
      "Tổng giá cast": row.castTotal,
    }));

    if (exportRows.length === 0) {
      alert("Không có dữ liệu để xuất Excel.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    worksheet["!cols"] = [
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao cao ngay");

    XLSX.writeFile(
      workbook,
      `bao-cao-ngay-${selectedDate.replaceAll("/", "-")}.xlsx`
    );
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-6 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl">
              📊
            </div>

            <div>
              <p className="mb-3 text-[12px] font-bold uppercase leading-[1.4] tracking-[0.22em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[30px] font-bold leading-[1.35] tracking-normal text-slate-950 md:text-[34px]">
                Báo cáo KPI ngày
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Theo dõi KPI từng PIC trong ngày: KOC tạo mới, KOC chăm sóc,
                booking nội dung/quà, video đã đăng và thanh toán.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportExcel}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Xuất Excel
            </button>

            <Link
              href="/"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {message && (
        <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {message}
        </div>
      )}

      <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Chọn ngày báo cáo
            </label>

            <DatePickerInput
              name="selected_date"
              value={selectedDate}
              onChange={setSelectedDate}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
            />
          </div>

          <div className="flex items-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDisplay())}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Hôm nay
            </button>

            <button
              type="button"
              onClick={exportExcel}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Xuất báo cáo
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="👥"
          title="KOC tạo mới"
          value={totals.kocCreated}
          note="Theo ngày đã chọn"
          tone="blue"
        />

        <MetricCard
          icon="💬"
          title="KOC chăm sóc"
          value={totals.kocCare}
          note="Theo ngày CS gần nhất"
          tone="purple"
        />

        <MetricCard
          icon="📦"
          title="Booking tạo mới"
          value={totals.bookingCreated}
          note={`Nội dung: ${totals.bookingNew} | Quà: ${totals.bookingGift}`}
          tone="green"
        />

        <MetricCard
          icon="✅"
          title="Video/Thanh toán"
          value={`${totals.videoPosted}/${totals.paid}`}
          note={`Cast: ${formatMoney(totals.castTotal)}`}
          tone="orange"
        />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">
              Daily report
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              KPI theo PIC ngày {selectedDate}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Có{" "}
              <span className="font-bold text-slate-950">
                {reportRows.length}
              </span>{" "}
              dòng báo cáo.
            </p>
          </div>

          <button
            type="button"
            onClick={exportExcel}
            className="w-fit rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
          >
            Xuất Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead>
              <tr>
                <Th>PIC</Th>
                <Th>KOC tạo mới</Th>
                <Th>KOC chăm sóc</Th>
                <Th>Booking tạo mới</Th>
                <Th>Booking nội dung</Th>
                <Th>Booking quà</Th>
                <Th>Video đã đăng</Th>
                <Th>Đã thanh toán</Th>
                <Th>Tổng giá cast</Th>
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
                    Không có dữ liệu cho ngày này.
                  </td>
                </tr>
              )}

              {!loading &&
                reportRows.map((row) => (
                  <tr key={row.employeeId}>
                    <Td>
                      <span className="font-bold text-slate-950">
                        {row.employeeName}
                      </span>
                    </Td>
                    <Td>{row.kocCreated}</Td>
                    <Td>{row.kocCare}</Td>
                    <Td>{row.bookingCreated}</Td>
                    <Td>{row.bookingNew}</Td>
                    <Td>{row.bookingGift}</Td>
                    <Td>{row.videoPosted}</Td>
                    <Td>{row.paid}</Td>
                    <Td>{formatMoney(row.castTotal)}</Td>
                  </tr>
                ))}

              {!loading && reportRows.length > 0 && (
                <tr>
                  <td className="px-5 py-4 font-bold text-slate-950">
                    Tổng cộng
                  </td>
                  <td className="px-5 py-4 font-bold">{totals.kocCreated}</td>
                  <td className="px-5 py-4 font-bold">{totals.kocCare}</td>
                  <td className="px-5 py-4 font-bold">
                    {totals.bookingCreated}
                  </td>
                  <td className="px-5 py-4 font-bold">{totals.bookingNew}</td>
                  <td className="px-5 py-4 font-bold">{totals.bookingGift}</td>
                  <td className="px-5 py-4 font-bold">{totals.videoPosted}</td>
                  <td className="px-5 py-4 font-bold">{totals.paid}</td>
                  <td className="px-5 py-4 font-bold">
                    {formatMoney(totals.castTotal)}
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

function MetricCard({
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: string;
  title: string;
  value: number | string;
  note: string;
  tone: "blue" | "green" | "purple" | "orange";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "orange"
          ? "bg-orange-50 text-orange-700 border-orange-100"
          : "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-4 text-4xl font-bold tracking-normal text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-400">{note}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xl ${toneClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.08em] whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4 align-middle">{children}</td>;
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

function formatMoney(value: unknown) {
  const numberValue = Number(value || 0);

  return `${numberValue.toLocaleString("vi-VN")}đ`;
}

function getTodayDisplay() {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
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