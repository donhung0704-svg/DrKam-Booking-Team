"use client";

import { supabase } from "@/lib/supabase/client";
import CampaignAdvancedTable from "@/components/CampaignAdvancedTable";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type DbRow = Record<string, any>;

const campaignStatusOptions = [
  "Đang thực hiện",
  "Đã hoàn thành",
  "Hủy bỏ",
];

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("campaign_code", { ascending: false })
        .limit(5000);

      if (error) {
        setMessage(`Lỗi tải danh sách Campaign: ${error.message}`);
        setCampaigns([]);
      } else {
        setCampaigns(data || []);
      }

      setLoading(false);
    }

    loadCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const searchableText = [
        campaign.campaign_code,
        campaign.campaign_name,
        campaign.product_name,
        campaign.start_date,
        campaign.end_date,
        campaign.budget,
        campaign.target_video,
        campaign.target_gmv,
        campaign.status,
        campaign.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = keyword ? searchableText.includes(keyword) : true;

      const matchStatus = statusFilter
        ? String(campaign.status || "") === statusFilter
        : true;

      return matchSearch && matchStatus;
    });
  }, [campaigns, searchText, statusFilter]);

  const activeCampaignCount = filteredCampaigns.filter(
    (campaign) => campaign.status === "Đang thực hiện"
  ).length;

  const completedCampaignCount = filteredCampaigns.filter(
    (campaign) => campaign.status === "Đã hoàn thành"
  ).length;

  const canceledCampaignCount = filteredCampaigns.filter(
    (campaign) => campaign.status === "Hủy bỏ"
  ).length;

  const totalBudget = filteredCampaigns.reduce((total, campaign) => {
    return total + parseNumber(campaign.budget);
  }, 0);

  function clearFilters() {
    setSearchText("");
    setStatusFilter("");
  }

  function exportCampaignExcel() {
    const exportRows = filteredCampaigns.map((campaign) => ({
      "Mã Campaign": campaign.campaign_code || "",
      "Tên Campaign": campaign.campaign_name || "",
      "Sản phẩm": campaign.product_name || "",
      "Ngày bắt đầu": formatDate(campaign.start_date),
      "Ngày kết thúc": formatDate(campaign.end_date),
      "Ngân sách": campaign.budget ? Number(campaign.budget) : "",
      "Target video": campaign.target_video ? Number(campaign.target_video) : "",
      "Target GMV": campaign.target_gmv ? Number(campaign.target_gmv) : "",
      Status: campaign.status || "",
      Note: campaign.note || "",
    }));

    if (exportRows.length === 0) {
      alert("Không có dữ liệu Campaign để xuất Excel.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 32 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 45 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sach Campaign");

    XLSX.writeFile(
      workbook,
      `danh-sach-campaign-${getTodayForFileName()}.xlsx`
    );
  }

  return (
    <section className="crm-light min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:px-8">
      <header className="mb-4 rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg">
              🚀
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase leading-[1.3] tracking-[0.22em] text-red-600">
                DRKAM CRM PORTAL
              </p>

              <h1 className="text-[26px] font-bold leading-tight tracking-normal text-slate-950 md:text-[28px]">
                Danh sách Campaign
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-5 text-slate-500">
                Quản lý chiến dịch, sửa trực tiếp dữ liệu, kéo thả cột, ghim
                cột và xuất Excel.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCampaignExcel}
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

            <Link
              href="/"
              className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {message}
        </div>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetricCard
          icon="📋"
          title="Campaign đang hiển thị"
          value={filteredCampaigns.length}
          note="Theo bộ lọc hiện tại"
          tone="blue"
        />

        <MiniMetricCard
          icon="🔥"
          title="Đang thực hiện"
          value={activeCampaignCount}
          note="Campaign đang chạy"
          tone="green"
        />

        <MiniMetricCard
          icon="✅"
          title="Đã hoàn thành"
          value={completedCampaignCount}
          note={`Hủy bỏ: ${canceledCampaignCount}`}
          tone="purple"
        />

        <MiniMetricCard
          icon="💰"
          title="Tổng ngân sách"
          value={formatMoney(totalBudget)}
          note="Theo danh sách đang lọc"
          tone="orange"
        />
      </section>

      <section className="mb-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[210px_1.8fr_1fr_auto] xl:items-end">
          <div className="pb-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">
              Bộ lọc dữ liệu
            </p>

            <h2 className="mt-1 text-[18px] font-bold leading-tight text-slate-950">
              Tìm kiếm Campaign
            </h2>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-600">
              Tìm kiếm
            </label>

            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tên campaign, mã campaign, sản phẩm, ghi chú..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-slate-600">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#3964ff] focus:ring-4 focus:ring-[#3964ff]/10"
            >
              <option value="">Tất cả</option>

              {campaignStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-100"
          >
            Xóa bộ lọc
          </button>
        </div>
      </section>

      <CampaignAdvancedTable
        campaigns={filteredCampaigns}
        totalCampaigns={campaigns.length}
        loading={loading}
        onExport={exportCampaignExcel}
        onCampaignUpdated={(id, patch) => {
          setCampaigns((prev) =>
            prev.map((item) =>
              String(item.id) === String(id) ? { ...item, ...patch } : item
            )
          );
        }}
      />
    </section>
  );
}

function MiniMetricCard({
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: string;
  title: string;
  value: number | string;
  note: string;
  tone: "blue" | "green" | "purple" | "orange";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "orange"
          ? "bg-orange-50 text-orange-700 border-orange-100"
          : "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-[26px] font-bold leading-none tracking-normal text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-[12px] font-semibold text-slate-400">
            {note}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg ${toneClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const raw = String(value).trim().replace(/\./g, "").replace(/,/g, "");
  const numberValue = Number(raw);

  if (Number.isNaN(numberValue)) return 0;

  return numberValue;
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return String(value);

  return numberValue.toLocaleString("vi-VN");
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return String(value);

  return `${numberValue.toLocaleString("vi-VN")}đ`;
}

function formatDate(value: unknown) {
  if (!value) return "-";

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

    return raw;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getTodayForFileName() {
  const today = new Date();

  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(today);

  const [year, month, day] = formatted.split("-");

  return `${day}-${month}-${year}`;
}
