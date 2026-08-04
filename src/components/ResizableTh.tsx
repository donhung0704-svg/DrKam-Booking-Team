"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";

// Nhóm bảng (prefix) để khóa localStorage riêng cho từng bảng.
// Bọc <ResizeGroupContext.Provider value="ten-bang"> quanh <table> để bật lưu.
export const ResizeGroupContext = createContext<string>("");

function keyFromChildren(children: ReactNode): string {
  return typeof children === "string" ? children.trim() : "";
}

// Ô tiêu đề bảng KÉO GIÃN được. Nếu nằm trong 1 ResizeGroup và tiêu đề là
// chuỗi -> nhớ chiều rộng vào localStorage (khôi phục khi tải lại).
export default function ResizableTh({
  children,
  className = "",
  style,
  rowSpan,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  rowSpan?: number;
  colSpan?: number;
}) {
  const group = useContext(ResizeGroupContext);
  const colKey = keyFromChildren(children);
  const storageKey = group && colKey ? `drkam_colw_${group}__${colKey}` : "";

  const [width, setWidth] = useState<number | null>(null);
  const ref = useRef<HTMLTableCellElement>(null);

  // Khôi phục chiều rộng đã lưu
  useEffect(() => {
    if (!storageKey) return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const value = Number(saved);
      if (!Number.isNaN(value) && value > 0) setWidth(value);
    }
  }, [storageKey]);

  function onResizeStart(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width ?? ref.current?.offsetWidth ?? 100;
    let latest = startWidth;

    function onMove(moveEvent: MouseEvent) {
      latest = Math.max(48, startWidth + moveEvent.clientX - startX);
      setWidth(latest);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (storageKey) window.localStorage.setItem(storageKey, String(latest));
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <th
      ref={ref}
      rowSpan={rowSpan}
      colSpan={colSpan}
      style={{
        ...style,
        ...(width ? { width, minWidth: width, maxWidth: width } : {}),
      }}
      className={`relative ${className}`}
    >
      {children}
      <span
        onMouseDown={onResizeStart}
        title="Kéo để đổi rộng cột"
        className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize select-none hover:bg-[#3964ff]/40"
      />
    </th>
  );
}
