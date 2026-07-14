"use client";

import { supabase } from "@/lib/supabase/client";
import KocAdvancedTable from "@/components/KocAdvancedTable";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type DbRow = Record<string, any>;
type FieldType = "text" | "number" | "date" | "select";
type FilterOperator =
  | "contains"
  | "not_contains"
  | "eq"
  | "neq"
  | "in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "date_eq"
  | "date_from"
  | "date_to"
  | "date_between"
  | "is_empty"
  | "is_not_empty";

type FilterField = {
  key: string;
  label: string;
  field: string;
  type: FieldType;
  options?: string[];
  relation?: "employee" | "campaign";
};

type FilterCondition = {
  id: string;
  fieldKey: string;
  operator: FilterOperator;
  value: string;
  value2?: string;
};

type ColumnOption = {
  key: string;
  label: string;
  defaultVisible?: boolean;
};

const tierOptions = [
  "VIP",
  "Tiềm năng",
  "Chăm chỉ",
  "Mới hoạt động",
  "Ngủ đông",
  "Mất cast",
  "Trùng KOC",
  "Dừng CS",
  "Hoạt động lâu",
];
const statusOptions = ["Chờ phản hồi", "Đã phản hồi", "Cân nhắc", "Đã chốt", "Từ chối", "Trùng KOC"];
const channelTypeOptions = ["Người thật", "AI", "Unbox", "POV"];
const maritalStatusOptions = ["Đã kết hôn", "Đã có con"];
const pageSizeOptions = [100, 200, 300];
const visibleColumnsStorageKey = "drkam_koc_visible_columns_v5";

const filterFields: FilterField[] = [
  { key: "Id_tiktok_Ten_fb", label: "ID TikTok/Tên FB", field: "Id_tiktok_Ten_fb", type: "text" },
  { key: "koc_code", label: "Mã KOC", field: "koc_code", type: "text" },
  { key: "name", label: "Tên KOC", field: "name", type: "text" },
  { key: "follower", label: "Follower", field: "follower", type: "number" },
  { key: "tier", label: "Tier", field: "tier", type: "select", options: tierOptions },
  { key: "status", label: "Status", field: "status", type: "select", options: statusOptions },
  { key: "platform", label: "Nền tảng", field: "platform", type: "text" },
  { key: "channel_type", label: "Channel type", field: "channel_type", type: "select", options: channelTypeOptions },
  { key: "employee_id", label: "PIC phụ trách", field: "employee_id", type: "select", relation: "employee" },
  { key: "email", label: "Email", field: "email", type: "text" },
  { key: "phone", label: "SĐT/Zalo", field: "phone", type: "text" },
  { key: "address", label: "Address", field: "address", type: "text" },
  { key: "note", label: "Note", field: "note", type: "text" },
  { key: "booking_date", label: "Booking date", field: "booking_date", type: "date" },
  { key: "date_of_birth", label: "Date of birth", field: "date_of_birth", type: "date" },
  { key: "number_of_videos", label: "Daily Videos(T-1)", field: "number_of_videos", type: "number" },
  { key: "monthly_videos", label: "Monthly Videos", field: "monthly_videos", type: "number" },
  { key: "campaign_id", label: "Campaign name", field: "campaign_id", type: "select", relation: "campaign" },
  { key: "gmv", label: "GMV ngày", field: "gmv", type: "number" },
  { key: "gmv_thang", label: "GMV tháng", field: "gmv_thang", type: "number" },
  { key: "marital_status", label: "Marital status", field: "marital_status", type: "select", options: maritalStatusOptions },
  { key: "cast_price", label: "Giá cast", field: "cast_price", type: "number" },
  { key: "created_at", label: "Ngày tạo", field: "created_at", type: "date" },
  { key: "new_contact_date", label: "CS gần nhất", field: "new_contact_date", type: "date" },
  { key: "time_contact", label: "Time liên hệ", field: "new_contact_date", type: "number" },
  { key: "facebook_link", label: "Link Facebook", field: "facebook_link", type: "text" },
  { key: "tiktok_link", label: "Link TikTok", field: "tiktok_link", type: "text" },
];

