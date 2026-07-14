"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type DbRow = Record<string, any>;
type ExcelRow = Record<string, any>;

const bookingTypeOptions = [
  "Booking vid",
  "Booking live",
  "Booking vid+live",
  "Quà Tết",
  "Quà Tri Ân",
  "Quà Sinh Nhật",
];

const statusBookingOptions = [
  "Chờ nhận SP",
  "Đang lên video",
  "Đã đăng video",
  "Đã thanh toán",
];

// Danh sách sản phẩm có sẵn (đồng bộ với BookingAdvancedTable).
// Dùng để tự tách ô "Sản phẩm" trong Excel thành nhiều SP đã chọn.
const productOptions = [
  "Nước súc miệng CYK",
  "Nước súc miệng Postbiotic",
  "Xịt miệng Plus",
  "Gel cạo lưỡi bạc hà",
  "Gel cạo lưỡi dưa lưới",
  "Kem đánh răng bạc hà",
  "Kem đánh răng cam",
  "Bàn chải ULTRASOFT",
  "Bộ cạo lưỡi nhựa",
];

export default function ImportBookingPage() {
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  // Kiểu ngày cho ô ngày dạng TEXT không rõ ràng (cả 2 số đều <= 12).
  // "dmy" = Ngày/Tháng (kiểu VN, mặc định), "mdy" = Tháng/Ngày (kiểu Mỹ).
  // Số > 12 luôn tự nhận đúng là ngày, không phụ thuộc lựa chọn này.
  const [dateFormat, setDateFormat] = useState<"mdy" | "dmy">("dmy");
  const preferMonthFirst = dateFormat === "mdy";

  useEffect(() => {
    async function loadData() {
      const [kocResult, employeeResult] = await Promise.all([
        loadAllKocsForBookingImport(),

        supabase
          .from("employees")
          .select("id, employee_code, full_name, email, phone, role, active, manager_id")
          .limit(2000),
      ]);

      setKocs(kocResult.data || []);
      setEmployees(employeeResult.data || []);
    }

    loadData();
  }, []);

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

  const kocMap = useMemo(() => createKocMap(kocs), [kocs]);
  const employeeMap = useMemo(() => createEmployeeMap(employees), [employees]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setMessage("");
    setRows([]);
    setFileName("");

    if (!file) return;

    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // raw:true -> ô ngày thật trả về SERIAL NUMBER (số tuyệt đối, không thể
      // nhầm mm/dd, không lệch timezone). optionalDate() sẽ tự convert serial.
      // Ô ngày dạng TEXT vẫn là chuỗi -> parse dd/mm như thường.
      const parsedRows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
        defval: "",
        raw: true,
      });

      setRows(parsedRows);
      setMessage(`Đã đọc ${parsedRows.length} dòng từ file Excel.`);
    } catch (error: any) {
      setMessage(`Lỗi đọc file Excel: ${error.message}`);
    }
  }
