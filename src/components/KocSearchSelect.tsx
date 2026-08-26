"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DbRow = Record<string, any>;

type KocSearchSelectProps = {
  name: string;
  kocs: DbRow[];
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (kocId: string, koc?: DbRow | null) => void;
  // Nếu có: tìm KOC TRỰC TIẾP trên server khi gõ (không cần tải sẵn toàn bộ KOC).
  // Trả về danh sách KOC khớp từ khóa.
  onSearch?: (query: string) => Promise<DbRow[]>;
};

export default function KocSearchSelect({
  name,
  kocs,
  defaultValue,
  placeholder = "Gõ ID TikTok/Tên FB để tìm KOC...",
  disabled,
  onChange,
  onSearch,
}: KocSearchSelectProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState(String(defaultValue || ""));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Chế độ server: kết quả tìm + trạng thái đang tìm
  const [serverResults, setServerResults] = useState<DbRow[]>([]);
  const [searching, setSearching] = useState(false);
  // Giữ object của KOC đã chọn (để hiển thị "Đã chọn" kể cả khi tìm server)
  const [selectedKocObj, setSelectedKocObj] = useState<DbRow | null>(null);

  // KOC đang chọn: ưu tiên object đã chọn, rồi tới danh sách props, rồi kết quả server
  const selectedKoc = useMemo(() => {
    if (!selectedId) return null;
    if (selectedKocObj && String(selectedKocObj.id) === String(selectedId)) {
      return selectedKocObj;
    }
    return (
      kocs.find((koc) => String(koc.id) === String(selectedId)) ||
      serverResults.find((koc) => String(koc.id) === String(selectedId)) ||
      null
    );
  }, [kocs, serverResults, selectedId, selectedKocObj]);

  // Báo cho form cha khi KOC được chọn/đổi/xóa (kèm object nếu có)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const selectedKocRef = useRef<DbRow | null>(null);
  selectedKocRef.current = selectedKoc;
  useEffect(() => {
    onChangeRef.current?.(selectedId, selectedKocRef.current);
  }, [selectedId]);

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

  // Tìm KOC trên server (debounce) khi ở chế độ onSearch
  useEffect(() => {
    if (!onSearch || !open) return;

    const keyword = query.trim();

    // Không tìm khi ô đang hiển thị đúng tên KOC đã chọn (vừa chọn xong)
    if (selectedKoc && keyword === getKocDisplayName(selectedKoc)) return;

    if (keyword.length < 2) {
      setServerResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const results = await onSearch(keyword);
        if (!cancelled) setServerResults(results || []);
      } catch {
        if (!cancelled) setServerResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, onSearch, selectedKoc]);

  const filteredKocs = useMemo(() => {
    // Chế độ server: dùng thẳng kết quả server
    if (onSearch) {
      return serverResults.slice(0, 30);
    }

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
  }, [kocs, query, onSearch, serverResults]);

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);

    if (!value.trim()) {
      setSelectedId("");
      setSelectedKocObj(null);
    }
  }

  function handleSelect(koc: DbRow) {
    setSelectedKocObj(koc);
    selectedKocRef.current = koc;
    setSelectedId(String(koc.id || ""));
    setQuery(getKocDisplayName(koc));
    setOpen(false);
  }

  function clearSelectedKoc() {
    setSelectedId("");
    setSelectedKocObj(null);
    setQuery("");
    setServerResults([]);
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
          {searching && (
            <div className="px-3 py-3 text-[12.5px] font-semibold text-slate-500">
              Đang tìm KOC...
            </div>
          )}

          {!searching && onSearch && query.trim().length < 2 && (
            <div className="px-3 py-3 text-[12.5px] font-semibold text-slate-500">
              Gõ ít nhất 2 ký tự để tìm KOC.
            </div>
          )}

          {!searching &&
            filteredKocs.length === 0 &&
            (!onSearch || query.trim().length >= 2) && (
              <div className="px-3 py-3 text-[12.5px] font-semibold text-red-600">
                Không tìm thấy KOC. Kiểm tra lại ID TikTok/Tên FB.
              </div>
            )}

          {!searching &&
            filteredKocs.map((koc) => (
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
