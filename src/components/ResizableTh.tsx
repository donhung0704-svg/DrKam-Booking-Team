"use client";

import { useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";

// Ô tiêu đề bảng có thể KÉO GIÃN chiều rộng (tự quản lý width, không cần lưu).
// Dùng cho bảng table-fixed để mỗi cột đổi rộng tự do.
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
  const [width, setWidth] = useState<number | null>(null);
  const ref = useRef<HTMLTableCellElement>(null);

  function onResizeStart(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width ?? ref.current?.offsetWidth ?? 100;

    function onMove(moveEvent: MouseEvent) {
      setWidth(Math.max(48, startWidth + moveEvent.clientX - startX));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
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
