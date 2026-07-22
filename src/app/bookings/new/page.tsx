"use client";

import { supabase } from "@/lib/supabase/client";
import DatePickerInput from "@/components/DatePickerInput";
import KocSearchSelect from "@/components/KocSearchSelect";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const orderStatusOptions = [
  "Đã gửi",
  "Giao thành công",
  "Giao không thành công",
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

export default function NewBookingPage() {
  const router = useRouter();

  const [kocs, setKocs] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [initialKocId, setInitialKocId] = useState("");

  // KOC đang chọn + địa chỉ/SĐT giao hàng (mặc định lấy theo KOC, sửa được)
  const [selectedKocId, setSelectedKocId] = useState("");
  // PIC phụ trách: mặc định lấy theo PIC của KOC, vẫn đổi tay được
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const prefilledKocRef = useRef("");

  // Dòng hàng của đơn (mỗi sản phẩm 1 dòng)
  const [items, setItems] = useState<OrderItem[]>([
    { id: newItemId(), product: "", quantity: "", unitPrice: "" },
  ]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: newItemId(), product: "", quantity: "", unitPrice: "" },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)
    );
  }

  function updateItem(id: string, patch: Partial<OrderItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  const orderTotal = items.reduce(
    (sum, item) => sum + num(item.quantity) * num(item.unitPrice),
    0
  );
  const totalQuantity = items.reduce((sum, item) => sum + num(item.quantity), 0);

  const selectedKoc =
    kocs.find((koc) => String(koc.id) === String(selectedKocId)) || null;

  // Khi đổi KOC (và đã có dữ liệu KOC) -> tự điền địa chỉ/SĐT giao hàng theo KOC
  useEffect(() => {
    if (!selectedKocId) {
      prefilledKocRef.current = "";
      return;
    }
    if (!selectedKoc) return;
    if (prefilledKocRef.current === selectedKocId) return;

    prefilledKocRef.current = selectedKocId;
    setDeliveryAddress(selectedKoc.address || "");
    setRecipientPhone(selectedKoc.phone || "");
    // PIC phụ trách của Booking = PIC phụ trách của KOC đó
    setSelectedEmployeeId(
      selectedKoc.employee_id ? String(selectedKoc.employee_id) : ""
    );
  }, [selectedKocId, selectedKoc]);

  // Nếu mở từ Hồ sơ KOC (?koc_id=...) thì chọn sẵn KOC đó
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kocId = params.get("koc_id");
    if (kocId) setInitialKocId(kocId);
  }, []);

  useEffect(() => {
    async function loadData() {
      const [kocResult, employeeResult] = await Promise.all([
        loadAllKocsForBookingForm(),

        supabase
          .from("employees")
          .select("id, employee_code, full_name, email, phone, role, active, manager_id")
          .limit(1000),
      ]);

      setKocs(kocResult.data || []);
      setEmployees(employeeResult.data || []);
    }

    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    // Chỉ giữ dòng hàng có nhập ít nhất 1 thông tin
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
      created_at: getVietnamNowTimestamp(),
      koc_id: getText(formData, "koc_id") || null,
      employee_id: getText(formData, "employee_id") || null,
      booking_type: getText(formData, "booking_type") || "Booking vid",
      // Đặt sẵn status chuẩn (tránh lấy DB default viết thường "Chờ nhận sp")
      status_booking: "Chờ nhận SP",
      cast_price: getNumber(formData, "cast_price"),
      expected_post_date: parseVietnameseDateInput(
        formData.get("expected_post_date")
      ),
      // Dòng hàng lưu jsonb; product/quantity/order_value tổng hợp từ dòng hàng
      order_items: orderItems.length > 0 ? orderItems : null,
      product:
        filledItems
          .map((item) => item.product)
          .filter(Boolean)
          .join(", ") || null,
      quantity: orderItems.length > 0 ? totalQuantity : null,
      order_value: orderItems.length > 0 ? orderTotal : null,
      // Địa chỉ/SĐT giao hàng riêng cho đơn (không đổi địa chỉ/SĐT gốc KOC)
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

    // Tự sinh mã đơn: DH-{mã KOC}-{STT theo KOC}
    const selectedKoc = kocs.find(
      (koc) => String(koc.id) === String(payload.koc_id)
    );

    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("koc_id", payload.koc_id);

    const bookingCode = `DH-${kocCodeBase(selectedKoc)}-${String(
      (count || 0) + 1
    ).padStart(3, "0")}`;

    const { error } = await supabase
      .from("bookings")
      .insert({ ...payload, booking_code: bookingCode });

    if (error) {
      setMessage(`Lỗi tạo Booking: ${error.message}`);
      setSaving(false);
      return;
    }

    router.push("/bookings");
    router.refresh();
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-5 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mx-auto mb-4 max-w-[980px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-base">
              ➕
            </div>

            <div>
              <p className="mb-1 text-[10.5px] font-black uppercase leading-none tracking-[0.2em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[23px] font-bold leading-tight text-slate-950 md:text-[25px]">
                Tạo Booking mới
              </h1>

              <p className="mt-1 max-w-3xl text-[12.5px] leading-5 text-slate-500">
                Tạo booking cho KOC, chọn PIC phụ trách, loại booking, sản phẩm
                và ngày dự kiến đăng video.
              </p>
            </div>
          </div>

          <Link
            href="/bookings"
            className="flex h-9 w-fit items-center rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Về danh sách Booking
          </Link>
        </div>
      </header>

      {message && (
        <div className="mx-auto mb-3 max-w-[980px] rounded-2xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mx-auto max-w-[980px] space-y-3">
        <CompactSection
          eyebrow="Thông tin Booking"
          title="KOC, PIC & loại booking"
        >
          <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
            <CompactField label="KOC" required>
              <KocSearchSelect
                key={initialKocId || "empty"}
                name="koc_id"
                kocs={kocs}
                defaultValue={initialKocId}
                onChange={setSelectedKocId}
                placeholder="Gõ ID TikTok/Tên FB để tìm KOC..."
              />
            </CompactField>

            <CompactField label="PIC phụ trách">
              <select
                name="employee_id"
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              >
                <option value="">Không chọn PIC</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getEmployeeDisplayName(employee)}
                  </option>
                ))}
              </select>
            </CompactField>

            <CompactField label="Loại booking">
              <select
                name="booking_type"
                defaultValue="Booking vid"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              >
                {bookingTypeOptions.map((bookingType) => (
                  <option key={bookingType} value={bookingType}>
                    {bookingType}
                  </option>
                ))}
              </select>
            </CompactField>

            <CompactField label="Giá cast">
              <input
                name="cast_price"
                placeholder="Ví dụ: 300000"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Ngày dự kiến đăng">
              <DatePickerInput name="expected_post_date" />
            </CompactField>
          </div>
        </CompactSection>

        <CompactSection
          eyebrow="Chi tiết đơn hàng"
          title="Sản phẩm, số lượng & đơn giá"
          description="Mỗi sản phẩm 1 dòng. Thành tiền và tổng tiền hàng tự tính."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-[12.5px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-[0.04em] text-slate-500">
                  <th className="w-9 px-3 py-2 text-center">#</th>
                  <th className="px-2 py-2">Sản phẩm</th>
                  <th className="w-24 px-2 py-2 text-right">Số lượng</th>
                  <th className="w-32 px-2 py-2 text-right">Đơn giá</th>
                  <th className="w-32 px-3 py-2 text-right">Thành tiền</th>
                  <th className="w-10 px-2 py-2"></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const amount = num(item.quantity) * num(item.unitPrice);

                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-2 py-1.5">
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
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] outline-none focus:border-[#3964ff]"
                        >
                          <option value="">Chọn sản phẩm</option>
                          {productOptions.map((product) => (
                            <option key={product} value={product}>
                              {product}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, { quantity: event.target.value })
                          }
                          placeholder="0"
                          inputMode="numeric"
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-[12.5px] outline-none focus:border-[#3964ff]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, { unitPrice: event.target.value })
                          }
                          placeholder="0"
                          inputMode="numeric"
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-[12.5px] outline-none focus:border-[#3964ff]"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-bold tabular-nums text-slate-800">
                        {amount.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length <= 1}
                          title="Xóa dòng"
                          className="rounded-md px-1.5 py-1 text-[13px] text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2.5">
            <button
              type="button"
              onClick={addItem}
              className="h-8 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-[12.5px] font-bold text-slate-600 hover:border-[#3964ff] hover:text-[#3964ff]"
            >
              + Thêm dòng
            </button>

            <div className="flex items-baseline gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                Tổng tiền hàng
              </span>
              <span className="text-[17px] font-black tabular-nums text-slate-950">
                {orderTotal.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>
        </CompactSection>

        <CompactSection
          eyebrow="Giao hàng"
          title="Địa chỉ & SĐT nhận hàng"
          description="Mặc định lấy theo KOC, có thể sửa riêng cho đơn này mà không đổi thông tin gốc của KOC."
        >
          <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
            <CompactField label="Địa chỉ gốc KOC">
              <div className="min-h-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-500">
                {selectedKoc?.address || "— (chọn KOC để xem)"}
              </div>
            </CompactField>

            <CompactField label="SĐT gốc KOC">
              <div className="min-h-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-500">
                {selectedKoc?.phone || "— (chọn KOC để xem)"}
              </div>
            </CompactField>

            <CompactField label="Địa chỉ giao hàng" full>
              <textarea
                name="delivery_address"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="Địa chỉ nhận hàng cho đơn này"
                className="min-h-[52px] w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12.5px] leading-5 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="SĐT nhận hàng">
              <input
                name="recipient_phone"
                value={recipientPhone}
                onChange={(event) => setRecipientPhone(event.target.value)}
                placeholder="SĐT người nhận cho đơn này"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Ngày gửi">
              <DatePickerInput name="ship_date" />
            </CompactField>

            <CompactField label="Mã vận đơn">
              <input
                name="tracking_code"
                placeholder="Mã vận đơn / tracking"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Tình trạng đơn hàng">
              <select
                name="order_status"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              >
                <option value="">Chọn tình trạng</option>
                {orderStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </CompactField>
          </div>
        </CompactSection>

        <CompactSection eyebrow="Ghi chú" title="Thông tin bổ sung">
          <CompactField label="Ghi chú" full>
            <textarea
              name="note"
              placeholder="Ghi chú thêm..."
              className="min-h-[68px] w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12.5px] leading-5 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
            />
          </CompactField>
        </CompactSection>

        <div className="sticky bottom-3 z-20 rounded-[16px] border border-slate-200 bg-white/90 p-2.5 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <Link
              href="/bookings"
              className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="h-9 rounded-xl bg-[#3964ff] px-5 text-[12.5px] font-bold text-white shadow-md hover:bg-[#2f55df] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Tạo Booking"}
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

function CompactSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-2.5">
        <p className="text-[10px] font-black uppercase leading-none tracking-[0.18em] text-red-600">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-[15.5px] font-bold leading-tight text-slate-950">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[12px] leading-4 text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div>{children}</div>
    </section>
  );
}

function CompactField({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`grid grid-cols-1 gap-1.5 bg-white px-3 py-2 md:grid-cols-[125px_1fr] md:items-center ${
        full ? "xl:col-span-2" : ""
      }`}
    >
      <span className="text-[10.5px] font-black uppercase leading-tight tracking-[0.06em] text-slate-500">
        {label} {required && <span className="text-red-600">*</span>}
      </span>

      <div>{children}</div>
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

function kocCodeBase(koc?: DbRow | null) {
  const raw = koc?.koc_code || koc?.Id_tiktok_Ten_fb || koc?.name || "KOC";

  const slug = String(raw)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);

  return slug || "KOC";
}

function getSelectedProducts(formData: FormData) {
  const products = formData
    .getAll("products")
    .map((item) => String(item).trim())
    .filter(Boolean);

  return products.length > 0 ? products.join(", ") : null;
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

function getVietnamTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

// Trả về mốc thời gian tạo booking theo giờ Việt Nam, có cả giờ/phút/giây
// (định dạng YYYY-MM-DDTHH:mm:ss) để danh sách sắp xếp đúng "mới nhất trước"
// ngay cả với nhiều booking tạo trong cùng một ngày.
function getVietnamNowTimestamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
    "minute"
  )}:${get("second")}`;
}
