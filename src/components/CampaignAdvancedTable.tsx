"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import DatePickerInput from "@/components/DatePickerInput";
import { useEffect, useMemo, useState } from "react";

type DbRow = Record<string, any>;

type ColumnType = "action" | "text" | "number" | "date" | "select" | "readonly";

type ColumnConfig = {
  key: string;
  label: string;
  field?: string;
  type: ColumnType;
  width: number;
  options?: string[];
  readonly?: boolean;
};

const campaignStatusOptions = [
  "Đang thực hiện",
  "Đã hoàn thành",
  "Hủy bỏ",
];

const defaultColumns: ColumnConfig[] = [
  { key: "action", label: "Sửa", type: "action", width: 58 },
  {
    key: "campaign_code",
    label: "Mã Campaign",
    field: "campaign_code",
    type: "readonly",
    width: 130,
  },
  {
    key: "campaign_name",
    label: "Tên Campaign",
    field: "campaign_name",
    type: "text",
    width: 220,
  },
  {
    key: "product_name",
    label: "Sản phẩm",
    field: "product_name",
    type: "text",
    width: 185,
  },
  {
    key: "start_date",
    label: "Ngày bắt đầu",
    field: "start_date",
    type: "date",
    width: 125,
  },
  {
    key: "end_date",
    label: "Ngày kết thúc",
    field: "end_date",
    type: "date",
    width: 125,
  },
  {
    key: "budget",
    label: "Ngân sách",
    field: "budget",
    type: "number",
    width: 120,
  },
  {
    key: "target_video",
    label: "Target video",
    field: "target_video",
    type: "number",
    width: 115,
  },
  {
    key: "target_gmv",
    label: "Target GMV",
    field: "target_gmv",
    type: "number",
    width: 125,
  },
  {
    key: "status",
    label: "Status",
    field: "status",
    type: "select",
    options: campaignStatusOptions,
    width: 145,
  },
  {
    key: "note",
    label: "Note",
    field: "note",
    type: "text",
    width: 260,
  },
];

const storageKeyOrder = "drkam_campaign_column_order_v1";
const storageKeyPinned = "drkam_campaign_pinned_columns_v1";

