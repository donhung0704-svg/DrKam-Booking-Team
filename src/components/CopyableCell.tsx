"use client";

import { useState } from "react";

// Ô hiển thị (chỉ đọc) bấm để copy nhanh giá trị. Hiện "✓ Đã copy" ~1s.
export default function CopyableCell({
  text,
  className = "",
  bold = true,
}: {
  text: unknown;
  className?: string;
  bold?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const value = String(text ?? "").trim();

  if (!value || value === "-") {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <button
      type="button"
      title="Bấm để copy"
      onClick={(event) => {
        event.stopPropagation();
        navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1000);
      }}
      className={`block w-full cursor-copy truncate text-left hover:text-[#3964ff] ${
        bold ? "font-semibold text-slate-700" : "text-slate-700"
      } ${copied ? "text-emerald-600" : ""} ${className}`}
    >
      {copied ? "✓ Đã copy" : value}
    </button>
  );
}
