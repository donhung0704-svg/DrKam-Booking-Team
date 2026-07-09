"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DbRow = Record<string, any>;

type KocSearchSelectProps = {
  name: string;
  kocs: DbRow[];
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
};

export default function KocSearchSelect({
  name,
  kocs,
  defaultValue,
  placeholder = "Gõ ID TikTok/Tên FB để tìm KOC...",
  disabled,
}: KocSearchSelectProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState(String(defaultValue || ""));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedKoc = useMemo(() => {
    if (!selectedId) return null;

    return kocs.find((koc) => String(koc.id) === String(selectedId)) || null;
  }, [kocs, selectedId]);

  useEffect(() => {
    if (!selectedKoc) return;

    setQuery(getKocDisplayName(selectedKoc));
  }, [selectedKoc?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);

        if (selectedKoc) {
          setQuery(getKocDisplayName(selectedKoc));
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedKoc]);

  const filteredKocs = useMemo(() => {
    const keyword = normalizeSearchText(query);

    if (!keyword) {
      return kocs.slice(0, 30);
    }

    return kocs
      .filter((koc) => {
        const haystack = normalizeSearchText(
          [
            koc.Id_tiktok_Ten_fb,
            koc.name,
            koc.koc_code,
            koc.phone,
            koc.tiktok_link,
          ]
            .filter(Boolean)
            .join(" ")
        );

        return haystack.includes(keyword);
      })
      .slice(0, 30);
  }, [kocs, query]);

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);

    if (!value.trim()) {
      setSelectedId("");
    }
  }

  function handleSelect(koc: DbRow) {
    setSelectedId(String(koc.id || ""));
    setQuery(getKocDisplayName(koc));
    setOpen(false);
  }

  function clearSelectedKoc() {
    setSelectedId("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />

      <div className="relative">
        <input
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={placeholder}
          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 pr-16 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        {selectedId && (
          <button
            type="button"
            onClick={clearSelectedKoc}
            disabled={disabled}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md px-1.5 text-[11px] font-black text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed"
            title="Đổi KOC"
          >
            ×
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 disabled:cursor-not-allowed"
          title="Mở danh sách"
        >
          🔎
        </button>
      </div>

      {selectedKoc && (
        <p className="mt-1 text-[11px] font-semibold text-emerald-700">
          Đã chọn: {getKocDisplayName(selectedKoc)}
        </p>
      )}

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[260px] overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          {filteredKocs.length === 0 && (
            <div className="px-3 py-3 text-[12.5px] font-semibold text-red-600">
              Không tìm thấy KOC. Kiểm tra lại ID TikTok/Tên FB.
            </div>
          )}

          {filteredKocs.map((koc) => (
            <button
              key={koc.id}
              type="button"
              onClick={() => handleSelect(koc)}
              className={`block w-full rounded-xl px-3 py-2 text-left text-[12.5px] hover:bg-blue-50 ${
                String(koc.id) === selectedId ? "bg-blue-50" : ""
              }`}
            >
              <span className="block font-black text-slate-950">
                {koc.Id_tiktok_Ten_fb || koc.name || koc.koc_code || "Chưa rõ ID"}
              </span>

              <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                {[koc.name, koc.koc_code, koc.phone].filter(Boolean).join(" · ") ||
                  "Không có thông tin phụ"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getKocDisplayName(koc?: DbRow | null) {
  if (!koc) return "";

  return (
    koc.Id_tiktok_Ten_fb ||
    koc.name ||
    koc.koc_code ||
    koc.phone ||
    "Chưa rõ KOC"
  );
}

function normalizeSearchText(value: unknown) {
  return removeVietnamese(String(value || ""))
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, "")
    .replace(/^@/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "")
    .replace(/\s+/g, "");
}

function removeVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
