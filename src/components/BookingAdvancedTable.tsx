"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DatePickerInput from "@/components/DatePickerInput";
import { useEffect, useMemo, useRef, useState } from "react";

type DbRow = Record<string, any>;

type ColumnType = "action" | "text" | "number" | "date" | "select" | "multiselect" | "readonly";

type ColumnConfig = {
  key: string;
  label: string;
  field?: string;
  type: ColumnType;
  width: number;
  options?: string[];
  readonly?: boolean;
};

const bookingTypeOptions = [
  "Booking vid",
  "Booking live",
  "Booking vid+live",
  "Quà Tết",
  "Quà Tri Ân",
  "Quà Sinh Nhật",
];

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

const statusBookingOptions = [
  "Chờ nhận SP",
  "Đang lên video",
  "Đã đăng video",
  "Đã thanh toán",
];

const orderStatusOptions = [
  "Đã gửi",
  "Giao thành công",
  "Giao không thành công",
];

const defaultColumns: ColumnConfig[] = [
  { key: "koc_id", label: "ID TikTok/Tên FB", field: "koc_id", type: "readonly", width: 190 },
  {
    key: "koc_name",
    label: "Tên KOC",
    type: "readonly",
    width: 165,
  },
  {
    key: "koc_address",
    label: "Địa chỉ",
    type: "readonly",
    width: 220,
  },
  {
    key: "koc_phone",
    label: "SĐT/Zalo",
    type: "readonly",
    width: 135,
  },
  {
    key: "employee_id",
    label: "PIC phụ trách",
    field: "employee_id",
    type: "select",
    width: 125,
  },
  {
    key: "booking_type",
    label: "Loại booking",
    field: "booking_type",
    type: "select",
    options: bookingTypeOptions,
    width: 155,
  },
  {
    key: "status_booking",
    label: "Status booking",
    field: "status_booking",
    type: "select",
    options: statusBookingOptions,
    width: 150,
  },
  {
    key: "cast_price",
    label: "Giá cast",
    field: "cast_price",
    type: "number",
    width: 105,
  },
  {
    key: "created_at",
    label: "Ngày tạo booking",
    field: "created_at",
    type: "readonly",
    width: 135,
  },
  {
    key: "expected_post_date",
    label: "Ngày dự kiến đăng",
    field: "expected_post_date",
    type: "date",
    width: 135,
  },
  {
    key: "actual_post_date",
    label: "Ngày đăng thực tế",
    field: "actual_post_date",
    type: "date",
    width: 135,
  },
  {
    key: "product",
    label: "Sản phẩm",
    field: "product",
    type: "multiselect",
    options: productOptions,
    width: 275,
  },
  {
    key: "order_items",
    label: "Chi tiết SP",
    field: "order_items",
    type: "readonly",
    width: 260,
  },
  {
    key: "quantity",
    label: "Số lượng",
    field: "quantity",
    type: "number",
    width: 95,
  },
  {
    key: "order_value",
    label: "Giá trị đơn",
    field: "order_value",
    type: "number",
    width: 120,
  },
  {
    key: "delivery_address",
    label: "Địa chỉ giao hàng",
    field: "delivery_address",
    type: "text",
    width: 240,
  },
  {
    key: "recipient_phone",
    label: "SĐT nhận hàng",
    field: "recipient_phone",
    type: "text",
    width: 140,
  },
  {
    key: "ship_date",
    label: "Ngày gửi",
    field: "ship_date",
    type: "date",
    width: 130,
  },
  {
    key: "tracking_code",
    label: "Mã vận đơn",
    field: "tracking_code",
    type: "text",
    width: 160,
  },
  {
    key: "order_status",
    label: "Tình trạng đơn hàng",
    field: "order_status",
    type: "select",
    options: orderStatusOptions,
    width: 160,
  },
  {
    key: "note",
    label: "Ghi chú",
    field: "note",
    type: "text",
    width: 240,
  },
];

const selectColumnWidth = 52;
const storageKeyOrder = "drkam_booking_column_order_v4";
const storageKeyPinned = "drkam_booking_pinned_columns_v4";
const storageKeyWidths = "drkam_booking_column_widths_v1";