function downloadBookingTemplate() {
  const templateRows = [
    {
      "ID TikTok/Tên FB": "koc_nguyena",
      "PIC phụ trách": "NV001",
      "Loại booking": "Booking vid",
      "Status booking": "Chờ nhận SP",
      "Giá cast": 300000,
      "Ngày tạo booking": "22/06/2026",
      "Ngày dự kiến đăng": "25/06/2026",
      "Ngày đăng thực tế": "",
      "Sản phẩm": "Nước súc miệng DrKam, Xịt miệng DrKam Plus",
      "Ghi chú": "Booking mẫu",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);

  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 48 },
    { wch: 48 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mau import Booking");

  XLSX.writeFile(workbook, "mau-import-booking-drkam.xlsx");
}
  async function handleImport() {
    if (rows.length === 0) {
      setMessage("Vui lòng chọn file Excel trước khi import.");
      return;
    }

    setImporting(true);
    setMessage("");

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      const kocId = resolveKocId(row, kocMap);
      const employeeId = resolveEmployeeId(row, employeeMap);

      if (!kocId) {
        skipped += 1;
        errors.push(`Dòng ${index + 2}: Không tìm thấy KOC theo ID TikTok/Tên FB`);
        continue;
      }

      const payload = cleanUndefined({
        koc_id: kocId,
        employee_id: employeeId || null,
        booking_type:
          matchOption(
            pick(row, ["Loại booking", "Booking type", "booking_type"]),
            bookingTypeOptions
          ) || "Booking vid",
        status_booking: matchOption(
          pick(row, ["Status booking", "status_booking"]),
          statusBookingOptions
        ),
        cast_price: optionalNumber(pick(row, ["Giá cast", "Cast price", "cast_price"])),
        created_at:
          optionalDate(
            pick(row, ["Ngày tạo booking", "Created at", "created_at"]),
            preferMonthFirst
          ) || getVietnamTodayDateKey(),
        expected_post_date: optionalDate(
          pick(row, [
            "Ngày dự kiến đăng",
            "Expected post date",
            "expected_post_date",
          ]),
          preferMonthFirst
        ),
        actual_post_date: optionalDate(
          pick(row, [
            "Ngày đăng thực tế",
            "Actual post date",
            "actual_post_date",
          ]),
          preferMonthFirst
        ),
        product: resolveProducts(pick(row, ["Sản phẩm", "Product", "product"])),
        note: optionalText(pick(row, ["Ghi chú", "Note", "note"])),
      });

      const { error } = await supabase.from("bookings").insert(payload);

      if (error) {
        errors.push(`Dòng ${index + 2}: ${error.message}`);
      } else {
        inserted += 1;
      }
    }

    setImporting(false);

    const errorText =
      errors.length > 0
        ? ` Lỗi ${errors.length} dòng: ${errors.slice(0, 4).join(" | ")}`
        : "";

    setMessage(`Import xong: thêm mới ${inserted}, bỏ qua ${skipped}.${errorText}`);
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-6 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl">
              📥
            </div>

            <div>
              <p className="mb-3 text-[12px] font-bold uppercase leading-[1.4] tracking-[0.22em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[30px] font-bold leading-[1.35] tracking-normal text-slate-950 md:text-[34px]">
                Import Booking từ Excel
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Nhập booking hàng loạt từ Excel. Hệ thống chỉ dò KOC theo
                ID TikTok/Tên FB để tránh nhận nhầm dữ liệu.
              </p>
            </div>
          </div>

          <Link
            href="/bookings"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Về danh sách Booking
          </Link>
        </div>
      </header>

      {message && (
        <div className="mb-5 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-700">
          {message}
        </div>
      )}

      <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Chọn file Excel</h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          File bắt buộc nên có cột ID TikTok/Tên FB. Hệ thống chỉ dùng cột này để tìm đúng KOC.
        </p>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || rows.length === 0}
            className="rounded-2xl bg-[#3964ff] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#2f55df] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? "Đang import..." : "Import Booking"}
          </button>
<button
  type="button"
  onClick={downloadBookingTemplate}
  className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
>
  Tải mẫu Excel
