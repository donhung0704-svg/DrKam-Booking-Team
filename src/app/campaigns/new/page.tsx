"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const campaignStatusOptions = [
  "Đang thực hiện",
  "Đã hoàn thành",
  "Hủy bỏ",
];

export default function NewCampaignPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const payload = {
      campaign_code: getText(formData, "campaign_code"),
      campaign_name: getText(formData, "campaign_name"),
      product_name: getText(formData, "product_name") || null,
      start_date: parseVietnameseDateInput(formData.get("start_date")),
      end_date: parseVietnameseDateInput(formData.get("end_date")),
      budget: getNumber(formData, "budget"),
      target_video: getNumber(formData, "target_video"),
      target_gmv: getNumber(formData, "target_gmv"),
      status: getText(formData, "status") || "Đang thực hiện",
      note: getText(formData, "note") || null,
    };

    if (!payload.campaign_code) {
      setMessage("Vui lòng nhập Mã Campaign.");
      setSaving(false);
      return;
    }

    if (!payload.campaign_name) {
      setMessage("Vui lòng nhập Tên Campaign.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("campaigns").insert(payload);

    if (error) {
      setMessage(`Lỗi tạo Campaign: ${error.message}`);
      setSaving(false);
      return;
    }

    router.push("/campaigns");
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
                Tạo Campaign mới
              </h1>

              <p className="mt-1 max-w-3xl text-[12.5px] leading-5 text-slate-500">
                Tạo chiến dịch mới để quản lý booking KOC, ngân sách, target
                video và target GMV.
              </p>
            </div>
          </div>

          <Link
            href="/campaigns"
            className="flex h-9 w-fit items-center rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Về danh sách Campaign
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
          eyebrow="Thông tin Campaign"
          title="Thông tin nhận diện"
          description="Mã Campaign và Tên Campaign là bắt buộc."
        >
          <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
            <CompactField label="Mã Campaign" required>
              <input
                name="campaign_code"
                placeholder="Ví dụ: CAMP0626"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Tên Campaign" required>
              <input
                name="campaign_name"
                placeholder="Ví dụ: Camp KOC tháng 6"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Sản phẩm">
              <input
                name="product_name"
                placeholder="Ví dụ: Nước súc miệng DrKam"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Status">
              <select
                name="status"
                defaultValue="Đang thực hiện"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              >
                {campaignStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </CompactField>
          </div>
        </CompactSection>

        <CompactSection
          eyebrow="Thời gian & KPI"
          title="Mốc thời gian, ngân sách, mục tiêu"
          description="Nhập ngày theo định dạng dd/mm/yyyy."
        >
          <div className="grid grid-cols-1 gap-px bg-slate-200 p-px xl:grid-cols-2">
            <CompactField label="Ngày bắt đầu">
              <input
                name="start_date"
                placeholder="dd/mm/yyyy"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Ngày kết thúc">
              <input
                name="end_date"
                placeholder="dd/mm/yyyy"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Ngân sách">
              <input
                name="budget"
                placeholder="Ví dụ: 10000000"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Target video">
              <input
                name="target_video"
                placeholder="Ví dụ: 100"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>

            <CompactField label="Target GMV">
              <input
                name="target_gmv"
                placeholder="Ví dụ: 50000000"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10"
              />
            </CompactField>
          </div>
        </CompactSection>

        <CompactSection eyebrow="Ghi chú" title="Thông tin bổ sung">
          <CompactField label="Note" full>
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
              href="/campaigns"
              className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="h-9 rounded-xl bg-[#3964ff] px-5 text-[12.5px] font-bold text-white shadow-md hover:bg-[#2f55df] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Tạo Campaign"}
            </button>
          </div>
        </div>
      </form>
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
