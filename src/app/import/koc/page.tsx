"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type DbRow = Record<string, any>;
type ExcelRow = Record<string, any>;

const tierOptions = [
  "VIP",
  "Tiềm năng",
  "Chăm chỉ",
  "Hoạt động lâu",
  "Mới hoạt động",
  "Ngủ đông",
  "Mất cast",
  "Dừng CS",
];
const statusOptions = ["Chờ phản hồi", "Đã phản hồi", "Cân nhắc", "Đã chốt", "Từ chối", "Trùng KOC"];
const channelTypeOptions = ["Người thật", "AI", "Unbox", "POV"];
const maritalStatusOptions = ["Đã kết hôn", "Đã có con"];
const platformOptions = ["TikTok", "FB", "Shopee"];

export default function ImportKocPage() {
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [campaigns, setCampaigns] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  // Tiến độ import theo lô (null = không chạy)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  useEffect(() => {
    async function loadData() {
      const [campaignResult, employeeResult] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .order("campaign_code", { ascending: false })
          .limit(1000),

        supabase
          .from("employees")
          .select("id, employee_code, full_name, email, phone, role, active, manager_id")
          .eq("active", true)
          .order("employee_code", { ascending: true })
          .limit(2000),
      ]);

      setCampaigns(campaignResult.data || []);
      setEmployees(employeeResult.data || []);
    }

    loadData();
  }, []);

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

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
        cellDates: false,
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // raw:false -> đọc ĐÚNG CHUỖI Excel đang hiển thị (WYSIWYG).
      // File thực tế trộn 2 kiểu ô Booking date / Ngày tạo:
      //  - ô text "13/01/2026" (dd/mm) -> giữ nguyên.
      //  - ô serial (vd 46357) mà Excel locale US đã hiểu "12/1" thành mm/dd
      //    -> serial tuyệt đối = 01/12, NHƯNG vẫn HIỂN THỊ "12/1/26".
      // Đọc chuỗi hiển thị rồi parse dd/mm sẽ khôi phục đúng ý người nhập
      // (12/01) thay vì lấy serial tuyệt đối bị lộn ngày/tháng.
      const parsedRows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
        defval: "",
        raw: false,
      });

      setRows(parsedRows);
      setMessage(`Đã đọc ${parsedRows.length} dòng từ file Excel.`);
    } catch (error: any) {
      setMessage(`Lỗi đọc file Excel: ${error.message}`);
    }
  }
