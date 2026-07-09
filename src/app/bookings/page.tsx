"use client";

import { supabase } from "@/lib/supabase/client";
import BookingAdvancedTable from "@/components/BookingAdvancedTable";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type DbRow = Record<string, any>;

type FilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "empty"
  | "not_empty"
  | "before"
  | "after";

type FilterCondition = {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
};

const bookingTypeOptions = [
  "Booking vid",
  "Booking live",
  "Booking vid+live",
  "Quà Tết",
  "Quà Tri Ân",
  "Quà Sinh Nhật",
];

const legacyContentBookingTypes = ["Booking mới"];
const legacyGiftBookingTypes = ["Tặng quà"];

const pageSizeOptions = [100, 200, 300];

const filterFields = [
  { value: "koc", label: "KOC / ID TikTok" },
  { value: "koc_name", label: "Tên KOC" },
  { value: "koc_address", label: "Địa chỉ KOC" },
  { value: "koc_phone", label: "SĐT/Zalo KOC" },
  { value: "employee", label: "PIC phụ trách" },
  { value: "booking_type", label: "Loại booking" },
  { value: "status_booking", label: "Status booking" },
  { value: "product", label: "Sản phẩm" },
  { value: "note", label: "Ghi chú" },
  { value: "cast_price", label: "Giá cast" },
  { value: "created_at", label: "Ngày tạo booking" },
  { value: "expected_post_date", label: "Ngày dự kiến đăng" },
  { value: "actual_post_date", label: "Ngày đăng thực tế" },
];

const filterOperators = [
  { value: "contains", label: "Chứa" },
  { value: "equals", label: "Bằng" },
  { value: "not_equals", label: "Khác" },
  { value: "empty", label: "Trống" },
  { value: "not_empty", label: "Không trống" },
  { value: "before", label: "Trước ngày" },
  { value: "after", label: "Sau ngày" },
];

