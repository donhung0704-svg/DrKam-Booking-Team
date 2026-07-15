"use client";

import { supabase } from "@/lib/supabase/client";
import KocSearchSelect from "@/components/KocSearchSelect";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type DbRow = Record<string, any>;

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

const orderStatusOptions = [
  "Chờ gửi",
  "Đã gửi",
  "Đang giao",
  "Giao thành công",
  "Giao thất bại",
  "Hoàn hàng",
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

type OrderItem = {
  id: string;
  product: string;
  quantity: string;
  unitPrice: string;
};

function newItemId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function num(value: unknown) {
  const raw = String(value ?? "").trim().replace(/\./g, "").replace(/,/g, "");
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

// Khởi tạo dòng hàng từ booking đã lưu (order_items) hoặc từ chuỗi product cũ
function initItemsFromBooking(booking: DbRow): OrderItem[] {
  const raw = booking.order_items;

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item: any) => ({
      id: newItemId(),
      product: String(item?.product || ""),
      quantity:
        item?.quantity !== null && item?.quantity !== undefined
          ? String(item.quantity)
          : "",
      unitPrice:
        item?.unit_price !== null && item?.unit_price !== undefined
          ? String(item.unit_price)
          : "",
    }));
  }

  const products = String(booking.product || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (products.length > 0) {
    return products.map((product) => ({
      id: newItemId(),
      product,
      quantity: "",
      unitPrice: "",
    }));
  }

  return [{ id: newItemId(), product: "", quantity: "", unitPrice: "" }];
}

