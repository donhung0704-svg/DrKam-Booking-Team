"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type DbRow = Record<string, any>;

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();

  const employeeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [employee, setEmployee] = useState<DbRow | null>(null);
  const [managers, setManagers] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!employeeId) return;

      setLoading(true);
      setMessage("");

      const [employeeResult, managerResult] = await Promise.all([
        supabase.from("employees").select("*").eq("id", employeeId).single(),

        supabase
          .from("employees")
          .select(
            "id, employee_code, full_name, email, phone, role, active, manager_id"
          )
          .eq("active", true)
          .order("employee_code", { ascending: true }),
      ]);

      if (employeeResult.error) {
        setMessage(`Lỗi tải PIC: ${employeeResult.error.message}`);
        setEmployee(null);
      } else {
        setEmployee(employeeResult.data || null);
      }

      setManagers(
        (managerResult.data || []).filter(
          (item) => String(item.id) !== String(employeeId)
        )
      );

      setLoading(false);
    }

    loadData();
  }, [employeeId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!employeeId) {
      setMessage("Lỗi: Không tìm thấy ID PIC.");
      return;
    }

    setSaving(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const payload = {
      employee_code: getText(formData, "employee_code"),
      full_name: getText(formData, "full_name"),
      email: getText(formData, "email") || null,
      phone: getText(formData, "phone") || null,
      role: getText(formData, "role") || "Nhân viên",
      active: getText(formData, "active") === "true",
      manager_id: getText(formData, "manager_id") || null,
    };

    if (!payload.employee_code) {
      setMessage("Vui lòng nhập Mã PIC.");
      setSaving(false);
      return;
    }

    if (!payload.full_name) {
      setMessage("Vui lòng nhập Họ tên PIC.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", employeeId);

    if (error) {
      setMessage(`Lỗi cập nhật PIC: ${error.message}`);
      setSaving(false);
      return;
    }

    router.push("/employees");
    router.refresh();
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-5 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mx-auto mb-4 max-w-[820px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-base">
              ✏️
            </div>

            <div>
              <p className="mb-1 text-[10.5px] font-black uppercase leading-none tracking-[0.2em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[23px] font-bold leading-tight text-slate-950 md:text-[25px]">
                Sửa PIC
              </h1>

              <p className="mt-1 max-w-3xl text-[12.5px] leading-5 text-slate-500">
                Cập nhật thông tin nhân sự phụ trách KOC/Booking.
              </p>
            </div>
          </div>

          <Link
            href="/employees"
            className="flex h-9 w-fit items-center rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Về danh sách PIC
          </Link>
        </div>
      </header>

      {loading && (
        <div className="mx-auto max-w-[820px] rounded-2xl border border-slate-200 bg-white p-4 text-[13px] font-semibold text-slate-500">
          Đang tải dữ liệu PIC...
        </div>
      )}

      {!loading && !employee && (
        <div className="mx-auto max-w-[820px] rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          Không tìm thấy PIC cần sửa.
        </div>
      )}

      {!loading && employee && (
        <>
          {message && (
            <div className="mx-auto mb-3 max-w-[820px] rounded-2xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mx-auto max-w-[820px] space-y-3">
            <CompactSection eyebrow="Thông tin PIC" title="Mã, tên, liên hệ">
              <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
                <CompactField label="Mã PIC" required>
                  <input
                    name="employee_code"
                    defaultValue={employee.employee_code || ""}
                    placeholder="Ví dụ: EMP0004"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Họ tên" required>
                  <input
                    name="full_name"
                    defaultValue={employee.full_name || ""}
                    placeholder="Ví dụ: Hằng"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="SĐT/Zalo">
                  <input
                    name="phone"
                    defaultValue={employee.phone || ""}
                    placeholder="09xxxxxxxx"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Email">
                  <input
                    name="email"
                    defaultValue={employee.email || ""}
                    placeholder="email@drkam.vn"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Vai trò">
                  <input
                    name="role"
                    defaultValue={employee.role || "Nhân viên"}
                    placeholder="Nhân viên / Leader / Admin"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Trạng thái">
                  <select
                    name="active"
                    defaultValue={employee.active ? "true" : "false"}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Đã tắt</option>
                  </select>
                </CompactField>

                <CompactField label="Quản lý trực tiếp" full>
                  <select
                    name="manager_id"
                    defaultValue={employee.manager_id || ""}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    <option value="">Không chọn</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {getEmployeeDisplayName(manager)}
                      </option>
                    ))}
                  </select>
                </CompactField>
              </div>
            </CompactSection>

            <div className="sticky bottom-3 z-20 rounded-[16px] border border-slate-200 bg-white/90 p-2.5 shadow-2xl backdrop-blur">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/employees"
                  className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-xl bg-[#3964ff] px-5 text-[12.5px] font-bold text-white shadow-md hover:bg-[#2f55df] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

function CompactSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
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

function getEmployeeDisplayName(employee?: DbRow | null) {
  if (!employee) return "Chưa có PIC";

  const code = employee.employee_code || "";
  const name = employee.full_name || "";
  const phone = employee.phone || "";
  const role = employee.role || "";

  return [code, name, phone, role].filter(Boolean).join(" - ") || "Chưa rõ PIC";
}