export default function BookingListPage() {
  const [bookings, setBookings] = useState<DbRow[]>([]);
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [resetColumnSignal, setResetColumnSignal] = useState(0);

  const [filters, setFilters] = useState<FilterCondition[]>([
    {
      id: createFilterId(),
      field: "koc",
      operator: "contains",
      value: "",
    },
  ]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const [bookingResult, employeeResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10000),

        supabase
          .from("employees")
          .select("id, employee_code, full_name, email, phone, role, active, manager_id")
          .eq("active", true)
          .order("employee_code", { ascending: true })
          .limit(2000),
      ]);

      if (bookingResult.error) {
        setMessage(`Lỗi tải Booking: ${bookingResult.error.message}`);
        setBookings([]);
        setKocs([]);
      } else {
        const bookingRows = bookingResult.data || [];
        setBookings(bookingRows);

        const kocIds = Array.from(
          new Set(
            bookingRows
              .map((booking) => String(booking.koc_id || "").trim())
              .filter(Boolean)
          )
        );

        if (kocIds.length > 0) {
          const kocResult = await loadKocsByIds(kocIds);

          if (kocResult.error) {
            setMessage(`Lỗi tải tên KOC cho Booking: ${kocResult.error}`);
            setKocs([]);
          } else {
            setKocs(kocResult.rows);
          }
        } else {
          setKocs([]);
        }
      }

      if (employeeResult.error) {
        setMessage(`Lỗi tải PIC: ${employeeResult.error.message}`);
        setEmployees([]);
      } else {
        setEmployees(employeeResult.data || []);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const kocMap = useMemo(() => {
    const map = new Map<string, DbRow>();

    kocs.forEach((koc) => {
      if (koc.id) {
        map.set(String(koc.id), koc);
      }
    });

    return map;
  }, [kocs]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, DbRow>();

    employees.forEach((employee) => {
      if (employee.id) {
        map.set(String(employee.id), employee);
      }
    });

    return map;
  }, [employees]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      return filters.every((condition) => {
        if (
          ["empty", "not_empty"].includes(condition.operator) === false &&
          !condition.value.trim()
        ) {
          return true;
        }

        return matchBookingCondition(
          booking,
          condition,
          kocMap,
          employeeMap
        );
      });
    });
  }, [bookings, filters, kocMap, employeeMap]);

  useEffect(() => {
    setPageIndex(0);
  }, [filters, pageSize]);

  const totalBookingCount = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalBookingCount / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageStart = safePageIndex * pageSize;
  const pageEnd = pageStart + pageSize;
  const currentPageBookings = filteredBookings.slice(pageStart, pageEnd);

  const currentPageCount = currentPageBookings.length;
  const startRow = totalBookingCount === 0 ? 0 : pageStart + 1;
  const endRow = Math.min(pageEnd, totalBookingCount);

  const contentBookingCount = currentPageBookings.filter((booking) =>
    isContentBookingType(booking.booking_type)
  ).length;

  const giftBookingCount = currentPageBookings.filter((booking) =>
    isGiftBookingType(booking.booking_type)
  ).length;

  const paidCount = currentPageBookings.filter(
    (booking) => booking.status_booking === "Đã thanh toán"
  ).length;

  function updateFilter(id: string, patch: Partial<FilterCondition>) {
    setFilters((current) =>
      current.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition
      )
    );
  }

  function addFilter() {
    setFilters((current) => [
      ...current,
      {
        id: createFilterId(),
        field: "koc",
        operator: "contains",
        value: "",
      },
    ]);
  }

  function removeFilter(id: string) {
    setFilters((current) => {
      if (current.length === 1) {
        return [
          {
            id: createFilterId(),
            field: "koc",
            operator: "contains",
            value: "",
          },
        ];
      }

      return current.filter((condition) => condition.id !== id);
    });
  }

  function clearFilters() {
    setFilters([
      {
        id: createFilterId(),
        field: "koc",
        operator: "contains",
        value: "",
      },
    ]);
    setPageIndex(0);
  }

  function goPreviousPage() {
    setPageIndex((current) => Math.max(0, current - 1));
  }

  function goNextPage() {
    setPageIndex((current) => Math.min(totalPages - 1, current + 1));
  }

  function exportBookingExcel() {
    const exportRows = currentPageBookings.map((booking) => {
      const koc = booking.koc_id ? kocMap.get(String(booking.koc_id)) : null;

      const employee = booking.employee_id
        ? employeeMap.get(String(booking.employee_id))
        : null;

      return {
        KOC: getKocDisplayName(koc),
        "ID TikTok/Tên FB": koc?.Id_tiktok_Ten_fb || "",
        "Tên KOC": koc?.name || "",
        "Địa chỉ": koc?.address || "",
        "SĐT/Zalo": koc?.phone || "",
        "PIC phụ trách": getEmployeeDisplayName(employee),
        "Loại booking": booking.booking_type || "",
        "Status booking": booking.status_booking || "",
        "Giá cast": booking.cast_price ? Number(booking.cast_price) : "",
        "Ngày tạo booking": formatDate(booking.created_at),
        "Ngày dự kiến đăng": formatDate(booking.expected_post_date),
        "Ngày đăng thực tế": formatDate(booking.actual_post_date),
        "Sản phẩm": booking.product || "",
        "Ghi chú": booking.note || "",
      };
    });

    if (exportRows.length === 0) {
      alert("Không có dữ liệu Booking để xuất Excel.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 28 },
      { wch: 24 },
      { wch: 42 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 48 },
      { wch: 48 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sach Booking");

    XLSX.writeFile(
      workbook,
      `danh-sach-booking-trang-${safePageIndex + 1}-${getTodayForFileName()}.xlsx`
    );
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-3 rounded-[18px] border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-base">
              📦
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase leading-[1.3] tracking-[0.22em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[20px] font-bold leading-tight tracking-normal text-slate-950 md:text-[22px]">
                Danh sách Booking
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setResetColumnSignal((current) => current + 1)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Reset cột
            </button>

            <button
              type="button"
              onClick={exportBookingExcel}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Xuất Excel trang này
            </button>

            <Link
              href="/bookings/new"
              className="flex h-10 items-center rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
            >
              + Tạo Booking
            </Link>
          </div>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {message}
        </div>
      )}

      <section className="mb-4 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] font-bold text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Booking đang hiển thị:{" "}
              <b className="text-slate-950">{currentPageCount}</b>
            </span>

            <span className="text-slate-300">|</span>

            <span>
              Tổng Booking theo bộ lọc:{" "}
              <b className="text-slate-950">{totalBookingCount}</b>
            </span>

            <span className="text-slate-300">|</span>

            <span>
              Trang:{" "}
              <b className="text-slate-950">
                {safePageIndex + 1}/{totalPages}
              </b>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span>
              Booking nội dung:{" "}
              <b className="text-emerald-600">{contentBookingCount}</b>
            </span>

            <span className="text-slate-300">|</span>

            <span>
              Booking quà: <b className="text-orange-600">{giftBookingCount}</b>{" "}
              <span className="font-semibold text-slate-400">
                (Đã thanh toán: {paidCount})
              </span>
            </span>
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="space-y-3">
          {filters.map((condition, index) => {
            const showValueInput = !["empty", "not_empty"].includes(
              condition.operator
            );

            return (
              <div
                key={condition.id}
                className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_0.85fr_1.35fr_auto] xl:items-end"
              >
                <div>
                  {index === 0 && (
                    <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">
                      Trường cần lọc
                    </label>
                  )}

                  <select
                    value={condition.field}
                    onChange={(event) =>
                      updateFilter(condition.id, {
                        field: event.target.value,
                        value: "",
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
                  >
                    {filterFields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {index === 0 && (
                    <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">
                      Điều kiện
                    </label>
                  )}

                  <select
                    value={condition.operator}
                    onChange={(event) =>
                      updateFilter(condition.id, {
                        operator: event.target.value as FilterOperator,
                        value: "",
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
                  >
                    {filterOperators.map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {index === 0 && (
                    <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">
                      Giá trị
                    </label>
                  )}

                  <input
                    value={condition.value}
                    disabled={!showValueInput}
                    onChange={(event) =>
                      updateFilter(condition.id, {
                        value: event.target.value,
                      })
                    }
                    placeholder={showValueInput ? "Nhập từ khóa..." : "Không cần nhập"}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {index === 0 ? (
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={addFilter}
                      className="h-10 shrink-0 rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
                    >
                      + Thêm điều kiện
                    </button>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="h-10 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeFilter(condition.id)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Xóa
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <BookingAdvancedTable
        bookings={currentPageBookings}
        totalBookings={totalBookingCount}
        kocs={kocs}
        employees={employees}
        loading={loading}
        resetLayoutSignal={resetColumnSignal}
        onBookingUpdated={(id, patch) => {
          setBookings((prev) =>
            prev.map((item) =>
              String(item.id) === String(id) ? { ...item, ...patch } : item
            )
          );
        }}
        onBookingDeleted={(ids) => {
          const deleteSet = new Set(ids.map(String));
          setBookings((prev) =>
            prev.filter((booking) => !deleteSet.has(String(booking.id)))
          );
        }}
      />

      <section className="sticky bottom-0 z-[200] mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="text-[13px] font-bold text-slate-700">
            Đang xem:{" "}
            <span className="text-slate-950">
              {startRow} - {endRow}
            </span>{" "}
            / {totalBookingCount} booking
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none focus:border-[#3964ff]"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} dòng/trang
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={goPreviousPage}
              disabled={safePageIndex === 0}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Trang trước
            </button>

            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-800">
              Trang {safePageIndex + 1}/{totalPages}
            </div>

            <button
              type="button"
              onClick={goNextPage}
              disabled={safePageIndex >= totalPages - 1}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trang sau →
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

async function loadKocsByIds(kocIds: string[]) {
  const rows: DbRow[] = [];
  const chunkSize = 300;

  for (let index = 0; index < kocIds.length; index += chunkSize) {
    const chunk = kocIds.slice(index, index + chunkSize);

    const { data, error } = await supabase
      .from("koc")
      .select("id, Id_tiktok_Ten_fb, name, koc_code, phone, address")
      .in("id", chunk);

    if (error) {
      return {
        rows: [],
        error: error.message,
      };
    }

    rows.push(...(data || []));
  }

  return {
    rows,
    error: "",
  };
}

function matchBookingCondition(
  booking: DbRow,
  condition: FilterCondition,
  kocMap: Map<string, DbRow>,
  employeeMap: Map<string, DbRow>
) {
  const rawValue = getBookingFieldValue(booking, condition.field, kocMap, employeeMap);
  const targetValue = condition.value;
  const rawText = normalizeText(rawValue);
  const targetText = normalizeText(targetValue);

  if (condition.operator === "empty") return rawText === "";
  if (condition.operator === "not_empty") return rawText !== "";

  if (["created_at", "expected_post_date", "actual_post_date"].includes(condition.field)) {
    const rawDate = toDateKey(rawValue);
    const targetDate = parseDateInputToKey(targetValue);

    if (!rawDate || !targetDate) return false;

    if (condition.operator === "before") return rawDate < targetDate;
    if (condition.operator === "after") return rawDate > targetDate;
    if (condition.operator === "equals") return rawDate === targetDate;
    if (condition.operator === "not_equals") return rawDate !== targetDate;

    return rawDate.includes(targetDate);
  }

  if (condition.operator === "equals") return rawText === targetText;
  if (condition.operator === "not_equals") return rawText !== targetText;

  return rawText.includes(targetText);
}

function getBookingFieldValue(
  booking: DbRow,
  field: string,
  kocMap: Map<string, DbRow>,
  employeeMap: Map<string, DbRow>
) {
  const koc = booking.koc_id ? kocMap.get(String(booking.koc_id)) : null;
  const employee = booking.employee_id
    ? employeeMap.get(String(booking.employee_id))
    : null;

  if (field === "koc") {
    return [
      getKocDisplayName(koc),
      koc?.Id_tiktok_Ten_fb,
      koc?.name,
      koc?.address,
      koc?.koc_code,
      koc?.phone,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (field === "koc_name") {
    return koc?.name || "";
  }

  if (field === "koc_address") {
    return koc?.address || "";
  }

  if (field === "koc_phone") {
    return koc?.phone || "";
  }

  if (field === "employee") {
    return getEmployeeDisplayName(employee);
  }

  return booking[field] ?? "";
}

function isContentBookingType(value: unknown) {
  const raw = String(value || "").trim();

  return [...bookingTypeOptions.slice(0, 3), ...legacyContentBookingTypes].includes(raw);
}

function isGiftBookingType(value: unknown) {
  const raw = String(value || "").trim();

  return [...bookingTypeOptions.slice(3), ...legacyGiftBookingTypes].includes(raw);
}

function getKocDisplayName(koc?: DbRow | null) {
  if (!koc) return "Chưa rõ KOC";

  return (
    koc.Id_tiktok_Ten_fb ||
    koc.name ||
    koc.koc_code ||
    koc.phone ||
    "Chưa rõ KOC"
  );
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

function normalizeText(value: unknown) {
  return removeVietnamese(String(value || ""))
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function parseDateInputToKey(value: unknown) {
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

  return "";
}

function toDateKey(value: unknown) {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const date = new Date(raw);

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
  }

  const shortDate = raw.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) return shortDate;

  return "";
}

function formatDate(value: unknown) {
  const dateKey = toDateKey(value);

  if (!dateKey) return "";

  const [year, month, day] = dateKey.split("-");

  return `${day}/${month}/${year}`;
}

function getTodayForFileName() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function createFilterId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function removeVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