</button>
        </div>

        {fileName && (
          <p className="mt-4 text-sm font-semibold text-slate-600">
            File đã chọn: <span className="text-slate-950">{fileName}</span>
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-bold text-amber-800">
            Định dạng ngày trong file Excel
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-700">
            Chỉ ảnh hưởng ô ngày dạng chữ mà cả 2 số đều ≤ 12 (vd 6/12). Số &gt; 12
            luôn tự nhận đúng là ngày. Ô ngày thật của Excel luôn đọc chính xác.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                dateFormat === "dmy"
                  ? "border-amber-400 bg-white text-amber-900 shadow-sm"
                  : "border-amber-200 bg-amber-50/40 text-amber-700"
              }`}
            >
              <input
                type="radio"
                name="dateFormat"
                checked={dateFormat === "dmy"}
                onChange={() => setDateFormat("dmy")}
                className="h-4 w-4 accent-amber-500"
              />
              Ngày/Tháng — dd/mm (kiểu VN). Vd 01/07 = 1 tháng 7
            </label>

            <label
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                dateFormat === "mdy"
                  ? "border-amber-400 bg-white text-amber-900 shadow-sm"
                  : "border-amber-200 bg-amber-50/40 text-amber-700"
              }`}
            >
              <input
                type="radio"
                name="dateFormat"
                checked={dateFormat === "mdy"}
                onChange={() => setDateFormat("mdy")}
                className="h-4 w-4 accent-amber-500"
              />
              Tháng/Ngày — mm/dd (kiểu Mỹ). Vd 01/07 = 7 tháng 1
            </label>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Cột Excel hỗ trợ</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            "ID TikTok/Tên FB",
            "PIC phụ trách",
            "Loại booking",
            "Status booking",
            "Giá cast",
            "Ngày tạo booking",
            "Ngày dự kiến đăng",
            "Ngày đăng thực tế",
            "Sản phẩm",
            "Ghi chú",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">
            Preview
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Xem trước dữ liệu
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Hiển thị 10 dòng đầu tiên. Tổng số dòng đọc được:{" "}
            <span className="font-bold text-slate-950">{rows.length}</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-left text-sm">
            <thead>
              <tr>
                <Th>ID TikTok trong Excel</Th>
                <Th>KOC tìm thấy</Th>
                <Th>PIC</Th>
                <Th>Loại booking</Th>
                <Th>Status booking</Th>
                <Th>Giá cast</Th>
                <Th>Ngày tạo booking</Th>
                <Th>Ngày dự kiến đăng</Th>
                <Th>Sản phẩm</Th>
              </tr>
            </thead>

            <tbody>
              {previewRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Chưa có dữ liệu preview.
                  </td>
                </tr>
              )}

              {previewRows.map((row, index) => {
                const kocId = resolveKocId(row, kocMap);
                const employeeId = resolveEmployeeId(row, employeeMap);

                return (
                  <tr key={index}>
                    <Td>{getKocTextFromRow(row) || "-"}</Td>
                    <Td>
                      {kocId ? (
                        <span className="font-bold text-emerald-700">
                          Đã khớp KOC
                        </span>
                      ) : (
                        <span className="font-bold text-red-600">
                          Chưa tìm thấy
                        </span>
                      )}
                    </Td>
                    <Td>
                      {employeeId ? (
                        <span className="font-bold text-emerald-700">
                          Đã khớp PIC
                        </span>
                      ) : (
                        <span className="font-bold text-slate-400">
                          Chưa có PIC
                        </span>
                      )}
                    </Td>
                    <Td>
                      {text(
                        pick(row, [
                          "Loại booking",
                          "Booking type",
                          "booking_type",
                        ])
                      ) || "-"}
                    </Td>
                    <Td>
                      {text(
                        pick(row, ["Status booking", "status_booking"])
                      ) || "-"}
                    </Td>
                    <Td>
                      {text(
                        pick(row, ["Giá cast", "Cast price", "cast_price"])
                      ) || "-"}
                    </Td>
                    <Td>
                      {optionalDate(
                        pick(row, [
                          "Ngày tạo booking",
                          "Created at",
                          "created_at",
                        ]),
                        preferMonthFirst
                      ) || "-"}
                    </Td>
                    <Td>
                      {optionalDate(
                        pick(row, [
                          "Ngày dự kiến đăng",
                          "Expected post date",
                          "expected_post_date",
                        ]),
                        preferMonthFirst
                      ) || "-"}
                    </Td>
                    <Td>{resolveProducts(pick(row, ["Sản phẩm", "Product", "product"])) || "-"}</Td>
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.08em] whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-4 align-middle">{children}</td>;
}


async function loadAllKocsForBookingImport() {
  const allRows: DbRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("koc")
      .select("id, Id_tiktok_Ten_fb")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return {
        data: null,
        error,
      };
    }

    const rows = data || [];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }
  }

  return {
    data: allRows,
    error: null,
  };
}

function createKocMap(kocs: DbRow[]) {
  const map = new Map<string, string>();

  kocs.forEach((koc) => {
    const id = String(koc.id || "");
    const key = normalizeKocTikTokId(koc.Id_tiktok_Ten_fb);

    if (key && id) {
      map.set(key, id);
    }
  });

  return map;
}

function createEmployeeMap(employees: DbRow[]) {
  const map = new Map<string, string>();

  employees.forEach((employee) => {
    const id = String(employee.id || "");

    [
      employee.id,
      employee.employee_code,
      employee.full_name,
      employee.email,
      employee.phone,
      employee.role,
    ].forEach((value) => {
      const key = normalizeLookup(value);
      if (key && id) map.set(key, id);
    });
  });

  return map;
}

function resolveKocId(row: ExcelRow, kocMap: Map<string, string>) {
  const key = normalizeKocTikTokId(
    pick(row, ["ID TikTok/Tên FB", "Id_tiktok_Ten_fb", "ID TikTok"])
  );

  if (key && kocMap.has(key)) {
    return kocMap.get(key);
  }

  return "";
}

function resolveEmployeeId(row: ExcelRow, employeeMap: Map<string, string>) {
  const candidates = [
    pick(row, ["PIC phụ trách", "PIC", "Nhân viên", "employee"]),
    pick(row, ["Mã nhân viên", "employee_code"]),
    pick(row, ["Email PIC", "email"]),
  ];

  for (const candidate of candidates) {
    const key = normalizeLookup(candidate);
    if (key && employeeMap.has(key)) return employeeMap.get(key);
  }

  return "";
}

function getKocTextFromRow(row: ExcelRow) {
  return text(
    pick(row, ["ID TikTok/Tên FB", "Id_tiktok_Ten_fb", "ID TikTok"])
  );
}

function getVietnamTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function pick(row: ExcelRow, keys: string[]) {
  const normalizedRow = new Map<string, any>();

  Object.entries(row).forEach(([key, value]) => {
    normalizedRow.set(normalizeHeader(key), value);
  });

  for (const key of keys) {
    const value = normalizedRow.get(normalizeHeader(key));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function cleanUndefined(payload: DbRow) {
  const clean: DbRow = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) clean[key] = value;
  });

  return clean;
}

function text(value: any) {
  return String(value || "").trim();
}

function optionalText(value: any) {
  const output = text(value);
  return output ? output : undefined;
}

// Dò các sản phẩm có sẵn xuất hiện trong ô "Sản phẩm" của Excel rồi nối bằng
// ", " để ô multi-select tự tách thành nhiều SP đã chọn (thay vì 1 SP gộp).
// Nếu không khớp SP có sẵn nào -> giữ nguyên text gốc để không mất dữ liệu.
function resolveProducts(value: any) {
  const raw = text(value);
  if (!raw) return undefined;

  const normalizedRaw = normalizeProductText(raw);

  const matched = productOptions.filter((option) =>
    normalizedRaw.includes(normalizeProductText(option))
  );

  return matched.length > 0 ? matched.join(", ") : raw;
}

function normalizeProductText(value: string) {
  return removeVietnamese(String(value || ""))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function optionalNumber(value: any) {
  const raw = text(value);
  if (!raw) return undefined;

  const cleaned = raw.replace(/\./g, "").replace(/,/g, "");
  const numberValue = Number(cleaned);

  return Number.isNaN(numberValue) ? undefined : numberValue;
}

function optionalDate(value: any, preferMonthFirst = false) {
  if (value === null || value === undefined || value === "") return undefined;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toVietnamDateKey(value);
  }

  if (typeof value === "number") {
    return excelSerialToDateKey(value);
  }

  const raw = text(value);
  if (!raw) return undefined;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(raw)) {
    const [p1, p2, yearRaw] = raw.split(/[\/-]/);
    const n1 = Number(p1);
    const n2 = Number(p2);

    let dayRaw: string;
    let monthRaw: string;

    if (n1 > 12 && n2 <= 12) {
      // Số đầu > 12 -> chắc chắn là NGÀY (dd/mm)
      dayRaw = p1;
      monthRaw = p2;
    } else if (n2 > 12 && n1 <= 12) {
      // Số sau > 12 -> chắc chắn là NGÀY (mm/dd)
      dayRaw = p2;
      monthRaw = p1;
    } else if (preferMonthFirst) {
      // Mập mờ (cả 2 <= 12) -> theo lựa chọn Tháng/Ngày (kiểu Mỹ)
      monthRaw = p1;
      dayRaw = p2;
    } else {
      // Mập mờ -> theo lựa chọn Ngày/Tháng (kiểu VN)
      dayRaw = p1;
      monthRaw = p2;
    }

    const year =
      yearRaw.length === 2 ? `20${yearRaw}` : yearRaw.padStart(4, "0");
    return `${year}-${monthRaw.padStart(2, "0")}-${dayRaw.padStart(2, "0")}`;
  }

  return undefined;
}

// Excel serial number -> "YYYY-MM-DD". Tự tính, KHÔNG phụ thuộc XLSX.SSF
// (SSF có thể undefined trong bundle). Serial là ngày tuyệt đối nên không bao
// giờ bị hoán đổi mm/dd hay lệch timezone.
function excelSerialToDateKey(serial: number) {
  if (!Number.isFinite(serial)) return undefined;

  // 25569 = số ngày từ mốc Excel (1899-12-30) tới 1970-01-01.
  const ms = Math.round((serial - 25569) * 86400000);
  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) return undefined;

  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toVietnamDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function matchOption(value: any, options: string[]) {
  const raw = normalizeLookup(value);
  if (!raw) return undefined;

  if (options.includes("Booking vid") && raw === normalizeLookup("Booking mới")) {
    return "Booking vid";
  }

  if (options.includes("Quà Tri Ân") && raw === normalizeLookup("Tặng quà")) {
    return "Quà Tri Ân";
  }

  return options.find((option) => normalizeLookup(option) === raw);
}

function normalizeHeader(value: any) {
  return removeVietnamese(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


function normalizeKocTikTokId(value: any) {
  let raw = removeVietnamese(String(value || ""))
    .toLowerCase()
    .trim();

  raw = raw
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, "")
    .replace(/^@/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "")
    .replace(/\s+/g, "");

  return raw;
}

function normalizeLookup(value: any) {
  return removeVietnamese(String(value || ""))
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function removeVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}