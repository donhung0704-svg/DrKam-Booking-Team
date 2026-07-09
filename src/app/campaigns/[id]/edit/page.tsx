"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type DbRow = Record<string, any>;

const campaignStatusOptions = [
  "Đang thực hiện",
  "Đã hoàn thành",
  "Hủy bỏ",
];

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();

  const id = String(params.id || "");

  const [campaign, setCampaign] = useState<DbRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCampaign() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setMessage(`Lỗi tải Campaign: ${error.message}`);
        setCampaign(null);
      } else {
        setCampaign(data);
      }

      setLoading(false);
    }

    if (id) {
      loadCampaign();
    }
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!campaign) return;

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

    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", id);

    if (error) {
      setMessage(`Lỗi cập nhật Campaign: ${error.message}`);
      setSaving(false);
      return;
    }

    router.push("/campaigns");
    router.refresh();
  }

  if (loading) {
    return (
      <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 md:px-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Đang tải dữ liệu Campaign...
        </div>
      </section>
    );
  }

  if (!campaign) {
    return (
      <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 md:px-8">
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm">
          Không tìm thấy Campaign.
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
                Sửa Campaign
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Cập nhật chiến dịch, ngân sách, target video, target GMV và
                trạng thái triển khai.
              </p>
            </div>
          </div>

          <Link
            href="/campaigns"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Về danh sách Campaign
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
          title="Thông tin Campaign"
          description="Thông tin nhận diện và trạng thái triển khai chiến dịch."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Mã Campaign" required>
              <input
                name="campaign_code"
                defaultValue={campaign.campaign_code || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Tên Campaign" required>
              <input
                name="campaign_name"
                defaultValue={campaign.campaign_name || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Sản phẩm">
              <input
                name="product_name"
                defaultValue={campaign.product_name || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Status">
              <select
                name="status"
                defaultValue={campaign.status || "Đang thực hiện"}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              >
                {campaignStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Thời gian & KPI"
          description="Nhập ngày theo định dạng dd/mm/yyyy."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Ngày bắt đầu">
              <input
                name="start_date"
                defaultValue={formatDateForDisplay(campaign.start_date)}
                placeholder="dd/mm/yyyy"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Ngày kết thúc">
              <input
                name="end_date"
                defaultValue={formatDateForDisplay(campaign.end_date)}
                placeholder="dd/mm/yyyy"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Ngân sách">
              <input
                name="budget"
                defaultValue={campaign.budget || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Target video">
              <input
                name="target_video"
                defaultValue={campaign.target_video || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>

            <Field label="Target GMV">
              <input
                name="target_gmv"
                defaultValue={campaign.target_gmv || ""}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Ghi chú" description="Thông tin bổ sung cho Campaign.">
          <Field label="Note">
            <textarea
              name="note"
              defaultValue={campaign.note || ""}
              className="min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </Field>
        </FormSection>

        <div className="sticky bottom-4 z-20 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <Link
              href="/campaigns"
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