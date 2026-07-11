"use client";

type DbRow = Record<string, any>;

type KpiInput = {
  lienHe: string;
  phanHoi: string;
  bookingMoi: string;
  gmv: string;
};

type MetricKey = keyof KpiInput;

const METRICS: { key: MetricKey; label: string; money: boolean }[] = [
  { key: "lienHe", label: "Liên hệ", money: false },
  { key: "phanHoi", label: "Phản hồi", money: false },
  { key: "bookingMoi", label: "Booking mới", money: false },
  { key: "gmv", label: "GMV", money: true },
];

const ACTUAL: Record<MetricKey, (row: DbRow) => number> = {
  lienHe: (row) => Number(row.lienHe) || 0,
  phanHoi: (row) => Number(row.phanHoi) || 0,
  bookingMoi: (row) => Number(row.bookingMoi) || 0,
  gmv: (row) => Number(row.gmvNgay) || 0,
};

// Trực quan hoá TỶ LỆ HOÀN THÀNH KPI: mỗi thanh = % thực đạt so với mục tiêu,
// track đầy = đạt 100% KPI. Màu trạng thái đi kèm nhãn % + icon (không dùng màu đơn lẻ).
export default function KpiAchievement({
  rows,
  kpiInputs,
}: {
  rows: DbRow[];
  kpiInputs: Record<string, KpiInput>;
}) {
  const picRows = rows.filter((row) => row.isRealPic);

  return (
    <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
      {METRICS.map((metric) => {
        const items = picRows
          .map((row) => {
            const id = String(row.employeeId);
            const actual = ACTUAL[metric.key](row);
            const kpi = parseNumber(kpiInputs[id]?.[metric.key]);
            const hasKpi = kpi > 0;
            const pct = hasKpi ? (actual / kpi) * 100 : null;

            return {
              id,
              name: String(row.employeeName || "—"),
              actual,
              kpi,
              hasKpi,
              pct,
            };
          })
          .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

        const withKpi = items.filter((item) => item.hasKpi);
        const metCount = withKpi.filter(
          (item) => (item.pct ?? 0) >= 100
        ).length;

        return (
          <div
            key={metric.key}
            className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-bold text-slate-800">
                Tỷ lệ hoàn thành KPI — {metric.label}
              </h3>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600">
                Đạt: {metCount}/{withKpi.length}
              </span>
            </div>

            {withKpi.length === 0 ? (
              <p className="py-6 text-center text-[12px] font-semibold text-slate-400">
                Chưa nhập KPI {metric.label}. Nhập KPI ở bảng bên dưới để xem tỷ
                lệ.
              </p>
            ) : (
              <div className="space-y-1.5">
                {items.map((item) => {
                  const color = statusColor(item.pct, item.hasKpi);
                  const fill =
                    item.pct === null ? 0 : Math.min(Math.max(item.pct, 0), 100);
                  const met = (item.pct ?? 0) >= 100;

                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <div
                        className="w-20 shrink-0 truncate text-[12px] font-semibold text-slate-600"
                        title={item.name}
                      >
                        {item.name}
                      </div>

                      <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300"
                          style={{ width: `${fill}%`, background: color }}
                          title={`${item.name}: ${formatPct(item.pct)} (${formatValue(
                            item.actual,
                            metric.money
                          )} / ${formatValue(item.kpi, metric.money)})`}
                        />
                      </div>

                      <div className="flex w-24 shrink-0 items-center justify-end gap-1">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="text-[12px] font-bold tabular-nums text-slate-800">
                          {formatPct(item.pct)}
                        </span>
                        {met && (
                          <span className="text-[11px] font-black text-emerald-600">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function statusColor(pct: number | null, hasKpi: boolean) {
  if (!hasKpi || pct === null) return "#cbd5e1"; // slate-300 (chưa có KPI)
  if (pct >= 100) return "#0ca30c"; // good
  if (pct >= 70) return "#fab219"; // warning
  return "#d03b3b"; // critical
}

function formatPct(pct: number | null) {
  if (pct === null) return "—";
  return `${pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function formatValue(value: number, money: boolean) {
  const text = Number(value || 0).toLocaleString("vi-VN");
  return money ? `${text}đ` : text;
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const raw = String(value).trim().replace(/\./g, "").replace(/,/g, "");
  const numberValue = Number(raw);
  return Number.isNaN(numberValue) ? 0 : numberValue;
}