// Trường mà tài khoản "shipper" được phép sửa (còn lại chỉ xem)
const SHIPPER_EDITABLE_KEYS = ["ship_date", "tracking_code", "order_status"];

export default function BookingAdvancedTable({
  bookings,
  kocs,
  employees,
  loading,
  resetLayoutSignal,
  restricted = false,
  visibleColumnKeys,
  onBookingUpdated,
  onBookingDeleted,
}: {
  bookings: DbRow[];
  kocs: DbRow[];
  employees: DbRow[];
  loading: boolean;
  resetLayoutSignal?: number;
  restricted?: boolean;
  visibleColumnKeys?: string[];
  onBookingUpdated: (id: string, patch: DbRow) => void;
  onBookingDeleted?: (ids: string[]) => void;
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
    const visibleIdSet = new Set(bookings.map((booking) => String(booking.id)));
    setSelectedIds((current) => current.filter((id) => visibleIdSet.has(id)));
  }, [bookings]);

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

  const columnMap = useMemo(() => {
    return new Map(defaultColumns.map((column) => [column.key, column]));
  }, []);

  // Không truyền visibleColumnKeys -> hiện tất cả cột (giữ hành vi cũ)
  const visibleColumnKeySet = useMemo(() => {
    return visibleColumnKeys ? new Set(visibleColumnKeys) : null;
  }, [visibleColumnKeys]);

  const orderedColumns = useMemo(() => {
    return (
      columnOrder
        .map((key) => columnMap.get(key))
        .filter(Boolean) as ColumnConfig[]
    ).filter(
      (column) => !visibleColumnKeySet || visibleColumnKeySet.has(column.key)
    );
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

  const visibleIds = useMemo(() => {
    return bookings.map((booking) => String(booking.id)).filter(Boolean);
  }, [bookings]);

  const selectedIdSet = useMemo(() => {
    return new Set(selectedIds);
  }, [selectedIds]);

  const selectedCount = selectedIds.length;

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const bulkColumn = useMemo(() => {
    return editableColumns.find((column) => column.field === bulkField) || null;
  }, [bulkField, editableColumns]);

  const bulkClearColumn = useMemo(() => {
    return (
      editableColumns.find((column) => column.field === bulkClearField) || null
    );
  }, [bulkClearField, editableColumns]);

  // Chế độ hạn chế (shipper) ẩn cột checkbox -> không được cộng bề rộng của nó,
  // nếu không cột ghim sẽ lệch 52px và che mất nội dung.
  const leadingWidth = restricted ? 0 : selectColumnWidth;

  const tableWidth = useMemo(() => {
    return (
      leadingWidth +
      orderedColumns.reduce(
        (sum, column) => sum + (columnWidths[column.key] ?? column.width),
        0
      )
    );
  }, [leadingWidth, orderedColumns, columnWidths]);

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
      leadingWidth +
      pinnedOrdered
        .slice(0, index)
        .reduce((sum, item) => sum + getColumnWidth(item), 0);

    return {
      position: "sticky" as const,
      left,
      boxShadow: "1px 0 0 #e2e8f0",
    };
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

  async function updateCell(
    booking: DbRow,
    column: ColumnConfig,
    rawValue: unknown
  ) {
    if (!column.field || column.readonly || column.type === "action") return;

    const nextValue = normalizeValueForSave(column, rawValue);
    const currentValue = normalizeValueForCompare(column, booking[column.field]);

    if (String(nextValue ?? "") === String(currentValue ?? "")) {
      return;
    }

    const cellKey = `${booking.id}_${column.field}`;
    setSavingCell(cellKey);
    setError("");

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ [column.field]: nextValue })
      .eq("id", booking.id);

    if (updateError) {
      setError(`Lỗi lưu ${column.label}: ${updateError.message}`);
    } else {
      onBookingUpdated(String(booking.id), { [column.field]: nextValue });
    }

    setSavingCell("");
  }

  async function bulkUpdateSelected() {
    if (selectedCount === 0) {
      setError("Chưa chọn booking nào để cập nhật hàng loạt.");
      return;
    }

    if (!bulkColumn || !bulkColumn.field) {
      setError("Chưa chọn trường cần sửa hàng loạt.");
      return;
    }

    const nextValue = normalizeValueForSave(bulkColumn, bulkValue);

    if (nextValue === null || nextValue === "") {
      setError("Giá trị cập nhật đang trống. Nếu muốn xóa trắng, dùng mục Xóa trắng trường.");
      return;
    }

    const confirmMessage = `Cập nhật trường "${bulkColumn.label}" cho ${selectedCount} booking đã chọn?`;

    if (!window.confirm(confirmMessage)) return;

    setBulkSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ [bulkColumn.field]: nextValue })
      .in("id", selectedIds);

    if (updateError) {
      setError(`Lỗi cập nhật hàng loạt: ${updateError.message}`);
      setBulkSaving(false);
      return;
    }

    selectedIds.forEach((id) => {
      onBookingUpdated(id, { [bulkColumn.field!]: nextValue });
    });

    setBulkValue("");
    setBulkSaving(false);
  }

  async function bulkClearSelectedField() {
    if (selectedCount === 0) {
      setError("Chưa chọn booking nào để xóa trắng trường.");
      return;
    }

    if (!bulkClearColumn || !bulkClearColumn.field) {
      setError("Chưa chọn trường cần xóa trắng.");
      return;
    }

    const confirmMessage = `Xóa trắng trường "${bulkClearColumn.label}" của ${selectedCount} booking đã chọn?`;

    if (!window.confirm(confirmMessage)) return;

    setBulkSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ [bulkClearColumn.field]: null })
      .in("id", selectedIds);

    if (updateError) {
      setError(`Lỗi xóa trắng hàng loạt: ${updateError.message}`);
      setBulkSaving(false);
      return;
    }

    selectedIds.forEach((id) => {
      onBookingUpdated(id, { [bulkClearColumn.field!]: null });
    });

    setBulkClearField("");
    setBulkSaving(false);
  }

  async function bulkDeleteSelectedRows() {
    if (selectedCount === 0) {
      setError("Chưa chọn booking nào để xóa.");
      return;
    }

    const confirmMessage = `XÓA VĨNH VIỄN ${selectedCount} booking đã chọn? Thao tác này không hoàn tác được.`;

    if (!window.confirm(confirmMessage)) return;

    const secondConfirm = window.confirm(
      "Xác nhận lần 2: Chị chắc chắn muốn xóa các booking này khỏi database?"
    );

    if (!secondConfirm) return;

    setBulkDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .in("id", selectedIds);

    if (deleteError) {
      setError(`Lỗi xóa booking hàng loạt: ${deleteError.message}`);
      setBulkDeleting(false);
      return;
    }

    if (onBookingDeleted) {
      onBookingDeleted(selectedIds);
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

      {restricted && (
        <div className="border-b border-slate-200 bg-amber-50 px-5 py-2.5">
          <p className="text-[12px] font-bold text-amber-700">
            Tài khoản Giao hàng: chỉ xem và sửa 3 trường Ngày gửi, Mã vận đơn,
            Tình trạng đơn hàng.
          </p>
        </div>
      )}

      {!restricted && (
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-black text-slate-700">
              Đã chọn: {selectedCount} booking
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
            Chọn 1 booking để Sửa / Xóa; chọn từ 2 booking trở lên để thao tác
            hàng loạt.
          </p>
        </div>

        {selectedCount === 1 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/bookings/${selectedIds[0]}/edit`}
              className="flex h-9 items-center rounded-xl bg-emerald-600 px-4 text-[12.5px] font-black text-white shadow-sm hover:bg-emerald-700"
            >
              Sửa Booking
            </Link>

            <button
              type="button"
              disabled={bulkDeleting}
              onClick={bulkDeleteSelectedRows}
              className="flex h-9 items-center rounded-xl bg-red-600 px-4 text-[12.5px] font-black text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleting ? "Đang xóa..." : "Xóa Booking"}
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
            kocs={kocs}
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
              {bulkDeleting ? "Đang xóa..." : "Xóa booking đã chọn"}
            </button>
          </div>
          </div>
        )}
      </div>
      )}

      <div className="booking-advanced-scroll max-h-[calc(100vh-375px)] overflow-auto">
        <table
          className="booking-advanced-table text-left text-sm"
          style={{ minWidth: `${tableWidth}px`, width: `${tableWidth}px` }}
        >
          <thead>
            <tr>
              {!restricted && (
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
                  title="Chọn tất cả booking đang hiển thị"
                  className="h-4 w-4 cursor-pointer accent-red-600"
                />
              </th>
              )}

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
                  Đang tải dữ liệu Booking...
                </td>
              </tr>
            )}

            {!loading && bookings.length === 0 && (
              <tr>
                <td
                  colSpan={orderedColumns.length + 1}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  Không có booking phù hợp với bộ lọc.
                </td>
              </tr>
            )}

            {!loading &&
              bookings.map((booking) => {
                const bookingId = String(booking.id);
                const selected = selectedIdSet.has(bookingId);

                return (
                  <tr
                    key={booking.id}
                    onClick={(event) => {
                      if (restricted) return;
                      const el = event.target as HTMLElement;
                      if (
                        el.closest("input, select, textarea, button, a, label")
                      ) {
                        return;
                      }
                      router.push(`/bookings/${booking.id}/edit`);
                    }}
                    className={`group ${restricted ? "" : "cursor-pointer"} ${
                      selected ? "bg-red-50/40" : ""
                    }`}
                  >
                    {!restricted && (
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
                        onChange={() => toggleSelectOne(bookingId)}
                        className="h-4 w-4 cursor-pointer accent-red-600"
                      />
                    </td>
                    )}

                    {orderedColumns.map((column) => {
                      const pinned = pinnedColumns.includes(column.key);
                      const cellKey = `${booking.id}_${column.field || column.key}`;
                      const cellReadonly =
                        restricted &&
                        !SHIPPER_EDITABLE_KEYS.includes(column.key);

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
                            booking={booking}
                            column={column}
                            kocs={kocs}
                            employees={employees}
                            kocMap={kocMap}
                            employeeMap={employeeMap}
                            saving={savingCell === cellKey}
                            forceReadonly={cellReadonly}
                            onSave={(value) => updateCell(booking, column, value)}
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
  kocs,
  employees,
  onChange,
}: {
  column: ColumnConfig | null;
  value: string;
  kocs: DbRow[];
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

  if (column.key === "koc_id") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={getSelectColorStyle(column.key, value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
      >
        <option value="">Chọn KOC mới</option>
        {kocs.map((koc) => (
          <option key={koc.id} value={koc.id}>
            {getKocDisplayName(koc)}
          </option>
        ))}
      </select>
    );
  }

  if (column.key === "employee_id") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={getSelectColorStyle(column.key, value)}
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

  if (column.type === "multiselect") {
    return (
      <ProductMultiSelect
        value={value}
        options={column.options || []}
        onChange={onChange}
        placeholder="Chọn nhiều sản phẩm"
        compact
      />
    );
  }

  if (column.type === "select") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={getSelectColorStyle(column.key, value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
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
  booking,
  column,
  kocs,
  employees,
  kocMap,
  employeeMap,
  saving,
  forceReadonly = false,
  onSave,
}: {
  booking: DbRow;
  column: ColumnConfig;
  kocs: DbRow[];
  employees: DbRow[];
  kocMap: Map<string, DbRow>;
  employeeMap: Map<string, DbRow>;
  saving: boolean;
  forceReadonly?: boolean;
  onSave: (value: unknown) => void;
}) {
  const value = column.field ? booking[column.field] : "";

  // Chi tiết đơn hàng: liệt kê từng sản phẩm kèm số lượng riêng
  if (column.key === "order_items") {
    const items = Array.isArray(booking.order_items) ? booking.order_items : [];

    if (items.length === 0) {
      // Booking cũ chỉ có chuỗi sản phẩm (không có số lượng từng loại)
      const legacy = String(booking.product || "").trim();

      return (
        <div
          className="whitespace-normal leading-4 text-slate-500"
          title={legacy}
        >
          {legacy || "-"}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        {items.map((item: any, index: number) => (
          <div
            key={index}
            className="flex items-baseline justify-between gap-2 whitespace-normal leading-4"
          >
            <span className="text-slate-700">{item?.product || "—"}</span>
            <span className="shrink-0 font-black tabular-nums text-slate-900">
              ×{Number(item?.quantity) || 0}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Tên KOC / Địa chỉ / SĐT lấy từ bảng koc (cột không có field riêng).
  // Phải xử lý TRƯỚC forceReadonly, nếu không tài khoản shipper sẽ thấy trống.
  if (
    column.key === "koc_name" ||
    column.key === "koc_address" ||
    column.key === "koc_phone"
  ) {
    const relatedKoc = booking.koc_id
      ? kocMap.get(String(booking.koc_id))
      : null;

    const displayValue =
      column.key === "koc_name"
        ? String(relatedKoc?.name || "-")
        : column.key === "koc_address"
          ? String(relatedKoc?.address || "-")
          : String(relatedKoc?.phone || "-");

    return (
      <div
        className="truncate font-semibold text-slate-700"
        title={displayValue}
      >
        {displayValue}
      </div>
    );
  }

  // Tài khoản bị hạn chế: các trường không được sửa -> hiển thị chỉ đọc
  if (forceReadonly) {
    return (
      <div
        className="truncate font-semibold text-slate-600"
        title={formatCellDisplay(column, value, kocMap, employeeMap)}
      >
        {formatCellDisplay(column, value, kocMap, employeeMap)}
      </div>
    );
  }

  if (column.type === "readonly") {
    return (
      <div
        className="truncate font-semibold text-slate-700"
        title={formatCellDisplay(column, value, kocMap, employeeMap)}
      >
        {formatCellDisplay(column, value, kocMap, employeeMap)}
      </div>
    );
  }

  if (column.key === "koc_id") {
    return (
      <div className="relative">
        <select
          value={String(value || "")}
          onChange={(event) => onSave(event.target.value || null)}
          style={getSelectColorStyle(column.key, value)}
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] font-bold outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
        >
          <option value="">Chưa rõ KOC</option>
          {kocs.map((koc) => (
            <option key={koc.id} value={koc.id}>
              {getKocDisplayName(koc)}
            </option>
          ))}
        </select>
        {saving && <SavingDot />}
      </div>
    );
  }

  if (column.key === "employee_id") {
    return (
      <div className="relative">
        <select
          value={String(value || "")}
          onChange={(event) => onSave(event.target.value || null)}
          style={getSelectColorStyle(column.key, value)}
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] font-bold outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
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

  if (column.type === "multiselect") {
    return (
      <div className="relative">
        <ProductMultiSelect
          value={String(value || "")}
          options={column.options || []}
          onChange={(nextValue) => onSave(nextValue || null)}
          placeholder="Chọn sản phẩm"
        />
        {saving && <SavingDot />}
      </div>
    );
  }

  if (column.type === "select") {
    const currentValue = String(value || "");
    const optionExists = (column.options || []).includes(currentValue);

    return (
      <div className="relative">
        <select
          value={currentValue}
          onChange={(event) => onSave(event.target.value || null)}
          style={getSelectColorStyle(column.key, currentValue)}
          className="h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-[12px] font-bold outline-none hover:border-slate-200 hover:bg-white focus:border-[#3964ff] focus:bg-white"
        >
          <option value="">-</option>

          {currentValue && !optionExists && (
            <option value={currentValue}>{currentValue}</option>
          )}

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


// Bảng màu phân biệt PIC (pastel), gán ổn định theo employee_id
const picColorPalette: { bg: string; text: string; border: string }[] = [
  { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
  { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
  { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" },
  { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
  { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" },
  { bg: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
  { bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
  { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
  { bg: "#ffe4e6", text: "#be123c", border: "#fecdd3" },
  { bg: "#ecfccb", text: "#4d7c0f", border: "#d9f99d" },
  { bg: "#ede9fe", text: "#6d28d9", border: "#ddd6fe" },
  { bg: "#cffafe", text: "#0e7490", border: "#a5f3fc" },
];

function getPicColorStyle(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return {};

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }

  const color = picColorPalette[hash % picColorPalette.length];

  return {
    backgroundColor: color.bg,
    color: color.text,
    borderColor: color.border,
    fontWeight: 700,
  };
}

function getSelectColorStyle(columnKey: string, value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return {};

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    "Booking vid": { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    "Booking live": { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" },
    "Booking vid+live": { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" },
    "Quà Tết": { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" },
    "Quà Tri Ân": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    "Quà Sinh Nhật": { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },

    "Chờ nhận SP": { bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
    "Đang lên video": { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    "Đã đăng video": { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" },
    "Đã thanh toán": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },

    "Đã gửi": { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    "Giao thành công": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    "Giao không thành công": { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" },
  };

  if (columnKey === "koc_id") {
    return {
      backgroundColor: "#f0f9ff",
      color: "#0369a1",
      borderColor: "#bae6fd",
      fontWeight: 800,
    };
  }

  if (columnKey === "employee_id") {
    return getPicColorStyle(raw);
  }

  const color = colorMap[raw];

  if (!color) return {};

  return {
    backgroundColor: color.bg,
    color: color.text,
    borderColor: color.border,
    fontWeight: 800,
  };
}


function ProductMultiSelect({
  value,
  options,
  onChange,
  placeholder,
  compact = false,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  compact?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<Record<string, string | number>>({});
  const [selectedValues, setSelectedValues] = useState<string[]>(() =>
    parseProductList(value)
  );

  useEffect(() => {
    setSelectedValues(parseProductList(value));
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const button = buttonRef.current;

      if (!button) return;

      const rect = button.getBoundingClientRect();
      const panelWidth = Math.max(compact ? 320 : 360, rect.width);
      const estimatedHeight = 390;
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

  function toggleProduct(product: string) {
    const selectedSet = new Set(selectedValues);

    if (selectedSet.has(product)) {
      selectedSet.delete(product);
    } else {
      selectedSet.add(product);
    }

    const nextValues = allOptions.filter((option) => selectedSet.has(option));

    setSelectedValues(nextValues);
    onChange(nextValues.join(", "));
  }

  function clearProducts() {
    setSelectedValues([]);
    onChange("");
  }

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? selectedValues[0]
        : `${selectedValues[0]} +${selectedValues.length - 1}`;

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        title={selectedValues.join(", ") || placeholder}
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
          {selectedValues.length > 0 ? `${selectedValues.length} SP` : "⌄"}
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
                Chọn sản phẩm
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                Có thể chọn nhiều sản phẩm
              </p>
            </div>

            <button
              type="button"
              onClick={clearProducts}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              Xóa chọn
            </button>
          </div>

          <div className="max-h-[330px] overflow-auto p-2">
            {allOptions.map((product) => {
              const checked = selectedValues.includes(product);

              return (
                <label
                  key={product}
                  className={`mb-1 flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold transition last:mb-0 ${
                    checked
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-transparent bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(product)}
                    className="h-4 w-4 shrink-0 accent-[#3964ff]"
                  />

                  <span className="leading-5">{product}</span>
                </label>
              );
            })}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
            Đã chọn: {selectedValues.length} sản phẩm
          </div>
        </div>
      )}
    </div>
  );
}

function parseProductList(value: unknown) {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
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

function formatCellDisplay(
  column: ColumnConfig,
  value: unknown,
  kocMap: Map<string, DbRow>,
  employeeMap: Map<string, DbRow>
) {
  if (!value) return "-";

  if (column.key === "koc_id") {
    return getKocDisplayName(kocMap.get(String(value)));
  }

  if (column.key === "employee_id") {
    return getEmployeeDisplayName(employeeMap.get(String(value)));
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