function downloadKocTemplate() {
  const templateRows = [
    {
      "Ngày tạo": "22/06/2026",
      "PIC phụ trách": "EMP0001",
      "ID TikTok/Tên FB": "koc_nguyena",
      "Mã KOC": "KOC0001",
      "Tên KOC": "Nguyễn A",
      Follower: 12000,
      Tier: "Tiềm năng",
      Status: "Chờ phản hồi",
      "Nền tảng": "TikTok, Shopee",
      "Channel type": "Người thật",
      Email: "nguyena@gmail.com",
      "SĐT/Zalo": "0986016911",
      Address: "Hà Nội",
      Note: "KOC mới cần chăm sóc",
      "Booking date": "22/06/2026",
      "Date of birth": "01/01/2000",
      "Daily Videos(T-1)": 0,
      "Monthly Videos": 0,
      "Video có DT": 0,
      "Campaign name": "",
      "GMV ngày": 0,
      "GMV tháng": 0,
      "Marital status": "Đã có con",
      "CS gần nhất": "22/06/2026",
      "Link Facebook": "https://facebook.com/...",
      "Link TikTok": "https://tiktok.com/@...",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);

  worksheet["!cols"] = [
    { wch: 26 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
    { wch: 36 },
    { wch: 45 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 40 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mau import KOC");

  XLSX.writeFile(workbook, "mau-import-koc-drkam.xlsx");
}
  async function handleImport() {
    if (rows.length === 0) {
      setMessage("Vui lòng chọn file Excel trước khi import.");
      return;
    }

    setImporting(true);
    setMessage("");

    const { data: existingKocs, error: loadError } =
      await loadAllKocsForKocImport();

    if (loadError) {
      setMessage(`Lỗi tải KOC hiện có: ${loadError.message}`);
      setImporting(false);
      return;
    }

    // Khóa so khớp KHÔNG phân biệt hoa/thường: "Kawachan81" và "kawachan81"
    // là cùng một KOC (trước đây bị coi là 2 -> sinh bản ghi trùng).
    const existingMap = new Map<string, string>();

    (existingKocs || []).forEach((koc) => {
      const key = matchKeyFromIdText(normalizeKocIdText(koc.Id_tiktok_Ten_fb));
      if (key && !existingMap.has(key)) existingMap.set(key, String(koc.id));
    });

    const campaignMap = createCampaignMap(campaigns);
    const employeeMap = createEmployeeMap(employees);

    let skipped = 0;
    const errors: string[] = [];

    // ---- Bước 1: dựng toàn bộ payload trước (không gọi mạng) ----
    type Job = { excelRow: number; payload: DbRow; existingId?: string };
    // Trùng ID ngay trong file: chỉ giữ dòng CUỐI cùng
    const seenInFile = new Map<string, Job>();

    rows.forEach((row, index) => {
      const idText = normalizeKocIdText(
        pick(row, [
          "ID TikTok/Tên FB",
          "Id_tiktok_Ten_fb",
          "ID TikTok",
          "Tên FB",
          "id_tiktok_ten_fb",
        ])
      );

      if (!idText) {
        skipped += 1;
        return;
      }

      const key = matchKeyFromIdText(idText);
      const existingId = existingMap.get(key);

      const createdAtFromExcel = optionalCreatedAt(
        pick(row, ["Ngày tạo", "Ngày tạo KOC", "Created at", "created_at"])
      );

      // Giữ nguyên hoa/thường gốc khi LƯU, chỉ hạ chữ khi SO KHỚP
      const payload = cleanUndefined(
        buildKocPayload(row, idText, campaignMap, employeeMap)
      );

      if (existingId && !createdAtFromExcel) {
        delete payload.created_at;
      }

      if (!existingId && !payload.created_at) {
        payload.created_at = getVietnamTodayCreatedAt();
      }

      // Chỉ KOC THÊM MỚI mới cần status mặc định. KOC đã có mà Excel bỏ trống
      // ô Status thì giữ nguyên status hiện tại (không kéo về "Chờ phản hồi").
      if (!existingId && !payload.status) {
        payload.status = "Chờ phản hồi";
      }

      const job: Job = { excelRow: index + 2, payload, existingId };

      const earlier = seenInFile.get(key);

      if (earlier) {
        // Dòng sau đè dòng trước -> thay thế tại chỗ
        Object.assign(earlier, job);
        return;
      }

      seenInFile.set(key, job);
    });

    // Chia việc sau khi đã khử trùng trong file
    const updateJobs: Job[] = [];
    const insertJobs: Job[] = [];

    seenInFile.forEach((job) => {
      if (job.existingId) {
        updateJobs.push({ ...job, payload: { ...job.payload, id: job.existingId } });
      } else {
        insertJobs.push(job);
      }
    });

    const totalJobs = updateJobs.length + insertJobs.length;
    let done = 0;
    let inserted = 0;
    let updated = 0;

    // ---- Bước 2: gom thành lô ----
    // PostgREST bắt buộc mọi dòng trong 1 lô phải có CÙNG bộ cột,
    // nên gom theo "chữ ký cột" để ô trống không vô tình ghi đè thành null.
    function groupBySignature(jobs: Job[]) {
      const groups = new Map<string, Job[]>();

      jobs.forEach((job) => {
        const signature = Object.keys(job.payload).sort().join("|");
        if (!groups.has(signature)) groups.set(signature, []);
        groups.get(signature)!.push(job);
      });

      const batches: Job[][] = [];
      const batchSize = 500;

      groups.forEach((group) => {
        for (let from = 0; from < group.length; from += batchSize) {
          batches.push(group.slice(from, from + batchSize));
        }
      });

      return batches;
    }

    async function runBatch(batch: Job[], mode: "update" | "insert") {
      const payloads = batch.map((job) => job.payload);

      const { error } =
        mode === "update"
          ? await supabase.from("koc").upsert(payloads, { onConflict: "id" })
          : await supabase.from("koc").insert(payloads);

      if (error) {
        // Lô lỗi -> chạy lại từng dòng để biết chính xác dòng nào hỏng
        for (const job of batch) {
          const single =
            mode === "update"
              ? await supabase.from("koc").upsert(job.payload, { onConflict: "id" })
              : await supabase.from("koc").insert(job.payload);

          if (single.error) {
            errors.push(`Dòng ${job.excelRow}: ${single.error.message}`);
          } else if (mode === "update") {
            updated += 1;
          } else {
            inserted += 1;
          }
        }
      } else if (mode === "update") {
        updated += batch.length;
      } else {
        inserted += batch.length;
      }

      done += batch.length;
      setProgress({ done, total: totalJobs });
    }

    // ---- Bước 3: chạy các lô, tối đa 6 lô song song ----
    const allBatches: Array<{ batch: Job[]; mode: "update" | "insert" }> = [
      ...groupBySignature(updateJobs).map((batch) => ({ batch, mode: "update" as const })),
      ...groupBySignature(insertJobs).map((batch) => ({ batch, mode: "insert" as const })),
    ];

    setProgress({ done: 0, total: totalJobs });

    const concurrency = 6;

    for (let from = 0; from < allBatches.length; from += concurrency) {
      await Promise.all(
        allBatches
          .slice(from, from + concurrency)
          .map((item) => runBatch(item.batch, item.mode))
      );
    }

    setImporting(false);
    setProgress(null);

    const errorText =
      errors.length > 0
        ? ` Lỗi ${errors.length} dòng: ${errors.slice(0, 3).join(" | ")}`
        : "";

    const dupText =
      rows.length - skipped - totalJobs > 0
        ? ` Trùng ID trong file (chỉ giữ dòng cuối): ${rows.length - skipped - totalJobs}.`
        : "";

    setMessage(
      `Import xong: thêm mới ${inserted}, cập nhật ${updated}, bỏ qua ${skipped}.${dupText}${errorText}`
    );
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
                Import KOC từ Excel
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Nhập dữ liệu KOC hàng loạt. Nếu ID TikTok/Tên FB đã tồn tại,
                hệ thống sẽ cập nhật dòng đó thay vì tạo trùng.
              </p>
            </div>
          </div>

          <Link
            href="/koc"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Về danh sách KOC
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
          File nên có cột bắt buộc: ID TikTok/Tên FB. Các cột khác có thể để
          trống.
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
            {importing
              ? progress
                ? `Đang import ${progress.done}/${progress.total}...`
                : "Đang chuẩn bị..."
              : "Import KOC"}
          </button>
<button
  type="button"
  onClick={downloadKocTemplate}
  className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
>
  Tải mẫu Excel
</button>
        </div>

        {progress && progress.total > 0 && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#3964ff] transition-all"
                style={{
                  width: `${Math.round((progress.done / progress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[12.5px] font-bold text-slate-600">
              Đã xử lý {progress.done.toLocaleString("vi-VN")} /{" "}
              {progress.total.toLocaleString("vi-VN")} dòng (
              {Math.round((progress.done / progress.total) * 100)}%) — vui lòng
              không đóng tab cho tới khi xong.
            </p>
          </div>
        )}

        {fileName && (
          <p className="mt-4 text-sm font-semibold text-slate-600">
            File đã chọn: <span className="text-slate-950">{fileName}</span>
          </p>
        )}
      </section>

      <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Cột Excel hỗ trợ</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            "Ngày tạo",
            "PIC phụ trách",
            "ID TikTok/Tên FB",
            "Mã KOC",
            "Tên KOC",
            "Follower",
            "Tier",
            "Status",
            "Nền tảng",
            "Channel type",
            "Email",
            "SĐT/Zalo",
            "Address",
            "Note",
            "Booking date",
            "Date of birth",
            "Daily Videos(T-1)",
            "Monthly Videos",
            "Video có DT",
            "Campaign name",
            "GMV ngày",
            "GMV tháng",
            "Marital status",
            "CS gần nhất",
            "Link Facebook",
            "Link TikTok",
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
          <table className="w-full min-w-[1800px] text-left text-sm">
            <thead>
              <tr>
                <Th>Ngày tạo</Th>
                <Th>PIC</Th>
                <Th>ID TikTok/Tên FB</Th>
                <Th>Mã KOC</Th>
                <Th>Tên KOC</Th>
                <Th>Follower</Th>
                <Th>Tier</Th>
                <Th>Status</Th>
                <Th>Nền tảng</Th>
                <Th>Channel type</Th>
                <Th>SĐT/Zalo</Th>
                <Th>Daily Videos(T-1)</Th>
                <Th>Monthly Videos</Th>
                <Th>Video có DT</Th>
                <Th>Campaign</Th>
                <Th>GMV ngày</Th>
                <Th>GMV tháng</Th>
              </tr>
            </thead>

            <tbody>
              {previewRows.length === 0 && (
                <tr>
                  <td
                    colSpan={17}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Chưa có dữ liệu preview.
                  </td>
                </tr>
              )}

              {previewRows.map((row, index) => (
                <tr key={index}>
                  <Td>
                    {formatExcelDatePreview(
                      pick(row, ["Ngày tạo", "Ngày tạo KOC", "Created at", "created_at"])
                    ) || "-"}
                  </Td>
                  <Td>{text(pick(row, ["PIC phụ trách", "PIC", "Nhân viên", "employee"])) || "-"}</Td>
                  <Td>
                    {text(
                      pick(row, [
                        "ID TikTok/Tên FB",
                        "Id_tiktok_Ten_fb",
                        "ID TikTok",
                        "Tên FB",
                      ])
                    ) || "-"}
                  </Td>
                  <Td>{text(pick(row, ["Mã KOC", "KOC code", "koc_code"])) || "-"}</Td>
                  <Td>{text(pick(row, ["Tên KOC", "Name", "name"])) || "-"}</Td>
                  <Td>{text(pick(row, ["Follower", "follower"])) || "-"}</Td>
                  <Td>{text(pick(row, ["Tier", "tier"])) || "-"}</Td>
                  <Td>{text(pick(row, ["Status", "status"])) || "-"}</Td>
                  <Td>
                    {text(pick(row, ["Nền tảng", "Platform", "platform"])) || "-"}
                  </Td>
                  <Td>
                    {text(pick(row, ["Channel type", "channel_type"])) || "-"}
                  </Td>
                  <Td>{text(pick(row, ["SĐT/Zalo", "Phone", "phone"])) || "-"}</Td>
                  <Td>
                    {text(
                      pick(row, [
                        "Daily Videos(T-1)",
                        "Daily Videos (T-1)",
                        "Number of videos",
                        "number_of_videos",
                      ])
                    ) || "-"}
                  </Td>
                  <Td>
                    {text(pick(row, ["Monthly Videos", "monthly_videos"])) || "-"}
                  </Td>
                  <Td>
                    {text(
                      pick(row, ["Video có DT", "Video co DT", "videos_with_revenue"])
                    ) || "-"}
                  </Td>
                  <Td>
                    {text(
                      pick(row, ["Campaign name", "Campaign", "campaign_id"])
                    ) || "-"}
                  </Td>
                  <Td>{text(pick(row, ["GMV ngày", "GMV", "gmv"])) || "-"}</Td>
                  <Td>{text(pick(row, ["GMV tháng", "gmv_thang"])) || "-"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}


async function loadAllKocsForKocImport() {
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

function buildKocPayload(
  row: ExcelRow,
  idText: string,
  campaignMap: Map<string, string>,
  employeeMap: Map<string, string>
) {
  const campaignRaw = text(
    pick(row, ["Campaign name", "Campaign", "campaign_id", "campaign"])
  );

  const campaignId = campaignRaw
    ? campaignMap.get(normalizeLookup(campaignRaw)) || campaignRaw
    : undefined;

  const employeeId = resolveEmployeeId(row, employeeMap);

  return {
    created_at: optionalCreatedAt(
      pick(row, ["Ngày tạo", "Ngày tạo KOC", "Created at", "created_at"])
    ),
    employee_id: employeeId || undefined,
    Id_tiktok_Ten_fb: idText,
    koc_code: optionalText(pick(row, ["Mã KOC", "KOC code", "koc_code"])),
    name: optionalText(pick(row, ["Tên KOC", "Name", "name"])),
    tiktok_link: optionalText(pick(row, ["Link TikTok", "TikTok", "tiktok_link"])),
    facebook_link: optionalText(
      pick(row, ["Link Facebook", "Facebook", "facebook_link"])
    ),
    phone: optionalText(pick(row, ["SĐT/Zalo", "SĐT", "Phone", "phone"])),
    email: optionalText(pick(row, ["Email", "email"])),
    follower: optionalNumber(pick(row, ["Follower", "follower"])),
    tier: matchOption(pick(row, ["Tier", "tier"]), tierOptions),
    // KHÔNG ép mặc định ở đây. Nếu ô Status trong Excel trống thì để undefined
    // -> cleanUndefined loại bỏ -> KHÔNG ghi đè status đang có (tránh việc
    // status sửa tay như "Đã chốt" bị import kéo về "Chờ phản hồi").
    // Mặc định "Chờ phản hồi" chỉ áp cho KOC THÊM MỚI (xử lý ở handleImport).
    status: matchOption(pick(row, ["Status", "status"]), statusOptions),
    channel_type: matchOption(
      pick(row, ["Channel type", "channel_type"]),
      channelTypeOptions
    ),
    platform: resolvePlatforms(pick(row, ["Nền tảng", "Platform", "platform"])),
    address: optionalText(pick(row, ["Address", "Địa chỉ", "address"])),
    note: optionalText(pick(row, ["Note", "Ghi chú", "note"])),
    booking_date: optionalDate(pick(row, ["Booking date", "booking_date"])),
    date_of_birth: optionalDate(
      pick(row, ["Date of birth", "Ngày sinh", "date_of_birth"])
    ),
    number_of_videos: optionalNumber(
      pick(row, [
        "Daily Videos(T-1)",
        "Daily Videos (T-1)",
        "Number of videos",
        "Số video",
        "number_of_videos",
      ])
    ),
    monthly_videos: optionalNumber(
      pick(row, ["Monthly Videos", "monthly_videos"])
    ),
    videos_with_revenue: optionalNumber(
      pick(row, ["Video có DT", "Video co DT", "videos_with_revenue"])
    ),
    campaign_id: campaignId,
    gmv: optionalNumber(pick(row, ["GMV ngày", "GMV", "gmv"])),
    gmv_thang: optionalNumber(pick(row, ["GMV tháng", "gmv_thang"])),
    marital_status: matchOption(
      pick(row, ["Marital status", "marital_status"]),
      maritalStatusOptions
    ),
    new_contact_date: optionalDate(
      pick(row, ["CS gần nhất", "new_contact_date", "Ngày CS gần nhất"])
    ),
    cast_price: optionalNumber(pick(row, ["Cast price", "Giá cast", "cast_price"])),
  };
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

function resolveEmployeeId(row: ExcelRow, employeeMap: Map<string, string>) {
  const picText = pick(row, ["PIC phụ trách", "PIC", "Nhân viên", "employee"]);

  const candidates = [
    picText,
    pick(row, ["Mã nhân viên", "employee_code"]),
    pick(row, ["Email PIC", "email"]),
    pick(row, ["SĐT PIC", "Phone PIC", "phone"]),
    // File export ghi PIC dạng ghép "EMP0004 - Linh - Trưởng nhóm" -> thử
    // khớp từng phần (mã NV / tên) tách theo dấu "-".
    ...String(picText || "").split(/\s*-\s*/),
  ];

  for (const candidate of candidates) {
    const key = normalizeLookup(candidate);
    if (key && employeeMap.has(key)) return employeeMap.get(key);
  }

  return "";
}

function getVietnamTodayCreatedAt() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());

  return `${today}T12:00:00+07:00`;
}

function createCampaignMap(campaigns: DbRow[]) {
  const map = new Map<string, string>();

  campaigns.forEach((campaign) => {
    const id = String(campaign.id || "");

    [
      campaign.id,
      campaign.campaign_code,
      campaign.campaign_name,
      campaign.product_name,
    ].forEach((value) => {
      const key = normalizeLookup(value);
      if (key && id) map.set(key, id);
    });
  });

  return map;
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


function normalizeKocIdText(value: any) {
  return text(value).trim();
}

// Khóa so khớp KOC: bỏ hoa/thường và gộp khoảng trắng thừa.
// Phải khớp với unique index trong supabase/dedupe-koc.sql:
//   CREATE UNIQUE INDEX ... ON koc (lower(btrim("Id_tiktok_Ten_fb")))
function matchKeyFromIdText(idText: string) {
  return idText.trim().toLowerCase().replace(/\s+/g, " ");
}

function text(value: any) {
  return String(value || "").trim();
}

function optionalText(value: any) {
  const output = text(value);
  return output ? output : undefined;
}

// Dò các nền tảng có sẵn trong ô "Nền tảng" của Excel rồi nối bằng ", " để
// khớp multi-select. Không khớp cái nào -> giữ nguyên text gốc.
function resolvePlatforms(value: any) {
  const raw = text(value);
  if (!raw) return undefined;

  const normalized = removeVietnamese(raw).toLowerCase();
  const matched = platformOptions.filter((option) =>
    normalized.includes(removeVietnamese(option).toLowerCase())
  );

  return matched.length > 0 ? matched.join(", ") : raw;
}

function optionalNumber(value: any) {
  const raw = text(value);
  if (!raw) return undefined;

  const cleaned = raw.replace(/\./g, "").replace(/,/g, "");
  const numberValue = Number(cleaned);

  return Number.isNaN(numberValue) ? undefined : numberValue;
}

function optionalDate(value: any) {
  if (value === null || value === undefined || value === "") return undefined;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateObjectToVietnamDateKey(value);
  }

  if (typeof value === "number") {
    return excelSerialToDateKey(value);
  }

  const raw = text(value);
  if (!raw) return undefined;

  // ddmmyyyy liền nhau
  if (/^\d{8}$/.test(raw)) {
    const day = raw.slice(0, 2);
    const month = raw.slice(2, 4);
    const year = raw.slice(4, 8);

    return `${year}-${month}-${day}`;
  }

  // yyyy-mm-dd (ISO)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // d/m/yy hoặc d/m/yyyy: MẶC ĐỊNH dd/mm (kiểu VN), tự dò khi có số > 12.
  // Chấp nhận năm 2 chữ số vì ô serial hiển thị dạng "12/1/26".
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
    } else {
      // Mập mờ (cả 2 <= 12) -> mặc định kiểu VN dd/mm
      dayRaw = p1;
      monthRaw = p2;
    }

    const year =
      yearRaw.length === 2 ? `20${yearRaw}` : yearRaw.padStart(4, "0");
    return `${year}-${monthRaw.padStart(2, "0")}-${dayRaw.padStart(2, "0")}`;
  }

  return undefined;
}



function formatExcelDatePreview(value: any) {
  const dateKey = optionalDate(value);

  if (!dateKey) return text(value);

  const [year, month, day] = dateKey.split("-");

  if (!year || !month || !day) return text(value);

  return `${day}/${month}/${year}`;
}

// Excel serial number -> "YYYY-MM-DD". Tự tính, KHÔNG phụ thuộc XLSX.SSF.
// Serial là ngày tuyệt đối nên không bao giờ bị hoán đổi mm/dd hay lệch timezone.
function excelSerialToDateKey(serial: number) {
  if (!Number.isFinite(serial)) return undefined;

  const ms = Math.round((serial - 25569) * 86400000);
  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) return undefined;

  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateObjectToVietnamDateKey(value: Date) {
  const adjusted = new Date(value.getTime());

  // XLSX đôi khi đọc ô ngày thuần của Excel thành 23:59:30 ngày hôm trước.
  // Nếu giờ rất sát nửa đêm, cộng 1 ngày để giữ đúng ngày người dùng nhập.
  if (adjusted.getHours() === 23 && adjusted.getMinutes() >= 45) {
    adjusted.setDate(adjusted.getDate() + 1);
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(adjusted);
}

function optionalCreatedAt(value: any) {
  const dateKey = optionalDate(value);

  if (!dateKey) return undefined;

  return `${dateKey}T12:00:00+07:00`;
}

function toVietnamDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function matchOption(value: any, options: string[]) {
  const raw = normalizeLookup(value);
  if (!raw) return undefined;

  return options.find((option) => normalizeLookup(option) === raw);
}

function normalizeHeader(value: any) {
  return removeVietnamese(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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