const columnOptions: ColumnOption[] = [
  { key: "employee_id", label: "PIC phụ trách", defaultVisible: true },
  { key: "Id_tiktok_Ten_fb", label: "ID TikTok/Tên FB", defaultVisible: true },
  { key: "koc_code", label: "Mã KOC", defaultVisible: true },
  { key: "name", label: "Tên KOC", defaultVisible: true },
  { key: "follower", label: "Follower", defaultVisible: true },
  { key: "tier", label: "Tier", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "platform", label: "Nền tảng", defaultVisible: true },
  { key: "channel_type", label: "Channel type", defaultVisible: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "SĐT/Zalo", defaultVisible: true },
  { key: "address", label: "Address" },
  { key: "note", label: "Note", defaultVisible: true },
  { key: "booking_date", label: "Booking date" },
  { key: "date_of_birth", label: "Date of birth" },
  { key: "number_of_videos", label: "Daily Videos(T-1)" },
  { key: "monthly_videos", label: "Monthly Videos" },
  { key: "campaign_id", label: "Campaign name" },
  { key: "gmv", label: "GMV ngày" },
  { key: "gmv_thang", label: "GMV tháng" },
  { key: "marital_status", label: "Marital status" },
  { key: "cast_price", label: "Giá cast" },
  { key: "created_at", label: "Ngày tạo", defaultVisible: true },
  { key: "new_contact_date", label: "CS gần nhất", defaultVisible: true },
  { key: "time_contact", label: "Time liên hệ", defaultVisible: true },
  { key: "facebook_link", label: "Link Facebook" },
  { key: "tiktok_link", label: "Link TikTok" },
];

const defaultVisibleColumnKeys = columnOptions
  .filter((column) => column.defaultVisible)
  .map((column) => column.key);

