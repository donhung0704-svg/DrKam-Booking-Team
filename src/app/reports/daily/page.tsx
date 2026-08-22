"use client";

import { supabase } from "@/lib/supabase/client";
import DatePickerInput from "@/components/DatePickerInput";
import PicFilter from "@/components/PicFilter";
import ResizableTh, { ResizeGroupContext } from "@/components/ResizableTh";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  giaCast: number;
  dailyVideoNew: number;
  dailyVideoOld: number;
  gmvNgay: number;
};

// Status được coi là "chưa phản hồi" -> không tính vào cột Phản hồi
const notRespondedStatuses = ["Chờ phản hồi", "Đã phản hồi"];

const PIC_FILTER_KEY = "drkam_report_pic_filter";

export default function PicReportPage() {
  const [reportDate, setReportDate] = useState(getVietnamTodayDisplay());

  const [bookings, setBookings] = useState<DbRow[]>([]);
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Ghi chú CV theo từng PIC + ngày báo cáo (lưu ở bảng report_day_notes)
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState("");

  // Lọc cố định nhân sự hiển thị (null = chưa khởi tạo -> hiển thị tất cả)
  const [selectedPics, setSelectedPics] = useState<string[] | null>(null);

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

  // Tải ghi chú CV của ngày báo cáo đang chọn
  useEffect(() => {
    const dayKey = parseDisplayDateToKey(reportDate);
    if (!dayKey) {
      setNotes({});
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("report_day_notes")
        .select("employee_id, note")
        .eq("report_date", dayKey);

      if (cancelled || error) return;

      const map: Record<string, string> = {};
      (data || []).forEach((row) => {
        if (row.employee_id) map[String(row.employee_id)] = row.note || "";
      });
      setNotes(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [reportDate]);

  // Tải lựa chọn nhân sự đã lưu
  useEffect(() => {
    const saved = window.localStorage.getItem(PIC_FILTER_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setSelectedPics(parsed.map(String));
    } catch {
      // bỏ qua dữ liệu hỏng
    }
  }, []);

  // Mặc định chọn tất cả nếu chưa có lựa chọn đã lưu
  useEffect(() => {
    if (selectedPics === null && employees.length > 0) {
      setSelectedPics(employees.map((employee) => String(employee.id)));
    }
  }, [employees, selectedPics]);

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
          employeeName: employee ? getEmployeeDisplayName(employee) : "Khác",
          isRealPic: Boolean(employee),
          lienHe: 0,
          phanHoi: 0,
          bookingMoi: 0,
          giaCast: 0,
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
      const isPic = employeeMap.has(String(koc.employee_id));

      // picRow: Liên hệ/Phản hồi tính theo PIC THẬT (không cần Booking date);
      // KOC không có PIC -> "Khác".
      const picRow = isPic ? ensureRow(String(koc.employee_id)) : ensureRow("");

      // perfRow: Video/GMV chỉ tính khi CÓ PIC hợp lệ + CÓ Booking date;
      // còn lại (PIC nhưng chưa Booking date; hoặc không PIC) -> "Khác".
      const perfRow =
        isPic && hasBookingDate(koc.booking_date)
          ? ensureRow(String(koc.employee_id))
          : ensureRow("");

      const createdKey = toVietnamDateKey(koc.created_at);
      const contactKey = toVietnamDateKey(koc.new_contact_date);
      const status = String(koc.status || "").trim();

      // Liên hệ = KOC tạo mới trong ngày + KOC có CS trong ngày nhưng NGÀY TẠO khác ngày báo cáo
      if (createdKey === dayKey) {
        picRow.lienHe += 1;
      } else if (contactKey === dayKey) {
        picRow.lienHe += 1;
      }

      // Phản hồi: KOC tạo mới trong ngày và Status khác Chờ phản hồi & Đã phản hồi
      if (createdKey === dayKey && !notRespondedStatuses.includes(status)) {
        picRow.phanHoi += 1;
      }

      // Booking mới = số KOC có ngày Booking (booking_date) = ngày báo cáo
      if (toVietnamDateKey(koc.booking_date) === dayKey) {
        perfRow.bookingMoi += 1;
      }

      // Video/GMV tính theo perfRow (PIC nếu có Booking date, ngược lại "Khác").
      const videoRow = perfRow;

      // Daily Videos(T-1): tách theo KOC mới (tier "Mới hoạt động") và KOC cũ
      const dailyVideos = parseNumber(koc.number_of_videos);
      if (String(koc.tier || "").trim() === "Mới hoạt động") {
        videoRow.dailyVideoNew += dailyVideos;
      } else {
        videoRow.dailyVideoOld += dailyVideos;
      }

      videoRow.gmvNgay += parseNumber(koc.gmv);
    });

    bookings.forEach((booking) => {
      const row = ensureRow(String(booking.employee_id || ""));

      // Giá Cast vẫn lấy từ bảng bookings (booking tạo trong ngày).
      // Booking mới đã chuyển sang đếm KOC có booking_date = ngày báo cáo (ở vòng lặp kocs).
      if (toVietnamDateKey(booking.created_at) === dayKey) {
        row.giaCast += parseNumber(booking.cast_price);
      }
    });

    const picFilterActive = selectedPics !== null;
    const selectedSet = new Set(selectedPics ?? []);

    return Array.from(rowMap.values())
      .filter((row) => {
        // Chỉ hiển thị nhân sự được chọn; nhóm "Chưa có PIC" hiện khi có số liệu
        if (row.isRealPic) {
          return !picFilterActive || selectedSet.has(row.employeeId);
        }

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
  }, [bookings, kocs, employees, employeeMap, reportDate, selectedPics]);

  const totals = useMemo(() => {
    return reportRows.reduce(
      (total, row) => {
        total.lienHe += row.lienHe;
        total.phanHoi += row.phanHoi;
        total.bookingMoi += row.bookingMoi;
        total.giaCast += row.giaCast;
        total.dailyVideoNew += row.dailyVideoNew;
        total.dailyVideoOld += row.dailyVideoOld;
        total.gmvNgay += row.gmvNgay;

        return total;
      },
      {
        lienHe: 0,
        phanHoi: 0,
        bookingMoi: 0,
        giaCast: 0,
        dailyVideoNew: 0,
        dailyVideoOld: 0,
        gmvNgay: 0,
      }
    );
  }, [reportRows]);

  function setToday() {
    setReportDate(getVietnamTodayDisplay());
  }

  function updateSelectedPics(next: string[]) {
    setSelectedPics(next);
    window.localStorage.setItem(PIC_FILTER_KEY, JSON.stringify(next));
  }

  function updateNote(employeeId: string, value: string) {
    setNotes((prev) => ({ ...prev, [employeeId]: value }));
  }

  async function saveNote(employeeId: string) {
    if (!employeeId || employeeId === "no-pic") return;

    const dayKey = parseDisplayDateToKey(reportDate);
    if (!dayKey) return;

    const note = (notes[employeeId] ?? "").trim();

    setSavingNoteId(employeeId);

    const { error } = await supabase.from("report_day_notes").upsert(
      {
        employee_id: employeeId,
        report_date: dayKey,
        note: note || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,report_date" }
    );

    setSavingNoteId("");

    if (error) {
      setMessage(`Lỗi lưu ghi chú: ${error.message}`);
    }
  }

  function exportExcel() {
    const exportRows = reportRows.map((row) => ({
      PIC: row.employeeName,
      "Liên hệ": row.lienHe,
      "Phản hồi": row.phanHoi,
      "Booking mới": row.bookingMoi,
      "Giá Cast": row.giaCast,
      "Daily Videos(T-1)": row.dailyVideoNew + row.dailyVideoOld,
      GMV: row.gmvNgay,
      "Ghi chú CV": row.isRealPic ? notes[row.employeeId] || "" : "",
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
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 40 },
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
                Báo cáo ngày
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

          <PicFilter
            employees={employees}
            selectedIds={selectedPics ?? []}
            onChange={updateSelectedPics}
          />

          <p className="text-[12px] font-semibold text-slate-400 md:ml-auto">
            Liên hệ / Phản hồi / Booking mới tính theo ngày đã chọn. Số video,
            GMV tính trên toàn bộ KOC phụ trách.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <ResizeGroupContext.Provider value="daily-main">
          <table className="report-table w-full table-fixed text-center text-sm">
            <thead>
              <tr className="bg-slate-50">
                <Th>PIC</Th>
                <Th>Liên hệ</Th>
                <Th>Phản hồi</Th>
                <Th>Booking mới</Th>
                <Th>Giá Cast</Th>
                <Th>Daily Videos(T-1)</Th>
                <Th>GMV</Th>
                <Th>Ghi chú CV</Th>
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
                    <Td>{formatMoney(row.giaCast)}</Td>
                    <Td>
                      {formatNumber(row.dailyVideoNew + row.dailyVideoOld)}
                    </Td>
                    <Td>{formatMoney(row.gmvNgay)}</Td>
                    <Td>
                      {row.isRealPic ? (
                        <NoteTextarea
                          value={notes[row.employeeId] || ""}
                          onChange={(value) =>
                            updateNote(row.employeeId, value)
                          }
                          onBlur={() => saveNote(row.employeeId)}
                        />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>
                  </tr>
                ))}

              {!loading && reportRows.length > 0 && (
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-2 py-4 font-bold text-slate-950">
                    Tổng cộng
                  </td>
                  <td className="px-2 py-4 font-bold">{totals.lienHe}</td>
                  <td className="px-2 py-4 font-bold">{totals.phanHoi}</td>
                  <td className="px-2 py-4 font-bold">{totals.bookingMoi}</td>
                  <td className="px-2 py-4 font-bold">
                    {formatMoney(totals.giaCast)}
                  </td>
                  <td className="px-2 py-4 font-bold">
                    {formatNumber(totals.dailyVideoNew + totals.dailyVideoOld)}
                  </td>
                  <td className="px-2 py-4 font-bold">
                    {formatMoney(totals.gmvNgay)}
                  </td>
                  <td className="px-2 py-4 text-[12px] font-semibold text-slate-400">
                    {savingNoteId ? "Đang lưu…" : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </ResizeGroupContext.Provider>
        </div>
      </section>
    </section>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <ResizableTh className="border-b border-slate-200 px-2 py-2 text-center align-middle text-[11px] font-black uppercase tracking-[0.04em] text-slate-700">
      {children}
    </ResizableTh>
  );
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="border-b border-slate-100 px-2 py-3 align-middle text-[13px]">
      {children}
    </td>
  );
}

// Ô ghi chú: textarea tự giãn chiều cao theo nội dung, xuống dòng, không che chữ
function NoteTextarea({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  // Giãn đúng chiều cao khi có sẵn nội dung (mở trang / đổi ngày)
  useEffect(() => {
    autoResize(ref.current);
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(event) => {
        onChange(event.target.value);
        autoResize(event.currentTarget);
      }}
      onBlur={onBlur}
      placeholder="Ghi chú công việc…"
      className="block w-full min-h-[36px] resize-none overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[13px] leading-5 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
    />
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

// Booking date được coi là "không trống" khi có giá trị thực (khác rỗng và "-")
function hasBookingDate(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw !== "" && raw !== "-";
}

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatMoney(value: unknown) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
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
