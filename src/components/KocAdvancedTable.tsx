"use client";

import { supabase } from "@/lib/supabase/client";
import DatePickerInput from "@/components/DatePickerInput";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type DbRow = Record<string, any>;

type ColumnType =
  | "action"
  | "text"
  | "number"
  | "date"
  | "select"
  | "readonly"
  | "multiselect";

type ColumnConfig = {
  key: string;
  label: string;
  field?: string;
  type: ColumnType;
  width: number;
  options?: string[];
  readonly?: boolean;
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

const statusOptions = [
  "Chờ phản hồi",
  "Đã phản hồi",
  "Cân nhắc",
  "Đã chốt",
  "Từ chối",
  "Trùng KOC",
];

const channelTypeOptions = ["Người thật", "AI", "Unbox", "POV"];
const maritalStatusOptions = ["Đã kết hôn", "Đã có con"];
const platformOptions = ["TikTok", "FB", "Shopee"];

const defaultColumns: ColumnConfig[] = [
  {
    key: "employee_id",
    label: "PIC phụ trách",
    field: "employee_id",
    type: "select",
    width: 145,
  },
  {
    key: "Id_tiktok_Ten_fb",
    label: "ID TikTok/Tên FB",
    field: "Id_tiktok_Ten_fb",
    type: "text",
    width: 175,
  },
  {
    key: "koc_code",
    label: "Mã KOC",
    field: "koc_code",
    type: "readonly",
    width: 125,
  },
  {
    key: "name",
    label: "Tên KOC",
    field: "name",
    type: "text",
    width: 165,
  },
  {
    key: "follower",
    label: "Follower",
    field: "follower",
    type: "number",
    width: 105,
  },
  {
    key: "tier",
    label: "Tier",
    field: "tier",
    type: "select",
    options: tierOptions,
    width: 130,
  },
  {
    key: "status",
    label: "Status",
    field: "status",
    type: "select",
    options: statusOptions,
    width: 135,
  },
  {
    key: "platform",
    label: "Nền tảng",
    field: "platform",
    type: "multiselect",
    options: platformOptions,
    width: 170,
  },
  {
    key: "channel_type",
    label: "Channel type",
    field: "channel_type",
    type: "select",
    options: channelTypeOptions,
    width: 145,
  },
  {
    key: "email",
    label: "Email",
    field: "email",
    type: "text",
    width: 170,
  },
  {
    key: "phone",
    label: "SĐT/Zalo",
    field: "phone",
    type: "text",
    width: 135,
  },
  {
    key: "address",
    label: "Address",
    field: "address",
    type: "text",
    width: 220,
  },
  {
    key: "note",
    label: "Note",
    field: "note",
    type: "text",
    width: 240,
  },
  {
    key: "booking_date",
    label: "Booking date",
    field: "booking_date",
    type: "date",
    width: 130,
  },
  {
    key: "date_of_birth",
    label: "Date of birth",
    field: "date_of_birth",
    type: "date",
    width: 130,
  },
  {
    key: "number_of_videos",
    label: "Daily Videos(T-1)",
    field: "number_of_videos",
    type: "number",
    width: 145,
  },
  {
    key: "monthly_videos",
    label: "Monthly Videos",
    field: "monthly_videos",
    type: "number",
    width: 145,
  },
  {
    key: "campaign_id",
    label: "Campaign name",
    field: "campaign_id",
    type: "select",
    width: 175,
  },
  {
    key: "gmv",
    label: "GMV ngày",
    field: "gmv",
    type: "number",
    width: 115,
  },
  {
    key: "gmv_thang",
    label: "GMV tháng",
    field: "gmv_thang",
    type: "number",
    width: 115,
  },
  {
    key: "marital_status",
    label: "Marital status",
    field: "marital_status",
    type: "select",
    options: maritalStatusOptions,
    width: 145,
  },
  {
    key: "cast_price",
    label: "Giá cast",
    field: "cast_price",
    type: "number",
    width: 115,
  },
  {
    key: "created_at",
    label: "Ngày tạo",
    field: "created_at",
    type: "readonly",
    width: 125,
  },
  {
    key: "new_contact_date",
    label: "CS gần nhất",
    field: "new_contact_date",
    type: "date",
    width: 125,
  },
  {
    key: "time_contact",
    label: "Time liên hệ",
    field: "new_contact_date",
    type: "readonly",
    width: 115,
  },
  {
    key: "facebook_link",
    label: "Link Facebook",
    field: "facebook_link",
    type: "text",
    width: 190,
  },
  {
    key: "tiktok_link",
    label: "Link TikTok",
    field: "tiktok_link",
    type: "text",
    width: 190,
  },
];

const selectColumnWidth = 52;
const storageKeyOrder = "drkam_koc_column_order_v2";
const storageKeyPinned = "drkam_koc_pinned_columns_v2";
const storageKeyWidths = "drkam_koc_column_widths_v1";
const defaultVisibleColumnKeys = [
  "employee_id",
  "Id_tiktok_Ten_fb",
  "koc_code",
  "name",
  "follower",
  "tier",
  "status",
  "platform",
  "channel_type",
  "phone",
  "created_at",
  "new_contact_date",
  "time_contact",
  "note",
];

export default function KocAdvancedTable({
  kocs = [],
  campaigns = [],
  employees = [],
  visibleColumnKeys = defaultVisibleColumnKeys,
  resetLayoutSignal,
  loading,
  onExport,
  onKocUpdated,
  onKocDeleted,
}: {
  kocs?: DbRow[];
  campaigns?: DbRow[];
  employees?: DbRow[];
  visibleColumnKeys?: string[];
  resetLayoutSignal?: number;
  loading: boolean;
  onExport: () => void;
  onKocUpdated: (id: string, patch: DbRow) => void;
  onKocDeleted?: (ids: string[]) => void;
}) {
  const router = useRouter();

  const [columnOrder, setColumnOrder] = useState<string[]>(
    defaultColumns.map((column) => column.key)
  );
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [draggingColumn, setDraggingColumn] = useState("");
  const [savingCell, setSavingCell] = useState("");
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkField, setBulkField] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkClearField, setBulkClearField] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const firstResetSignalRef = useRef(resetLayoutSignal);

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

    const savedWidths = window.localStorage.getItem(storageKeyWidths);
    if (savedWidths) {
      try {
        const parsed = JSON.parse(savedWidths);
        if (parsed && typeof parsed === "object") {
          setColumnWidths(parsed as Record<string, number>);
        }
      } catch {
        // Ignore invalid localStorage data.
      }
    }
  }, []);

  useEffect(() => {
    if (resetLayoutSignal === undefined) return;

    if (firstResetSignalRef.current === resetLayoutSignal) return;

    resetLayout();
  }, [resetLayoutSignal]);

  useEffect(() => {
    const visibleIdSet = new Set(kocs.map((koc) => String(koc.id)));
    setSelectedIds((current) => current.filter((id) => visibleIdSet.has(id)));
  }, [kocs]);

  const campaignMap = useMemo(() => {
    const map = new Map<string, DbRow>();

    campaigns.forEach((campaign) => {
      if (campaign.id) {
        map.set(String(campaign.id), campaign);
      }

      if (campaign.campaign_code) {
        map.set(String(campaign.campaign_code), campaign);
      }

      if (campaign.campaign_name) {
        map.set(String(campaign.campaign_name), campaign);
      }
    });

    return map;
  }, [campaigns]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, DbRow>();

    employees.forEach((employee) => {
      if (employee.id) {
        map.set(String(employee.id), employee);
      }
    });

    return map;
  }, [employees]);

  const columnMap = useMemo(() => {
    return new Map(defaultColumns.map((column) => [column.key, column]));
  }, []);

  const visibleColumnKeySet = useMemo(() => {
    return new Set(visibleColumnKeys);
  }, [visibleColumnKeys]);

