"use client";

import { supabase } from "@/lib/supabase/client";
import DatePickerInput from "@/components/DatePickerInput";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type DbRow = Record<string, any>;

const tierOptions = [
  "VIP",
  "Tiềm năng",
  "Chăm chỉ",
  "Mới hoạt động",
  "Ngủ đông",
  "Mất cast",
  "Trùng KOC",
  "Dừng CS",
];

const statusOptions = [
  "Chờ phản hồi",
  "Đã phản hồi",
  "Cân nhắc",
  "Đã chốt",
  "Từ chối",
];

const channelTypeOptions = ["Người thật", "AI", "Pov-Unbox"];

const maritalStatusOptions = ["Đã kết hôn", "Đã có con"];

export default function EditKocPage() {
  const params = useParams();
  const router = useRouter();

  const kocId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [koc, setKoc] = useState<DbRow | null>(null);
  const [campaigns, setCampaigns] = useState<DbRow[]>([]);
  const [employees, setEmployees] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!kocId) return;

      setLoading(true);
      setMessage("");

      const [kocResult, campaignResult, employeeResult] = await Promise.all([
        supabase.from("koc").select("*").eq("id", kocId).single(),

        supabase
          .from("campaigns")
          .select("*")
          .order("campaign_code", { ascending: false })
          .limit(1000),

        supabase
          .from("employees")
          .select("id, employee_code, full_name, name, email")
          .limit(1000),
      ]);

      if (kocResult.error) {
        setMessage(`Lỗi tải KOC: ${kocResult.error.message}`);
        setKoc(null);
      } else {
        setKoc(kocResult.data || null);
      }

      setCampaigns(campaignResult.data || []);
      setEmployees(employeeResult.data || []);

      setLoading(false);
    }

    loadData();
  }, [kocId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!kocId) {
      setMessage("Lỗi: Không tìm thấy ID KOC.");
      return;
    }

    setSaving(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const payload = {
      employee_id: getText(formData, "employee_id") || null,
      Id_tiktok_Ten_fb: getText(formData, "Id_tiktok_Ten_fb"),
      name: getText(formData, "name") || null,
      tiktok_link: getText(formData, "tiktok_link") || null,
      facebook_link: getText(formData, "facebook_link") || null,
      phone: getText(formData, "phone") || null,
      email: getText(formData, "email") || null,
      follower: getNumber(formData, "follower"),
      tier: getText(formData, "tier") || null,
      status: getText(formData, "status") || "Chờ phản hồi",
      channel_type: getText(formData, "channel_type") || null,
      address: getText(formData, "address") || null,
      note: getText(formData, "note") || null,
      booking_date: parseVietnameseDateInput(formData.get("booking_date")),
      date_of_birth: parseVietnameseDateInput(formData.get("date_of_birth")),
      number_of_videos: getNumber(formData, "number_of_videos"),
      monthly_videos: getNumber(formData, "monthly_videos"),
      campaign_id: getText(formData, "campaign_id") || null,
      gmv: getNumber(formData, "gmv"),
      gmv_thang: getNumber(formData, "gmv_thang"),
      marital_status: getText(formData, "marital_status") || null,
      new_contact_date: parseVietnameseDateInput(
        formData.get("new_contact_date")
      ),
    };

    if (!payload.Id_tiktok_Ten_fb) {
      setMessage("Lỗi: Vui lòng nhập ID TikTok/Tên FB.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("koc").update(payload).eq("id", kocId);

    if (error) {
      setMessage(`Lỗi: ${error.message}`);
      setSaving(false);
      return;
    }

    router.push("/koc");
    router.refresh();
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-5 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mx-auto mb-4 max-w-[980px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
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
                Sửa KOC
              </h1>

              <p className="mt-1 max-w-3xl text-[12.5px] leading-5 text-slate-500">
                Cập nhật thông tin KOC, PIC phụ trách, trạng thái và các trường
                ngày bằng lịch chọn ngày.
              </p>
            </div>
          </div>

          <Link
            href="/koc"
            className="flex h-9 w-fit items-center rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Về danh sách KOC
          </Link>
        </div>
      </header>

      {loading && (
        <div className="mx-auto max-w-[980px] rounded-2xl border border-slate-200 bg-white p-4 text-[13px] font-semibold text-slate-500">
          Đang tải dữ liệu KOC...
        </div>
      )}

      {!loading && !koc && (
        <div className="mx-auto max-w-[980px] rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          Không tìm thấy KOC cần sửa.
        </div>
      )}

      {!loading && koc && (
        <>
          {message && (
            <div className="mx-auto mb-3 max-w-[980px] rounded-2xl border border-red-200 bg-red-50 p-3 text-[13px] font-semibold text-red-700">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-[980px] space-y-3"
          >
            <CompactSection
              eyebrow="Thông tin định danh"
              title="ID, PIC, tier & trạng thái"
              description={`Mã KOC: ${koc.koc_code || "Chưa có mã"}`}
            >
              <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
                <CompactField label="ID TikTok/Tên FB" required>
                  <input
                    name="Id_tiktok_Ten_fb"
                    defaultValue={koc.Id_tiktok_Ten_fb || ""}
                    placeholder="Ví dụ: koc_nguyena"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="PIC phụ trách">
                  <select
                    name="employee_id"
                    defaultValue={koc.employee_id || ""}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    <option value="">Chưa có PIC</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {getEmployeeDisplayName(employee)}
                      </option>
                    ))}
                  </select>
                </CompactField>

                <CompactField label="Tên KOC">
                  <input
                    name="name"
                    defaultValue={koc.name || ""}
                    placeholder="Tên KOC"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Follower">
                  <input
                    name="follower"
                    defaultValue={koc.follower || ""}
                    placeholder="Ví dụ: 12000"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Tier">
                  <select
                    name="tier"
                    defaultValue={koc.tier || ""}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    <option value="">Chọn tier</option>
                    {tierOptions.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </CompactField>

                <CompactField label="Status">
                  <select
                    name="status"
                    defaultValue={koc.status || "Chờ phản hồi"}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </CompactField>

                <CompactField label="Channel type">
                  <select
                    name="channel_type"
                    defaultValue={koc.channel_type || ""}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    <option value="">Chọn channel type</option>
                    {channelTypeOptions.map((channelType) => (
                      <option key={channelType} value={channelType}>
                        {channelType}
                      </option>
                    ))}
                  </select>
                </CompactField>
              </div>
            </CompactSection>

            <CompactSection
              eyebrow="Liên hệ & mạng xã hội"
              title="SĐT, email, link và địa chỉ"
            >
              <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
                <CompactField label="SĐT/Zalo">
                  <input
                    name="phone"
                    defaultValue={koc.phone || ""}
                    placeholder="Số điện thoại/Zalo"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Email">
                  <input
                    name="email"
                    defaultValue={koc.email || ""}
                    placeholder="Email"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Link TikTok">
                  <input
                    name="tiktok_link"
                    defaultValue={koc.tiktok_link || ""}
                    placeholder="https://tiktok.com/@..."
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Link Facebook">
                  <input
                    name="facebook_link"
                    defaultValue={koc.facebook_link || ""}
                    placeholder="https://facebook.com/..."
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Address" full>
                  <textarea
                    name="address"
                    defaultValue={koc.address || ""}
                    placeholder="Địa chỉ"
                    className="min-h-[58px] w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12.5px] leading-5 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>
              </div>
            </CompactSection>

            <CompactSection
              eyebrow="Booking & campaign"
              title="Ngày, GMV, campaign"
            >
              <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
                <CompactField label="Booking date">
                  <DatePickerInput
                    name="booking_date"
                    defaultValue={koc.booking_date || ""}
                  />
                </CompactField>

                <CompactField label="Date of birth">
                  <DatePickerInput
                    name="date_of_birth"
                    defaultValue={koc.date_of_birth || ""}
                  />
                </CompactField>

                <CompactField label="CS gần nhất">
                  <DatePickerInput
                    name="new_contact_date"
                    defaultValue={koc.new_contact_date || ""}
                  />
                </CompactField>

                <CompactField label="Daily Videos(T-1)">
                  <input
                    name="number_of_videos"
                    defaultValue={koc.number_of_videos || ""}
                    placeholder="Số video"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Monthly Videos">
                  <input
                    name="monthly_videos"
                    defaultValue={koc.monthly_videos || ""}
                    placeholder="Số video tháng"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="GMV ngày">
                  <input
                    name="gmv"
                    defaultValue={koc.gmv || ""}
                    placeholder="Ví dụ: 1000000"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="GMV tháng">
                  <input
                    name="gmv_thang"
                    defaultValue={koc.gmv_thang || ""}
                    placeholder="Ví dụ: 30000000"
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  />
                </CompactField>

                <CompactField label="Marital status">
                  <select
                    name="marital_status"
                    defaultValue={koc.marital_status || ""}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    <option value="">Chọn trạng thái</option>
                    {maritalStatusOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </CompactField>

                <CompactField label="Campaign" full>
                  <select
                    name="campaign_id"
                    defaultValue={koc.campaign_id || ""}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                  >
                    <option value="">Không chọn campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.campaign_code || campaign.campaign_name} -{" "}
                        {campaign.campaign_name || campaign.product_name || ""}
                      </option>
                    ))}
                  </select>
                </CompactField>
              </div>
            </CompactSection>

            <CompactSection eyebrow="Ghi chú" title="Thông tin bổ sung">
              <CompactField label="Note" full>
                <textarea
                  name="note"
                  defaultValue={koc.note || ""}
                  placeholder="Ghi chú thêm..."
                  className="min-h-[68px] w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12.5px] leading-5 outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
                />
              </CompactField>
            </CompactSection>

            <div className="sticky bottom-3 z-20 rounded-[16px] border border-slate-200 bg-white/90 p-2.5 shadow-2xl backdrop-blur">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/koc"
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

function getEmployeeDisplayName(employee?: DbRow | null) {
  if (!employee) return "Chưa rõ PIC";

  return (
    employee.employee_code ||
    employee.full_name ||
    employee.name ||
    employee.email ||
    "Chưa rõ PIC"
  );
}