export default function CampaignAdvancedTable({
  campaigns,
  totalCampaigns,
  loading,
  onExport,
  onCampaignUpdated,
}: {
  campaigns: DbRow[];
  totalCampaigns: number;
  loading: boolean;
  onExport: () => void;
  onCampaignUpdated: (id: string, patch: DbRow) => void;
}) {
  const [columnOrder, setColumnOrder] = useState<string[]>(
    defaultColumns.map((column) => column.key)
  );
  const [pinnedColumns, setPinnedColumns] = useState<string[]>(["action"]);
  const [draggingColumn, setDraggingColumn] = useState("");
  const [savingCell, setSavingCell] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedOrder = window.localStorage.getItem(storageKeyOrder);
    const savedPinned = window.localStorage.getItem(storageKeyPinned);

    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed)) {
          const validKeys = new Set(defaultColumns.map((item) => item.key));
          const cleanOrder = parsed.filter((key) => validKeys.has(key));
          const missingKeys = defaultColumns
            .map((item) => item.key)
            .filter((key) => !cleanOrder.includes(key));

          setColumnOrder([...cleanOrder, ...missingKeys]);
        }
      } catch {
        // Ignore invalid localStorage data.
      }
    }

    if (savedPinned) {
      try {
        const parsed = JSON.parse(savedPinned);
        if (Array.isArray(parsed)) {
          setPinnedColumns(parsed);
        }
      } catch {
        // Ignore invalid localStorage data.
      }
    }
  }, []);

  const columnMap = useMemo(() => {
    return new Map(defaultColumns.map((column) => [column.key, column]));
  }, []);

  const orderedColumns = useMemo(() => {
    return columnOrder
      .map((key) => columnMap.get(key))
      .filter(Boolean) as ColumnConfig[];
  }, [columnOrder, columnMap]);

  const tableWidth = useMemo(() => {
    return orderedColumns.reduce((sum, column) => sum + column.width, 0);
  }, [orderedColumns]);

  function saveColumnOrder(nextOrder: string[]) {
    setColumnOrder(nextOrder);
    window.localStorage.setItem(storageKeyOrder, JSON.stringify(nextOrder));
  }

  function savePinnedColumns(nextPinned: string[]) {
    setPinnedColumns(nextPinned);
    window.localStorage.setItem(storageKeyPinned, JSON.stringify(nextPinned));
  }

  function resetLayout() {
    saveColumnOrder(defaultColumns.map((column) => column.key));
    savePinnedColumns(["action"]);
  }

  function handleDrop(targetColumnKey: string) {
    if (!draggingColumn || draggingColumn === targetColumnKey) return;

    const nextOrder = [...columnOrder];
    const fromIndex = nextOrder.indexOf(draggingColumn);
    const toIndex = nextOrder.indexOf(targetColumnKey);

    if (fromIndex === -1 || toIndex === -1) return;

    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, draggingColumn);

    saveColumnOrder(nextOrder);
    setDraggingColumn("");
  }

  function togglePin(columnKey: string) {
    const exists = pinnedColumns.includes(columnKey);

    const nextPinned = exists
      ? pinnedColumns.filter((key) => key !== columnKey)
      : [...pinnedColumns, columnKey];

    savePinnedColumns(nextPinned);
  }

  function getStickyStyle(column: ColumnConfig) {
    if (!pinnedColumns.includes(column.key)) {
      return {};
    }

    const pinnedOrdered = orderedColumns.filter((item) =>
      pinnedColumns.includes(item.key)
    );

    const index = pinnedOrdered.findIndex((item) => item.key === column.key);

    const left = pinnedOrdered
      .slice(0, index)
      .reduce((sum, item) => sum + item.width, 0);

    return {
      position: "sticky" as const,
      left,
      boxShadow: "1px 0 0 #e2e8f0",
    };
  }

  async function updateCell(
    campaign: DbRow,
    column: ColumnConfig,
    rawValue: unknown
  ) {
    if (!column.field || column.readonly || column.type === "action") return;

    const nextValue = normalizeValueForSave(column, rawValue);
    const currentValue = normalizeValueForCompare(column, campaign[column.field]);

    if (String(nextValue ?? "") === String(currentValue ?? "")) {
      return;
    }

    const cellKey = `${campaign.id}_${column.field}`;
    setSavingCell(cellKey);
    setError("");

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ [column.field]: nextValue })
      .eq("id", campaign.id);

    if (updateError) {
      setError(`Lỗi lưu ${column.label}: ${updateError.message}`);
    } else {
      onCampaignUpdated(String(campaign.id), { [column.field]: nextValue });
    }

    setSavingCell("");
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
            Campaign database
          </p>

          <h2 className="mt-1 text-[20px] font-bold leading-tight text-slate-950">
            Danh sách Campaign
          </h2>

          <p className="mt-1 text-[13px] text-slate-500">
            Đang hiển thị{" "}
            <span className="font-bold text-slate-950">
              {campaigns.length}
            </span>{" "}
            / {totalCampaigns} campaign phù hợp. Kéo thả tiêu đề cột để đổi vị
            trí, bấm ghim để cố định cột.
          </p>

          {error && (
            <p className="mt-2 text-[12px] font-bold text-red-600">{error}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetLayout}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Reset cột
          </button>

          <button
            type="button"
            onClick={onExport}
            className="h-10 rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white shadow-md hover:bg-emerald-700"
          >
            Xuất Excel
          </button>

          <Link
            href="/campaigns/new"
            className="flex h-10 items-center rounded-xl bg-[#3964ff] px-4 text-[13px] font-bold text-white shadow-md hover:bg-[#2f55df]"
          >
            + Tạo Campaign
          </Link>
        </div>
      </div>

      <div className="campaign-advanced-scroll max-h-[calc(100vh-310px)] overflow-auto">
        <table
          className="campaign-advanced-table text-left text-sm"
          style={{ minWidth: `${tableWidth}px`, width: `${tableWidth}px` }}
        >
          <thead>
            <tr>
              {orderedColumns.map((column) => {
                const pinned = pinnedColumns.includes(column.key);

                return (
                  <th
                    key={column.key}
                    draggable
                    onDragStart={() => setDraggingColumn(column.key)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(column.key)}
                    className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-black uppercase tracking-[0.04em] text-slate-700"
                    style={{
                      width: column.width,
                      minWidth: column.width,
                      maxWidth: column.width,
                      position: "sticky",
                      top: 0,
                      zIndex: pinned ? 90 : 50,
                      ...getStickyStyle(column),
                      background: "#f8fafc",
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="cursor-grab select-none whitespace-nowrap">
                        {column.label}
                      </span>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePin(column.key);
                        }}
                        title={pinned ? "Bỏ cố định cột" : "Cố định cột"}
                        className={`flex h-6 w-6 items-center justify-center rounded-md text-[12px] ${
                          pinned
                            ? "bg-red-50 text-red-600"
                            : "bg-white text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        📌
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={orderedColumns.length}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  Đang tải dữ liệu Campaign...
                </td>
              </tr>
            )}

            {!loading && campaigns.length === 0 && (
              <tr>
                <td
                  colSpan={orderedColumns.length}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  Không có Campaign phù hợp với bộ lọc.
                </td>
              </tr>
            )}

            {!loading &&
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="group">
                  {orderedColumns.map((column) => {
                    const pinned = pinnedColumns.includes(column.key);
                    const cellKey = `${campaign.id}_${column.field || column.key}`;

                    return (
                      <td
                        key={column.key}
                        className="border-b border-slate-100 bg-white px-2 py-1.5 text-[12.5px] text-slate-800 group-hover:bg-slate-50"
                        style={{
                          width: column.width,
                          minWidth: column.width,
                          maxWidth: column.width,
                          ...getStickyStyle(column),
                          zIndex: pinned ? 40 : 1,
                          background: pinned ? "#ffffff" : undefined,
                        }}
                      >
                        <CellEditor
                          campaign={campaign}
                          column={column}
                          saving={savingCell === cellKey}
                          onSave={(value) => updateCell(campaign, column, value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CellEditor({
  campaign,
  column,
  saving,
  onSave,
}: {
  campaign: DbRow;
  column: ColumnConfig;
  saving: boolean;
  onSave: (value: unknown) => void;
}) {
  if (column.type === "action") {
    return (
      <div className="flex items-center justify-center">
        <Link
          href={`/campaigns/${campaign.id}/edit`}
          title="Sửa Campaign"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] shadow-sm hover:border-blue-200 hover:bg-blue-50"
        >
          ✏️
        </Link>
      </div>
    );
  }

  const value = column.field ? campaign[column.field] : "";

  if (column.type === "readonly") {
    return (
      <div
        className="truncate font-semibold text-slate-700"
        title={formatCellDisplay(column, value)}
      >
        {formatCellDisplay(column, value)}
      </div>
    );
  }

  if (column.type === "select") {
    return (
      <div className="relative">
        <select
          defaultValue={String(value || "")}
          onChange={(event) => onSave(event.target.value || null)}
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
        >
          <option value="">-</option>
          {(column.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {saving && <SavingDot />}
      </div>
    );
  }
if (column.type === "date") {
  return (
    <div className="relative">
      <DatePickerInput
        name={`${column.key}_${String(value || "")}`}
        value={formatInputValue(column, value)}
        onChange={(nextValue) => onSave(nextValue)}
        className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 pr-8 text-[12px] outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
      />

      {saving && <SavingDot />}
    </div>
  );
}
  return (
    <div className="relative">
      <input
        defaultValue={formatInputValue(column, value)}
        onBlur={(event) => onSave(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
      />
      {saving && <SavingDot />}
    </div>
  );
}

function SavingDot() {
  return (
    <span className="absolute right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500" />
  );
}

function normalizeValueForSave(column: ColumnConfig, value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  if (column.type === "number") {
    const cleaned = raw.replace(/\./g, "").replace(/,/g, "");
    const numberValue = Number(cleaned);
    return Number.isNaN(numberValue) ? null : numberValue;
  }

  if (column.type === "date") {
    return parseVietnameseDateInput(raw);
  }

  return raw;
}

function normalizeValueForCompare(column: ColumnConfig, value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (column.type === "date") {
    const raw = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    return parseVietnameseDateInput(formatDateForDisplay(raw));
  }

  if (column.type === "number") {
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : numberValue;
  }

  return String(value);
}

function formatInputValue(column: ColumnConfig, value: unknown) {
  if (!value) return "";

  if (column.type === "date") {
    return formatDateForDisplay(value);
  }

  return String(value);
}

function formatCellDisplay(column: ColumnConfig, value: unknown) {
  if (!value) return "-";

  if (column.type === "date") {
    return formatDateForDisplay(value) || "-";
  }

  if (column.type === "number") {
    const numberValue = Number(value);
    return Number.isNaN(numberValue)
      ? String(value)
      : numberValue.toLocaleString("vi-VN");
  }

  return String(value);
}

function parseVietnameseDateInput(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split("/");
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return raw;
}

function formatDateForDisplay(value: unknown) {
  if (!value) return "";

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

    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
