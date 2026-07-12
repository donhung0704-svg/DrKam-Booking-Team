"use client";

import { supabase } from "@/lib/supabase/client";
import KocSearchSelect from "@/components/KocSearchSelect";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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

const productOptions = [
  "Nước súc miệng DrKam",
  "Xịt miệng DrKam Plus",
  "Kem đánh răng DrKam",
  "Nước súc miệng Postbiotic 450ml",
  "Nước súc miệng Postbiotic 150ml",
  "Gel cạo lưỡi",
  "Bộ chỉ nha khoa",
];

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
      product: getSelectedProducts(formData),
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

  const selectedProducts = String(booking.product || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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
          title="Sản phẩm booking"
          description="Tick lại sản phẩm nếu cần cập nhật."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {productOptions.map((product) => (
              <label
                key={product}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50"
              >
                <input
                  type="checkbox"
                  name="products"
                  value={product}
                  defaultChecked={selectedProducts.includes(product)}
                  className="h-4 w-4"
                />
                <span>{product}</span>
              </label>
            ))}
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
      .select("id, koc_code, Id_tiktok_Ten_fb, name, phone, tiktok_link")
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