const orderedColumns = useMemo(() => {
    return columnOrder
      .map((key) => columnMap.get(key))
      .filter((column): column is ColumnConfig => column !== undefined)
      .filter((column) => visibleColumnKeySet.has(column.key));
  }, [columnOrder, columnMap, visibleColumnKeySet]);

  const editableColumns = useMemo(() => {
    return defaultColumns.filter((column) => {
      return (
        Boolean(column.field) &&
        !column.readonly &&
        column.type !== "action" &&
        column.type !== "readonly"
      );
    });
  }, []);

  const selectedCount = selectedIds.length;

  const visibleIds = useMemo(() => {
    return kocs.map((koc) => String(koc.id)).filter(Boolean);
  }, [kocs]);

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const selectedIdSet = useMemo(() => {
    return new Set(selectedIds);
  }, [selectedIds]);

  const bulkColumn = useMemo(() => {
    return editableColumns.find((column) => column.field === bulkField) || null;
  }, [bulkField, editableColumns]);

  const bulkClearColumn = useMemo(() => {
    return (
      editableColumns.find((column) => column.field === bulkClearField) || null
    );
  }, [bulkClearField, editableColumns]);

  const tableWidth = useMemo(() => {
    return (
      selectColumnWidth +
      orderedColumns.reduce(
        (sum, column) => sum + (columnWidths[column.key] ?? column.width),
        0
      )
    );
  }, [orderedColumns, columnWidths]);

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
    savePinnedColumns([]);
    setColumnWidths({});
    window.localStorage.removeItem(storageKeyWidths);
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

  function getColumnWidth(column: ColumnConfig) {
    return columnWidths[column.key] ?? column.width;
  }

  function getStickyStyle(column: ColumnConfig) {
    if (!pinnedColumns.includes(column.key)) {
      return {};
    }

    const pinnedOrdered = orderedColumns.filter((item) =>
      pinnedColumns.includes(item.key)
    );

    const index = pinnedOrdered.findIndex((item) => item.key === column.key);

    const left =
      selectColumnWidth +
      pinnedOrdered
        .slice(0, index)
        .reduce((sum, item) => sum + getColumnWidth(item), 0);

    return {
      position: "sticky" as const,
      left,
      boxShadow: "1px 0 0 #e2e8f0",
    };
  }

  async function updateCell(
    koc: DbRow,
    column: ColumnConfig,
    rawValue: unknown
  ) {
    if (!column.field || column.readonly || column.type === "action") return;

    const nextValue = normalizeValueForSave(column, rawValue);
    const currentValue = normalizeValueForCompare(column, koc[column.field]);

    if (String(nextValue ?? "") === String(currentValue ?? "")) {
      return;
    }

    const cellKey = `${koc.id}_${column.field}`;
    setSavingCell(cellKey);
    setError("");

    const { error: updateError } = await supabase
      .from("koc")
      .update({ [column.field]: nextValue })
      .eq("id", koc.id);

    if (updateError) {
      setError(`Lỗi lưu ${column.label}: ${updateError.message}`);
    } else {
      onKocUpdated(String(koc.id), { [column.field]: nextValue });
    }

    setSavingCell("");
  }


  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      const visibleSet = new Set(visibleIds);
      setSelectedIds((current) => current.filter((id) => !visibleSet.has(id)));
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function bulkUpdateSelected() {
    if (selectedCount === 0) {
      setError("Chưa chọn KOC nào để cập nhật hàng loạt.");
      return;
    }

    if (!bulkColumn || !bulkColumn.field) {
      setError("Chưa chọn trường cần sửa hàng loạt.");
      return;
    }

    const nextValue = normalizeValueForSave(bulkColumn, bulkValue);

    if (nextValue === null || nextValue === "") {
      setError(
        "Giá trị cập nhật đang trống. Nếu muốn xóa trắng, dùng mục Xóa trắng trường."
      );
      return;
    }

    const confirmMessage = `Cập nhật trường "${bulkColumn.label}" cho ${selectedCount} KOC đã chọn?`;

    if (!window.confirm(confirmMessage)) return;

    setBulkSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("koc")
      .update({ [bulkColumn.field]: nextValue })
      .in("id", selectedIds);

    if (updateError) {
      setError(`Lỗi cập nhật hàng loạt: ${updateError.message}`);
      setBulkSaving(false);
      return;
    }

    selectedIds.forEach((id) => {
      onKocUpdated(id, { [bulkColumn.field!]: nextValue });
    });

    setBulkValue("");
    setBulkSaving(false);
  }

  async function bulkClearSelectedField() {
    if (selectedCount === 0) {
      setError("Chưa chọn KOC nào để xóa trắng trường.");
      return;
    }

    if (!bulkClearColumn || !bulkClearColumn.field) {
      setError("Chưa chọn trường cần xóa trắng.");
      return;
    }

    const confirmMessage = `Xóa trắng trường "${bulkClearColumn.label}" của ${selectedCount} KOC đã chọn?`;

    if (!window.confirm(confirmMessage)) return;

    setBulkSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("koc")
      .update({ [bulkClearColumn.field]: null })
      .in("id", selectedIds);

    if (updateError) {
      setError(`Lỗi xóa trắng hàng loạt: ${updateError.message}`);
      setBulkSaving(false);
      return;
    }

    selectedIds.forEach((id) => {
      onKocUpdated(id, { [bulkClearColumn.field!]: null });
    });

    setBulkClearField("");
    setBulkSaving(false);
  }

  async function bulkDeleteSelectedRows() {
    if (selectedCount === 0) {
      setError("Chưa chọn KOC nào để xóa.");
      return;
    }

    const confirmMessage = `XÓA VĨNH VIỄN ${selectedCount} KOC đã chọn? Thao tác này không hoàn tác được.`;

    if (!window.confirm(confirmMessage)) return;

    const secondConfirm = window.confirm(
      "Xác nhận lần 2: Chị chắc chắn muốn xóa các KOC này khỏi database?"
    );

    if (!secondConfirm) return;

    setBulkDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("koc")
      .delete()
      .in("id", selectedIds);

    if (deleteError) {
      setError(`Lỗi xóa KOC hàng loạt: ${deleteError.message}`);
      setBulkDeleting(false);
      return;
    }

    if (onKocDeleted) {
      onKocDeleted(selectedIds);
      setSelectedIds([]);
      setBulkDeleting(false);
      return;
    }

    window.location.reload();
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      {error && (
        <div className="border-b border-slate-200 px-5 py-3">
          <p className="text-[12px] font-bold text-red-600">{error}</p>
        </div>
      )}

      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-black text-slate-700">
              Đã chọn: {selectedCount} KOC
            </span>

            {selectedCount > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-100"
              >
                Bỏ chọn
              </button>
            )}
          </div>

          <p className="text-[12px] font-semibold text-slate-500">
            Chọn 1 KOC để Tạo Booking / Sửa KOC; chọn từ 2 KOC trở lên để thao
            tác hàng loạt.
          </p>
        </div>

        {selectedCount === 1 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/bookings/new?koc_id=${selectedIds[0]}`}
              className="flex h-9 items-center rounded-xl bg-[#3964ff] px-4 text-[12.5px] font-black text-white shadow-sm hover:bg-[#2f55df]"
            >
              + Tạo Booking
            </Link>

            <Link
              href={`/koc/${selectedIds[0]}/edit`}
              className="flex h-9 items-center rounded-xl bg-emerald-600 px-4 text-[12.5px] font-black text-white shadow-sm hover:bg-emerald-700"
            >
              Sửa KOC
            </Link>

            <button
              type="button"
              disabled={bulkDeleting}
              onClick={bulkDeleteSelectedRows}
              className="flex h-9 items-center rounded-xl bg-red-600 px-4 text-[12.5px] font-black text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleting ? "Đang xóa..." : "Xóa KOC"}
            </button>
          </div>
        )}

        {selectedCount >= 2 && (
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_auto_1fr_auto_auto] xl:items-center">
          <select
            value={bulkField}
            onChange={(event) => {
              setBulkField(event.target.value);
              setBulkValue("");
            }}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
          >
            <option value="">Chọn trường cần sửa hàng loạt</option>
            {editableColumns.map((column) => (
              <option key={column.field} value={column.field}>
                {column.label}
              </option>
            ))}
          </select>

          <BulkValueInput
            column={bulkColumn}
            value={bulkValue}
            campaigns={campaigns}
            employees={employees}
            onChange={setBulkValue}
          />

          <button
            type="button"
            disabled={bulkSaving || selectedCount === 0}
            onClick={bulkUpdateSelected}
            className="h-9 rounded-xl bg-[#3964ff] px-4 text-[12.5px] font-black text-white shadow-sm hover:bg-[#2f55df] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkSaving ? "Đang xử lý..." : "Cập nhật hàng loạt"}
          </button>

          <select
            value={bulkClearField}
            onChange={(event) => setBulkClearField(event.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
          >
            <option value="">Chọn trường cần xóa trắng</option>
            {editableColumns.map((column) => (
              <option key={column.field} value={column.field}>
                {column.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={bulkSaving || selectedCount === 0}
              onClick={bulkClearSelectedField}
              className="h-9 rounded-xl border border-orange-200 bg-orange-50 px-4 text-[12.5px] font-black text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xóa trắng trường
            </button>

            <button
              type="button"
              disabled={bulkDeleting || selectedCount === 0}
              onClick={bulkDeleteSelectedRows}
              className="h-9 rounded-xl bg-red-600 px-4 text-[12.5px] font-black text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleting ? "Đang xóa..." : "Xóa KOC đã chọn"}
            </button>
          </div>
          </div>
        )}
      </div>

      <div className="koc-advanced-scroll max-h-[calc(100vh-375px)] overflow-auto">
        <table
          className="koc-advanced-table text-left text-sm"
          style={{ minWidth: `${tableWidth}px`, width: `${tableWidth}px` }}
        >
          <thead>
            <tr>
              <th
                className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-[11px] font-black uppercase tracking-[0.04em] text-slate-700"
                style={{
                  width: selectColumnWidth,
                  minWidth: selectColumnWidth,
                  maxWidth: selectColumnWidth,
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 100,
                  background: "#f8fafc",
                  boxShadow: "1px 0 0 #e2e8f0",
                }}
              >
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  title="Chọn tất cả KOC đang hiển thị"
                  className="h-4 w-4 cursor-pointer accent-red-600"
                />
              </th>

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
                      width: getColumnWidth(column),
                      minWidth: getColumnWidth(column),
                      maxWidth: getColumnWidth(column),
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

                    <div
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        const key = column.key;
                        const startX = event.clientX;
                        const startWidth = getColumnWidth(column);

                        function onMove(moveEvent: MouseEvent) {
                          const nextWidth = Math.max(
                            60,
                            startWidth + (moveEvent.clientX - startX)
                          );
                          setColumnWidths((prev) => ({
                            ...prev,
                            [key]: nextWidth,
                          }));
                        }

                        function onUp() {
                          document.removeEventListener("mousemove", onMove);
                          document.removeEventListener("mouseup", onUp);
                          setColumnWidths((prev) => {
                            window.localStorage.setItem(
                              storageKeyWidths,
                              JSON.stringify(prev)
                            );
                            return prev;
                          });
                        }

                        document.addEventListener("mousemove", onMove);
                        document.addEventListener("mouseup", onUp);
                      }}
                      onClick={(event) => event.stopPropagation()}
                      title="Kéo để chỉnh độ rộng cột"
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#3964ff]/40"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={orderedColumns.length + 1}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  Đang tải dữ liệu KOC...
                </td>
              </tr>
            )}

            {!loading && kocs.length === 0 && (
              <tr>
                <td
                  colSpan={orderedColumns.length + 1}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  Không có KOC phù hợp với bộ lọc.
                </td>
              </tr>
            )}

            {!loading &&
              kocs.map((koc) => {
                const kocId = String(koc.id);
                const selected = selectedIdSet.has(kocId);

                return (
                  <tr
                    key={koc.id}
                    onClick={(event) => {
                      const el = event.target as HTMLElement;
                      if (
                        el.closest("input, select, textarea, button, a, label")
                      ) {
                        return;
                      }
                      router.push(`/koc/${koc.id}`);
                    }}
                    className={`group cursor-pointer ${
                      selected ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td
                      className="border-b border-slate-100 bg-white px-2 py-1.5 text-center text-[12.5px] text-slate-800 group-hover:bg-slate-50"
                      style={{
                        width: selectColumnWidth,
                        minWidth: selectColumnWidth,
                        maxWidth: selectColumnWidth,
                        position: "sticky",
                        left: 0,
                        zIndex: 60,
                        background: selected ? "#fff1f2" : "#ffffff",
                        boxShadow: "1px 0 0 #e2e8f0",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelectOne(kocId)}
                        className="h-4 w-4 cursor-pointer accent-red-600"
                      />
                    </td>

                    {orderedColumns.map((column) => {
                      const pinned = pinnedColumns.includes(column.key);
                      const cellKey = `${koc.id}_${column.field || column.key}`;

                      return (
                        <td
                          key={column.key}
                          className="border-b border-slate-100 bg-white px-2 py-1.5 text-[12.5px] text-slate-800 group-hover:bg-slate-50"
                          style={{
                            width: getColumnWidth(column),
                            minWidth: getColumnWidth(column),
                            maxWidth: getColumnWidth(column),
                            ...getStickyStyle(column),
                            zIndex: pinned ? 40 : 1,
                            background: pinned
                              ? selected
                                ? "#fff1f2"
                                : "#ffffff"
                              : selected
                                ? "#fff7f7"
                                : undefined,
                          }}
                        >
                          <CellEditor
                            koc={koc}
                            column={column}
                            campaigns={campaigns}
                            campaignMap={campaignMap}
                            employees={employees}
                            employeeMap={employeeMap}
                            saving={savingCell === cellKey}
                            onSave={(value) => updateCell(koc, column, value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BulkValueInput({
  column,
  value,
  campaigns,
  employees,
  onChange,
}: {
  column: ColumnConfig | null;
  value: string;
  campaigns: DbRow[];
  employees: DbRow[];
  onChange: (value: string) => void;
}) {
  if (!column) {
    return (
      <input
        disabled
        value=""
        placeholder="Chọn trường trước"
        className="h-9 rounded-xl border border-slate-200 bg-slate-100 px-3 text-[12.5px] font-semibold text-slate-400 outline-none"
        onChange={() => undefined}
      />
    );
  }

  if (column.key === "employee_id") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
      >
        <option value="">Chọn PIC mới</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {getEmployeeDisplayName(employee)}
          </option>
        ))}
      </select>
    );
  }

  if (column.key === "campaign_id") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
      >
        <option value="">Chọn Campaign mới</option>
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {getCampaignDisplayName(campaign)}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "select") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={getSelectColorStyle(column.key, value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
      >
        <option value="">Chọn giá trị mới</option>
        {(column.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "multiselect") {
    return (
      <MultiSelectDropdown
        value={value}
        options={column.options || []}
        onChange={onChange}
        compact
      />
    );
  }

  if (column.type === "date") {
    return (
      <DatePickerInput
        name={`bulk_${column.key}`}
        value={value}
        onChange={onChange}
        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 pr-9 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
      />
    );
  }

  return (
    <input
      value={value}
      type="text"
      onChange={(event) => onChange(event.target.value)}
      placeholder={
        column.type === "number"
          ? "Nhập số mới"
          : `Nhập ${column.label.toLowerCase()} mới`
      }
      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
    />
  );
}

function CellEditor({
  koc,
  column,
  campaigns,
  campaignMap,
  employees,
  employeeMap,
  saving,
  onSave,
}: {
  koc: DbRow;
  column: ColumnConfig;
  campaigns: DbRow[];
  campaignMap: Map<string, DbRow>;
  employees: DbRow[];
  employeeMap: Map<string, DbRow>;
  saving: boolean;
  onSave: (value: unknown) => void;
}) {

  const value = column.field ? koc[column.field] : "";

  if (column.key === "employee_id") {
    return (
      <div className="relative">
        <select
          value={String(value || "")}
          onChange={(event) => onSave(event.target.value || null)}
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
        >
          <option value="">Chưa có PIC</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {getEmployeeDisplayName(employee)}
            </option>
          ))}
        </select>

        {saving && <SavingDot />}
      </div>
    );
  }

  if (column.key === "campaign_id") {
    const currentValue = String(value || "");
    const currentExists = campaigns.some(
      (campaign) => String(campaign.id) === currentValue
    );

    return (
      <div className="relative">
        <select
          value={currentValue}
          onChange={(event) => onSave(event.target.value || null)}
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
        >
          <option value="">-</option>

          {currentValue && !currentExists && (
            <option value={currentValue}>
              {getCampaignDisplayName(campaignMap.get(currentValue)) ||
                currentValue}
            </option>
          )}

          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {getCampaignDisplayName(campaign)}
            </option>
          ))}
        </select>

        {saving && <SavingDot />}
      </div>
    );
  }

  if (column.type === "readonly") {
    return (
      <div
        className="truncate font-semibold text-slate-700"
        title={formatCellDisplay(column, value, campaignMap, employeeMap)}
      >
        {formatCellDisplay(column, value, campaignMap, employeeMap)}
      </div>
    );
  }

  if (column.type === "select") {
    return (
      <div className="relative">
        <select
          value={String(value || "")}
          onChange={(event) => onSave(event.target.value || null)}
          style={getSelectColorStyle(column.key, value)}
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] font-bold outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
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

  if (column.type === "multiselect") {
    return (
      <div className="relative">
        <MultiSelectDropdown
          value={String(value || "")}
          options={column.options || []}
          onChange={(nextValue) => onSave(nextValue || null)}
        />

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


function parseMultiList(value: unknown) {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function MultiSelectDropdown({
  value,
  options,
  onChange,
  compact = false,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<Record<string, string | number>>(
    {}
  );
  const [selectedValues, setSelectedValues] = useState<string[]>(() =>
    parseMultiList(value)
  );

  useEffect(() => {
    setSelectedValues(parseMultiList(value));
  }, [value]);

  const allOptions = useMemo(() => {
    return Array.from(new Set([...options, ...selectedValues]));
  }, [options, selectedValues]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const panelWidth = Math.max(compact ? 240 : 260, rect.width);
      const estimatedHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - panelWidth - 8)
      );

      setPanelStyle({
        position: "fixed",
        left,
        top: openAbove ? "auto" : rect.bottom + 6,
        bottom: openAbove ? window.innerHeight - rect.top + 6 : "auto",
        width: panelWidth,
        zIndex: 9999,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, compact]);

  function toggleValue(item: string) {
    const selectedSet = new Set(selectedValues);

    if (selectedSet.has(item)) {
      selectedSet.delete(item);
    } else {
      selectedSet.add(item);
    }

    const nextValues = allOptions.filter((option) => selectedSet.has(option));

    setSelectedValues(nextValues);
    onChange(nextValues.join(", "));
  }

  function clearValues() {
    setSelectedValues([]);
    onChange("");
  }

  const displayText =
    selectedValues.length === 0
      ? "Chọn nền tảng"
      : selectedValues.join(", ");

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        title={selectedValues.join(", ") || "Chọn nền tảng"}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border text-left font-semibold outline-none transition ${
          compact
            ? "h-9 border-slate-200 bg-white px-3 text-[12.5px]"
            : "h-8 border-transparent bg-transparent px-2 text-[12px] hover:border-slate-200 hover:bg-white"
        } ${open ? "border-[#3964ff] bg-white ring-2 ring-[#3964ff]/10" : ""}`}
      >
        <span
          className={
            selectedValues.length > 0
              ? "truncate text-slate-800"
              : "truncate text-slate-400"
          }
        >
          {displayText}
        </span>

        <span className="shrink-0 text-[11px] text-slate-500">
          {selectedValues.length > 0 ? selectedValues.length : "⌄"}
        </span>
      </button>

      {open && (
        <div
          style={panelStyle}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <div>
              <p className="text-[12px] font-black text-slate-950">
                Chọn nền tảng
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                Có thể chọn nhiều nền tảng
              </p>
            </div>

            <button
              type="button"
              onClick={clearValues}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              Xóa chọn
            </button>
          </div>

          <div className="max-h-[260px] overflow-auto p-2">
            {allOptions.map((item) => {
              const checked = selectedValues.includes(item);

              return (
                <label
                  key={item}
                  className={`mb-1 flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold transition last:mb-0 ${
                    checked
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-transparent bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(item)}
                    className="h-4 w-4 shrink-0 accent-[#3964ff]"
                  />

                  <span className="leading-5">{item}</span>
                </label>
              );
            })}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
            Đã chọn: {selectedValues.length} nền tảng
          </div>
        </div>
      )}
    </div>
  );
}