export default function KocListPage() {
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [campaigns, setCampaigns] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const [totalKocCount, setTotalKocCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  const [filterFieldKey, setFilterFieldKey] = useState(filterFields[0].key);
  const [filterOperator, setFilterOperator] = useState<FilterOperator>("contains");
  const [filterValue, setFilterValue] = useState("");
  const [filterValue2, setFilterValue2] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);

  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleColumnKeys);
  const [resetColumnSignal, setResetColumnSignal] = useState(0);

  useEffect(() => {
    const savedColumns = window.localStorage.getItem(visibleColumnsStorageKey);

    if (!savedColumns) return;

    try {
      const parsed = JSON.parse(savedColumns);
      const validKeys = new Set(columnOptions.map((column) => column.key));

      if (Array.isArray(parsed)) {
        const cleanKeys = parsed.filter((key) => validKeys.has(key));

        if (cleanKeys.length > 0) {
          setVisibleColumnKeys(cleanKeys);
        }
      }
    } catch {
      // Ignore invalid localStorage data.
    }
  }, []);

  useEffect(() => {
    async function loadReferenceData() {
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
          .limit(1000),
      ]);

      if (campaignResult.error) {
        setMessage(`Lỗi tải chiến dịch: ${campaignResult.error.message}`);
        setCampaigns([]);
      } else {
        setCampaigns(campaignResult.data || []);
      }

      if (employeeResult.error) {
        setMessage(`Lỗi tải PIC: ${employeeResult.error.message}`);
        setEmployees([]);
      } else {
        setEmployees(employeeResult.data || []);
      }
    }

    loadReferenceData();
  }, []);

  useEffect(() => {
    async function loadKocs() {
      setLoading(true);
      setMessage("");

      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("koc")
        .select("*", { count: "exact" })
        .order("new_contact_date", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false })
        .range(from, to);

      activeFilters.forEach((condition) => {
        query = applyConditionToQuery(query, condition);
      });

      const { data, error, count } = await query;

      if (error) {
        setMessage(`Lỗi tải danh sách KOC: ${error.message}`);
        setKocs([]);
        setTotalKocCount(0);
      } else {
        setKocs(data || []);
        setTotalKocCount(count || 0);
      }

      setLoading(false);
    }

    loadKocs();
  }, [pageIndex, pageSize, activeFilters]);

  const campaignMap = useMemo(() => {
    const map = new Map<string, DbRow>();

    campaigns.forEach((campaign) => {
      if (campaign.id) map.set(String(campaign.id), campaign);
      if (campaign.campaign_code) map.set(String(campaign.campaign_code), campaign);
      if (campaign.campaign_name) map.set(String(campaign.campaign_name), campaign);
    });

    return map;
  }, [campaigns]);

  const selectedField = filterFields.find((field) => field.key === filterFieldKey) || filterFields[0];
  const availableOperators = getOperatorsForField(selectedField);
  const currentPageCount = kocs.length;
  const closedCount = kocs.filter((koc) => koc.status === "Đã chốt").length;
  const repliedCount = kocs.filter((koc) => koc.status === "Đã phản hồi").length;
  const totalPages = Math.max(1, Math.ceil(totalKocCount / pageSize));
  const startRow = totalKocCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalKocCount);

  function handleFieldChange(nextFieldKey: string) {
    const nextField = filterFields.find((field) => field.key === nextFieldKey) || filterFields[0];
    const nextOperator = getOperatorsForField(nextField)[0].value;

    setFilterFieldKey(nextFieldKey);
    setFilterOperator(nextOperator);
    setFilterValue("");
    setFilterValue2("");
  }

  function addFilter() {
    const field = filterFields.find((item) => item.key === filterFieldKey);

    if (!field) return;

    const needsValue = !["is_empty", "is_not_empty"].includes(filterOperator);
    const needsSecondValue = ["between", "date_between"].includes(filterOperator);

    if (needsValue && !filterValue.trim()) {
      setMessage("Vui lòng nhập/chọn giá trị lọc trước khi thêm điều kiện.");
      return;
    }

    if (needsSecondValue && !filterValue2.trim()) {
      setMessage("Vui lòng nhập đủ giá trị từ và đến.");
      return;
    }

    setActiveFilters((current) => [
      ...current,
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        fieldKey: filterFieldKey,
        operator: filterOperator,
        value: filterValue.trim(),
        value2: filterValue2.trim(),
      },
    ]);

    setFilterValue("");
    setFilterValue2("");
    setPageIndex(0);
    setMessage("");
  }

  function removeFilter(filterId: string) {
    setActiveFilters((current) => current.filter((item) => item.id !== filterId));
    setPageIndex(0);
  }

  function clearFilters() {
    setActiveFilters([]);
    setFilterFieldKey(filterFields[0].key);
    setFilterOperator("contains");
    setFilterValue("");
    setFilterValue2("");
    setPageIndex(0);
    setMessage("");
  }

  function saveVisibleColumns(nextKeys: string[]) {
    setVisibleColumnKeys(nextKeys);
    window.localStorage.setItem(visibleColumnsStorageKey, JSON.stringify(nextKeys));
  }

  function toggleColumn(columnKey: string) {
    const exists = visibleColumnKeys.includes(columnKey);
    const nextKeys = exists
      ? visibleColumnKeys.filter((key) => key !== columnKey)
      : [...visibleColumnKeys, columnKey];

    saveVisibleColumns(nextKeys);
  }

  function showDefaultColumns() {
    saveVisibleColumns(defaultVisibleColumnKeys);
  }

  function showAllColumns() {
    saveVisibleColumns(columnOptions.map((column) => column.key));
  }

  function goPreviousPage() {
    setPageIndex((current) => Math.max(0, current - 1));
  }

  function goNextPage() {
    setPageIndex((current) => Math.min(totalPages - 1, current + 1));
  }

  async function exportKocExcel() {
    setExporting(true);
    setMessage("");

    try {
      // Lấy TOÀN BỘ KOC khớp bộ lọc (phân trang để vượt giới hạn 1000 dòng của Supabase)
      const pageSize = 1000;
      const allKocs: DbRow[] = [];
      let from = 0;

      for (;;) {
        let query = supabase
          .from("koc")
          .select("*")
          .order("new_contact_date", { ascending: true, nullsFirst: true })
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);

        activeFilters.forEach((condition) => {
          query = applyConditionToQuery(query, condition);
        });

        const { data, error } = await query;

        if (error) {
          setMessage(`Lỗi xuất Excel: ${error.message}`);
          return;
        }

        const batch = data || [];
        allKocs.push(...batch);

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      const exportRows = allKocs.map((koc) => {
        const campaignName = getCampaignName(koc, campaignMap);

        return {
        "Mã KOC": koc.koc_code || "",
        "ID TikTok/Tên FB": koc.Id_tiktok_Ten_fb || "",
        "Tên KOC": koc.name || "",
        Follower: Number(koc.follower || 0),
        Tier: koc.tier || "",
        Status: koc.status || "",
        "Nền tảng": koc.platform || "",
        "Channel type": koc.channel_type || "",
        "PIC phụ trách": getEmployeeDisplayName(
          employees.find((employee) => String(employee.id) === String(koc.employee_id))
        ),
        Email: koc.email || "",
        "SĐT/Zalo": koc.phone || "",
        Address: koc.address || "",
        Note: koc.note || "",
        "Booking date": formatDate(koc.booking_date),
        "Date of birth": formatDate(koc.date_of_birth),
        "Daily Videos(T-1)": formatNumber(koc.number_of_videos),
        "Monthly Videos": formatNumber(koc.monthly_videos),
        "Campaign name": campaignName === "-" ? "" : campaignName,
        "GMV ngày": Number(koc.gmv || 0),
        "GMV tháng": Number(koc.gmv_thang || 0),
        "Marital status": koc.marital_status || "",
        "Giá cast": Number(koc.cast_price || 0),
        "Ngày tạo": formatDate(koc.created_at),
        "CS gần nhất": formatDate(koc.new_contact_date),
        "Time liên hệ": formatContactAgeDisplay(koc.new_contact_date),
        "Link Facebook": koc.facebook_link || "",
        "Link TikTok": koc.tiktok_link || "",
      };
    });

      if (exportRows.length === 0) {
        alert("Không có dữ liệu KOC để xuất Excel.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sach KOC");
      XLSX.writeFile(workbook, `danh-sach-koc-${getTodayForFileName()}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-3 rounded-[18px] border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-base">
              👥
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase leading-[1.3] tracking-[0.22em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[20px] font-bold leading-tight tracking-normal text-slate-950 md:text-[22px]">
                Danh sách KOC
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
              onClick={exportKocExcel}
              disabled={exporting}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
            >
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </button>

            <Link
              href="/koc/new"
              className="flex h-10 items-center rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
            >
              + Thêm KOC mới
            </Link>

            <Link
              href="/import/koc"
              className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Import KOC
            </Link>

            <button
              type="button"
              onClick={() => setShowColumnPanel((current) => !current)}
              className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Ẩn/hiện cột
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] font-bold text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Đang xem:{" "}
              <b className="text-slate-950">{currentPageCount}</b> KOC
            </span>

            <span className="text-slate-300">|</span>

            <span>
              Tổng theo bộ lọc:{" "}
              <b className="text-slate-950">{totalKocCount}</b> KOC
            </span>

            <span className="text-slate-300">|</span>

            <span>
              Trang:{" "}
              <b className="text-slate-950">
                {pageIndex + 1}/{totalPages}
              </b>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span>
              Đã chốt: <b className="text-emerald-600">{closedCount}</b>
            </span>

            <span className="text-slate-300">|</span>

            <span>
              Đã phản hồi: <b className="text-orange-600">{repliedCount}</b>
            </span>
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_0.9fr_1.2fr_1.2fr_auto] xl:items-end">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">Trường cần lọc</label>
            <select
              value={filterFieldKey}
              onChange={(event) => handleFieldChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff]"
            >
              {filterFields.map((field) => (
                <option key={field.key} value={field.key}>{field.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">Điều kiện</label>
            <select
              value={filterOperator}
              onChange={(event) => {
                setFilterOperator(event.target.value as FilterOperator);
                setFilterValue("");
                setFilterValue2("");
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff]"
            >
              {availableOperators.map((operator) => (
                <option key={operator.value} value={operator.value}>{operator.label}</option>
              ))}
            </select>
          </div>

          <FilterValueInput
            label="Giá trị"
            field={selectedField}
            operator={filterOperator}
            value={filterValue}
            employees={employees}
            campaigns={campaigns}
            onChange={setFilterValue}
          />

          <FilterSecondValueInput
            field={selectedField}
            operator={filterOperator}
            value={filterValue2}
            onChange={setFilterValue2}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addFilter}
              className="h-10 rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
            >
              + Thêm điều kiện
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[12px] font-bold text-blue-700"
              >
                <span>{getFilterSummary(filter, employees, campaigns)}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(filter.id)}
                  className="rounded-full bg-white px-2 py-0.5 text-blue-700 hover:bg-blue-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {showColumnPanel && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-red-600">Hiển thị cột</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-500">Tick trường muốn hiện trên bảng. Các trường ẩn vẫn lọc được bình thường.</p>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={showDefaultColumns} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700">Mặc định</button>
                <button type="button" onClick={showAllColumns} className="h-8 rounded-lg bg-slate-900 px-3 text-[12px] font-bold text-white">Hiện tất cả</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {columnOptions.map((column) => (
                <label key={column.key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={visibleColumnKeys.includes(column.key)}
                    disabled={column.key === "action"}
                    onChange={() => toggleColumn(column.key)}
                    className="h-4 w-4 accent-red-600"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      <KocAdvancedTable
        kocs={kocs}
        campaigns={campaigns}
        employees={employees}
        visibleColumnKeys={visibleColumnKeys}
        resetLayoutSignal={resetColumnSignal}
        loading={loading}
        onExport={exportKocExcel}
        onKocUpdated={(id, patch) => {
          setKocs((prev) =>
            prev.map((item) =>
              String(item.id) === String(id) ? { ...item, ...patch } : item
            )
          );
        }}
      />

      <section className="sticky bottom-0 z-[200] mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="text-[13px] font-bold text-slate-600">
            Đang xem <span className="text-slate-950">{startRow} - {endRow}</span> / {totalKocCount} KOC
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPageIndex(0);
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size} dòng/trang</option>
              ))}
            </select>

            <button type="button" onClick={goPreviousPage} disabled={pageIndex === 0 || loading} className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">← Trang trước</button>
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-black text-slate-700">Trang {pageIndex + 1}/{totalPages}</span>
            <button type="button" onClick={goNextPage} disabled={pageIndex >= totalPages - 1 || loading} className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Trang sau →</button>
          </div>
        </div>
      </section>
    </section>
  );
}

function FilterValueInput({
  label,
  field,
  operator,
  value,
  employees,
  campaigns,
  onChange,
}: {
  label: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
  employees: DbRow[];
  campaigns: DbRow[];
  onChange: (value: string) => void;
}) {
  const noValueNeeded = ["is_empty", "is_not_empty"].includes(operator);

  if (noValueNeeded) {
    return (
      <div>
        <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">{label}</label>
        <input disabled value="Không cần nhập" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-[13px] font-semibold text-slate-400" onChange={() => undefined} />
      </div>
    );
  }

  if (operator === "in") {
    return (
      <div>
        <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">{label}</label>
        <select
          multiple
          value={value ? value.split(",").filter(Boolean) : []}
          onChange={(event) => {
            const values = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
            onChange(values.join(","));
          }}
          className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#3964ff]"
        >
          {getSelectOptions(field, employees, campaigns).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">{label}</label>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff]">
          <option value="">Chọn giá trị</option>
          {getSelectOptions(field, employees, campaigns).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">{label}</label>
      <input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.type === "text" ? "Nhập từ khóa..." : "Nhập giá trị..."}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff]"
      />
    </div>
  );
}

function FilterSecondValueInput({
  field,
  operator,
  value,
  onChange,
}: {
  field: FilterField;
  operator: FilterOperator;
  value: string;
  onChange: (value: string) => void;
}) {
  const needsSecondValue = ["between", "date_between"].includes(operator);

  if (!needsSecondValue) {
    return <div className="hidden xl:block" />;
  }

  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-bold text-slate-600">Giá trị đến</label>
      <input
        type={field.type === "date" ? "date" : "number"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff]"
      />
    </div>
  );
}

function applyConditionToQuery(query: any, condition: FilterCondition) {
  const field = filterFields.find((item) => item.key === condition.fieldKey);
  if (!field) return query;

  if (condition.fieldKey === "time_contact") {
    return applyTimeContactConditionToQuery(query, condition);
  }

  const column = field.field;
  const value = normalizeFilterValue(field, condition.value);
  const value2 = normalizeFilterValue(field, condition.value2 || "");

  switch (condition.operator) {
    case "contains":
      return query.ilike(column, `%${condition.value}%`);
    case "not_contains":
      return query.not(column, "ilike", `%${condition.value}%`);
    case "eq":
    case "date_eq":
      return query.eq(column, value);
    case "neq":
      return query.neq(column, value);
    case "in": {
      const values = condition.value.split(",").map((item) => normalizeFilterValue(field, item)).filter((item) => item !== "" && item !== null && item !== undefined);
      return values.length > 0 ? query.in(column, values) : query;
    }
    case "gt":
      return query.gt(column, value);
    case "gte":
    case "date_from":
      return query.gte(column, value);
    case "lt":
      return query.lt(column, value);
    case "lte":
    case "date_to":
      return query.lte(column, value);
    case "between":
    case "date_between":
      return query.gte(column, value).lte(column, value2);
    case "is_empty":
      return query.is(column, null);
    case "is_not_empty":
      return query.not(column, "is", null);
    default:
      return query;
  }
}


function applyTimeContactConditionToQuery(query: any, condition: FilterCondition) {
  if (condition.operator === "is_empty") {
    return query.is("new_contact_date", null);
  }

  if (condition.operator === "is_not_empty") {
    return query.not("new_contact_date", "is", null);
  }

  const days = parseNumberFilter(condition.value);
  const days2 = parseNumberFilter(condition.value2 || "");

  if (days === null) return query;

  const todayKey = getVietnamTodayDateKey();

  switch (condition.operator) {
    case "eq":
      return query.eq("new_contact_date", dateKeyMinusDays(todayKey, days));
    case "neq":
      return query.neq("new_contact_date", dateKeyMinusDays(todayKey, days));
    case "gt":
      return query.lt("new_contact_date", dateKeyMinusDays(todayKey, days));
    case "gte":
      return query.lte("new_contact_date", dateKeyMinusDays(todayKey, days));
    case "lt":
      return query.gt("new_contact_date", dateKeyMinusDays(todayKey, days));
    case "lte":
      return query.gte("new_contact_date", dateKeyMinusDays(todayKey, days));
    case "between": {
      if (days2 === null) return query;

      const minDays = Math.min(days, days2);
      const maxDays = Math.max(days, days2);

      return query
        .gte("new_contact_date", dateKeyMinusDays(todayKey, maxDays))
        .lte("new_contact_date", dateKeyMinusDays(todayKey, minDays));
    }
    default:
      return query;
  }
}

function parseNumberFilter(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  const numberValue = Number(raw.replace(/\./g, "").replace(/,/g, ""));

  return Number.isNaN(numberValue) ? null : numberValue;
}

function dateKeyMinusDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() - days);

  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function getVietnamTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function formatContactAgeDisplay(value: unknown) {
  const age = getContactAgeDays(value);

  if (age === null) return "Chưa CS";

  return String(age);
}

function getContactAgeDays(value: unknown) {
  const contactDateKey = getDateKeyFromValue(value);

  if (!contactDateKey) return null;

  const todayKey = getVietnamTodayDateKey();
  const diff = Math.floor(
    (dateKeyToUtcTime(todayKey) - dateKeyToUtcTime(contactDateKey)) /
      86400000
  );

  return Math.max(0, diff);
}

function getDateKeyFromValue(value: unknown) {
  if (!value) return "";

  const raw = String(value).trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const shortDate = raw.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) return shortDate;

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function dateKeyToUtcTime(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function normalizeFilterValue(field: FilterField, value: string) {
  const raw = String(value || "").trim();

  if (field.type === "number") {
    const numberValue = Number(raw.replace(/\./g, "").replace(/,/g, ""));
    return Number.isNaN(numberValue) ? raw : numberValue;
  }

  return raw;
}

function getOperatorsForField(field: FilterField) {
  if (field.type === "text") {
    return [
      { value: "contains" as const, label: "Chứa" },
      { value: "not_contains" as const, label: "Không chứa" },
      { value: "eq" as const, label: "Bằng" },
      { value: "neq" as const, label: "Khác" },
      { value: "is_empty" as const, label: "Trống" },
      { value: "is_not_empty" as const, label: "Không trống" },
    ];
  }

  if (field.type === "number") {
    return [
      { value: "eq" as const, label: "Bằng" },
      { value: "gt" as const, label: "Lớn hơn" },
      { value: "gte" as const, label: "Lớn hơn hoặc bằng" },
      { value: "lt" as const, label: "Nhỏ hơn" },
      { value: "lte" as const, label: "Nhỏ hơn hoặc bằng" },
      { value: "between" as const, label: "Trong khoảng" },
      { value: "is_empty" as const, label: "Trống" },
      { value: "is_not_empty" as const, label: "Không trống" },
    ];
  }

  if (field.type === "date") {
    return [
      { value: "date_eq" as const, label: "Bằng ngày" },
      { value: "date_from" as const, label: "Từ ngày" },
      { value: "date_to" as const, label: "Đến ngày" },
      { value: "date_between" as const, label: "Trong khoảng ngày" },
      { value: "is_empty" as const, label: "Trống" },
      { value: "is_not_empty" as const, label: "Không trống" },
    ];
  }

  return [
    { value: "eq" as const, label: "Bằng" },
    { value: "neq" as const, label: "Khác" },
    { value: "in" as const, label: "Nằm trong nhiều giá trị" },
    { value: "is_empty" as const, label: "Trống" },
    { value: "is_not_empty" as const, label: "Không trống" },
  ];
}

function getSelectOptions(field: FilterField, employees: DbRow[], campaigns: DbRow[]) {
  if (field.relation === "employee") {
    return employees.map((employee) => ({ value: String(employee.id), label: getEmployeeDisplayName(employee) }));
  }

  if (field.relation === "campaign") {
    return campaigns.map((campaign) => ({ value: String(campaign.id), label: getCampaignDisplayName(campaign) }));
  }

  return (field.options || []).map((option) => ({ value: option, label: option }));
}

function getFilterSummary(condition: FilterCondition, employees: DbRow[], campaigns: DbRow[]) {
  const field = filterFields.find((item) => item.key === condition.fieldKey);
  if (!field) return "Bộ lọc không rõ";

  const operator = getOperatorsForField(field).find((item) => item.value === condition.operator);
  const displayValue = getDisplayFilterValue(field, condition.value, employees, campaigns);
  const displayValue2 = getDisplayFilterValue(field, condition.value2 || "", employees, campaigns);

  if (["is_empty", "is_not_empty"].includes(condition.operator)) {
    return `${field.label} ${operator?.label || ""}`;
  }

  if (["between", "date_between"].includes(condition.operator)) {
    return `${field.label} ${operator?.label || ""}: ${displayValue} → ${displayValue2}`;
  }

  return `${field.label} ${operator?.label || ""}: ${displayValue}`;
}

function getDisplayFilterValue(field: FilterField, value: string, employees: DbRow[], campaigns: DbRow[]) {
  if (!value) return "";

  if (field.type !== "select") return value;

  const optionMap = new Map(getSelectOptions(field, employees, campaigns).map((option) => [option.value, option.label]));

  return value
    .split(",")
    .map((item) => optionMap.get(item) || item)
    .join(", ");
}

function getCampaignName(koc: DbRow, campaignMap: Map<string, DbRow>) {
  if (koc.campaign_name) return String(koc.campaign_name);

  const campaignId = String(koc.campaign_id || "").trim();
  if (!campaignId) return "-";

  const campaign = campaignMap.get(campaignId);
  if (!campaign) return campaignId;

  return getCampaignDisplayName(campaign) || campaignId;
}

function getCampaignDisplayName(campaign?: DbRow | null) {
  if (!campaign) return "Chưa rõ Campaign";

  return campaign.campaign_name || campaign.campaign_code || campaign.product_name || "Chưa rõ Campaign";
}

function getEmployeeDisplayName(employee?: DbRow | null) {
  if (!employee) return "Chưa có PIC";

  const code = employee.employee_code || "";
  const name = employee.full_name || "";
  const phone = employee.phone || "";
  const role = employee.role || "";

  return [code, name, phone, role].filter(Boolean).join(" - ") || "Chưa rõ PIC";
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  return numberValue.toLocaleString("vi-VN");
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    const shortDate = raw.slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) {
      const [year, month, day] = shortDate.split("-");
      return `${day}/${month}/${year}`;
    }

    return raw;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getTodayForFileName() {
  const today = new Date();

  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(today);

  const [year, month, day] = formatted.split("-");

  return `${day}-${month}-${year}`;
}