export default function EditBookingPage() {
  const router = useRouter();
  const params = useParams();

  const id = String(params.id || "");

  const [booking, setBooking] = useState<DbRow | null>(null);
  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Dòng hàng + giao hàng
  const [items, setItems] = useState<OrderItem[]>([
    { id: newItemId(), product: "", quantity: "", unitPrice: "" },
  ]);
  const [selectedKocId, setSelectedKocId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const prefilledKocRef = useRef("");

  const selectedKoc =
    kocs.find((koc) => String(koc.id) === String(selectedKocId)) || null;

  // Khi booking tải xong -> khởi tạo dòng hàng + địa chỉ/SĐT giao hàng đã lưu
  useEffect(() => {
    if (!booking) return;
    setItems(initItemsFromBooking(booking));
    setDeliveryAddress(booking.delivery_address || "");
    setRecipientPhone(booking.recipient_phone || "");
    // Không tự điền lại theo KOC gốc của booking (giữ giá trị đã lưu)
    prefilledKocRef.current = String(booking.koc_id || "");
  }, [booking]);

  // Khi ĐỔI sang KOC khác -> tự điền địa chỉ/SĐT giao hàng theo KOC mới
  useEffect(() => {
    if (!selectedKocId) return;
    if (!selectedKoc) return;
    if (prefilledKocRef.current === selectedKocId) return;

    prefilledKocRef.current = selectedKocId;
    setDeliveryAddress(selectedKoc.address || "");
    setRecipientPhone(selectedKoc.phone || "");
  }, [selectedKocId, selectedKoc]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: newItemId(), product: "", quantity: "", unitPrice: "" },
    ]);
  }

  function removeItem(itemId: string) {
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((item) => item.id !== itemId)
    );
  }

  function updateItem(itemId: string, patch: Partial<OrderItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  }

  const orderTotal = items.reduce(
    (sum, item) => sum + num(item.quantity) * num(item.unitPrice),
    0
  );
  const totalQuantity = items.reduce((sum, item) => sum + num(item.quantity), 0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const [bookingResult, kocResult, employeeResult] = await Promise.all([
        supabase.from("bookings").select("*").eq("id", id).single(),

        loadAllKocsForBookingForm(),

        supabase
          .from("employees")
          .select("id, employee_code, full_name, email, phone, role, active, manager_id")
          .limit(1000),
      ]);

      if (bookingResult.error) {
        setMessage(`Lỗi tải Booking: ${bookingResult.error.message}`);
        setBooking(null);
      } else {
        setBooking(bookingResult.data);
      }

      setKocs(kocResult.data || []);
      setEmployees(employeeResult.data || []);

      setLoading(false);
    }

    if (id) {
      loadData();
    }
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!booking) return;

    setSaving(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const filledItems = items.filter(
      (item) => item.product || num(item.quantity) || num(item.unitPrice)
    );

    const orderItems = filledItems.map((item) => ({
      product: item.product || "",
      quantity: num(item.quantity),
      unit_price: num(item.unitPrice),
      amount: num(item.quantity) * num(item.unitPrice),
    }));

    const payload = {
      koc_id: getText(formData, "koc_id") || null,
      employee_id: getText(formData, "employee_id") || null,
      booking_type: getText(formData, "booking_type") || "Booking vid",
      status_booking: getText(formData, "status_booking") || null,
      cast_price: getNumber(formData, "cast_price"),
      expected_post_date: parseVietnameseDateInput(
        formData.get("expected_post_date")
      ),
      actual_post_date: parseVietnameseDateInput(
        formData.get("actual_post_date")
      ),
      order_items: orderItems.length > 0 ? orderItems : null,
      product:
        filledItems
          .map((item) => item.product)
          .filter(Boolean)
          .join(", ") || null,
      quantity: orderItems.length > 0 ? totalQuantity : null,
      order_value: orderItems.length > 0 ? orderTotal : null,
      delivery_address: getText(formData, "delivery_address") || null,
      recipient_phone: getText(formData, "recipient_phone") || null,
      ship_date: parseVietnameseDateInput(formData.get("ship_date")),
      tracking_code: getText(formData, "tracking_code") || null,
      order_status: getText(formData, "order_status") || null,
      note: getText(formData, "note") || null,
    };

    if (!payload.koc_id) {
      setMessage("Vui lòng chọn KOC.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("bookings")
      .update(payload)
      .eq("id", id);

    if (error) {
      setMessage(`Lỗi cập nhật Booking: ${error.message}`);
      setSaving(false);
      return;
    }

    router.push("/bookings");
    router.refresh();
  }

  if (loading) {
    return (
      <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 md:px-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Đang tải dữ liệu Booking...
        </div>
      </section>
    );
  }

  if (!booking) {
    return (
      <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 md:px-8">
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm">
          Không tìm thấy Booking.
        </div>
      </section>
    );
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-6 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl">
              ✏️
            </div>

            <div>
              <p className="mb-3 text-[12px] font-bold uppercase leading-[1.4] tracking-[0.22em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[30px] font-bold leading-[1.35] tracking-normal text-slate-950 md:text-[34px]">
                Sửa Booking
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Cập nhật PIC phụ trách, status booking, ngày đăng thực tế, sản
                phẩm và ghi chú.
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
        <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Thông tin Booking"
          description="Cập nhật thông tin chính của booking."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="KOC" required>
              <KocSearchSelect
                name="koc_id"
                kocs={kocs}
                defaultValue={booking.koc_id || ""}
                onChange={setSelectedKocId}
                placeholder="Gõ ID TikTok/Tên FB để tìm KOC..."
              />
            </Field>

            <Field label="PIC phụ trách">
              <select
                name="employee_id"
                defaultValue={booking.employee_id || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              >
                <option value="">Không chọn PIC</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getEmployeeDisplayName(employee)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Loại booking">
              <select
                name="booking_type"
                defaultValue={booking.booking_type || "Booking vid"}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              >
                {bookingTypeOptions.map((bookingType) => (
                  <option key={bookingType} value={bookingType}>
                    {bookingType}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status booking">
              <select
                name="status_booking"
                defaultValue={booking.status_booking || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              >
                <option value="">Chọn status</option>
                {statusBookingOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Giá cast">
              <input
                name="cast_price"
                defaultValue={booking.cast_price || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Ngày dự kiến đăng">
              <input
                name="expected_post_date"
                defaultValue={formatDateForDisplay(booking.expected_post_date)}
                placeholder="dd/mm/yyyy"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Ngày đăng thực tế">
              <input
                name="actual_post_date"
                defaultValue={formatDateForDisplay(booking.actual_post_date)}
                placeholder="dd/mm/yyyy"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Chi tiết đơn hàng"
          description="Mỗi sản phẩm 1 dòng. Thành tiền và tổng tiền hàng tự tính."
        >
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[660px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.04em] text-slate-500">
                  <th className="w-10 px-3 py-2.5 text-center">#</th>
                  <th className="px-3 py-2.5">Sản phẩm</th>
                  <th className="w-28 px-3 py-2.5 text-right">Số lượng</th>
                  <th className="w-36 px-3 py-2.5 text-right">Đơn giá</th>
                  <th className="w-36 px-3 py-2.5 text-right">Thành tiền</th>
                  <th className="w-12 px-2 py-2.5"></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const amount = num(item.quantity) * num(item.unitPrice);

                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.product}
                          onChange={(event) => {
                            const product = event.target.value;
                            // Chọn sản phẩm -> mặc định Số lượng = 1 nếu đang trống
                            updateItem(
                              item.id,
                              product && !item.quantity.trim()
                                ? { product, quantity: "1" }
                                : { product }
                            );
                          }}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#3964ff]"
                        >
                          <option value="">Chọn sản phẩm</option>
                          {productOptions.map((product) => (
                            <option key={product} value={product}>
                              {product}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, { quantity: event.target.value })
                          }
                          placeholder="0"
                          inputMode="numeric"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-right text-sm outline-none focus:border-[#3964ff]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitPrice: event.target.value,
                            })
                          }
                          placeholder="0"
                          inputMode="numeric"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-right text-sm outline-none focus:border-[#3964ff]"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-800">
                        {amount.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length <= 1}
                          title="Xóa dòng"
                          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={addItem}
              className="h-10 rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 hover:border-[#3964ff] hover:text-[#3964ff]"
            >
              + Thêm dòng
            </button>

            <div className="flex items-baseline gap-3">
              <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-slate-500">
                Tổng tiền hàng
              </span>
              <span className="text-[20px] font-black tabular-nums text-slate-950">
                {orderTotal.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Giao hàng"
          description="Mặc định lấy theo KOC, có thể sửa riêng cho đơn này mà không đổi thông tin gốc của KOC."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Địa chỉ gốc KOC">
              <div className="min-h-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                {selectedKoc?.address || "— (chọn KOC để xem)"}
              </div>
            </Field>

            <Field label="SĐT gốc KOC">
              <div className="min-h-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                {selectedKoc?.phone || "— (chọn KOC để xem)"}
              </div>
            </Field>

            <Field label="Địa chỉ giao hàng">
              <textarea
                name="delivery_address"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="Địa chỉ nhận hàng cho đơn này"
                className="min-h-[64px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </Field>

            <Field label="SĐT nhận hàng">
              <input
                name="recipient_phone"
                value={recipientPhone}
                onChange={(event) => setRecipientPhone(event.target.value)}
                placeholder="SĐT người nhận cho đơn này"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Ngày gửi">
              <input
                name="ship_date"
                defaultValue={formatDateForDisplay(booking.ship_date)}
                placeholder="dd/mm/yyyy"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Mã vận đơn">
              <input
                name="tracking_code"
                defaultValue={booking.tracking_code || ""}
                placeholder="Mã vận đơn / tracking"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Tình trạng đơn hàng">
              <select
                name="order_status"
                defaultValue={booking.order_status || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              >
                <option value="">Chọn tình trạng</option>
                {orderStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Ghi chú" description="Thông tin bổ sung cho booking.">
          <Field label="Ghi chú">
            <textarea
              name="note"
              defaultValue={booking.note || ""}
              className="min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </Field>
        </FormSection>

        <div className="sticky bottom-4 z-20 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <Link
              href="/bookings"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[#3964ff] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#2f55df] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}


async function loadAllKocsForBookingForm() {
  const allRows: DbRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("koc")
      .select("id, koc_code, Id_tiktok_Ten_fb, name, phone, address, tiktok_link")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return {
        data: [],
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

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-600">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function getNumber(formData: FormData, key: string) {
  const raw = getText(formData, key);

  if (!raw) return null;

  const cleaned = raw.replace(/\./g, "").replace(/,/g, "");
  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function parseVietnameseDateInput(value: FormDataEntryValue | null) {
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
  if (!employee) return "Chưa rõ PIC";

  const code = employee.employee_code || "";
  const name = employee.full_name || "";
  const phone = employee.phone || "";
  const role = employee.role || "";

  return [code, name, phone, role].filter(Boolean).join(" - ") || "Chưa rõ PIC";
}