function getSelectColorStyle(columnKey: string, value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return {};

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    "VIP": { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" },
    "Tiềm năng": { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    "Chăm chỉ": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    "Mới hoạt động": { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
    "Ngủ đông": { bg: "#e5e7eb", text: "#374151", border: "#d1d5db" },
    "Mất cast": { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" },
    "Trùng KOC": { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    "Dừng CS": { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" },
    "Hoạt động lâu": { bg: "#cffafe", text: "#0e7490", border: "#a5f3fc" },

    "Chờ phản hồi": { bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
    "Đã phản hồi": { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    "Cân nhắc": { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
    "Đã chốt": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    "Từ chối": { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" },

    "Người thật": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    "AI": { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" },
    "Unbox": { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
    "POV": { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },

    "Đã kết hôn": { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" },
    "Đã có con": { bg: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
  };

  const color = colorMap[raw];

  if (!color) return {};

  return {
    backgroundColor: color.bg,
    color: color.text,
    borderColor: color.border,
    fontWeight: 800,
  };
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

function getVietnamTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function dateKeyToUtcTime(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
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

function formatCellDisplay(
  column: ColumnConfig,
  value: unknown,
  campaignMap: Map<string, DbRow>,
  employeeMap: Map<string, DbRow>
) {
  if (column.key === "time_contact") {
    return formatContactAgeDisplay(value);
  }

  if (!value) return "-";

  if (column.key === "employee_id") {
    return getEmployeeDisplayName(employeeMap.get(String(value)));
  }

  if (column.key === "campaign_id") {
    return getCampaignDisplayName(campaignMap.get(String(value))) || String(value);
  }

  if (column.key === "created_at" || column.type === "date") {
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

  if (/^\d{8}$/.test(raw)) {
    const day = raw.slice(0, 2);
    const month = raw.slice(2, 4);
    const year = raw.slice(4, 8);

    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, monthRaw, dayRaw] = raw.split("-");
    const month = monthRaw.padStart(2, "0");
    const day = dayRaw.padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split("/");
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split("-");
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

function getCampaignDisplayName(campaign?: DbRow | null) {
  if (!campaign) return "";

  return (
    campaign.campaign_name ||
    campaign.campaign_code ||
    campaign.product_name ||
    "Chưa rõ Campaign"
  );
}

function getEmployeeDisplayName(employee?: DbRow | null) {
  if (!employee) return "Chưa có PIC";

  return employee.full_name || employee.employee_code || "Chưa rõ PIC";
}