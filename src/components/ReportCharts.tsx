"use client";

type DbRow = Record<string, any>;

type Metric = {
  key: string;
  label: string;
  color: string;
  money: boolean;
  get: (row: DbRow) => number;
};

// Mỗi biểu đồ là 1 chỉ tiêu (single-hue) — danh tính PIC nằm ở nhãn trục,
// giá trị hiển thị trực tiếp ở cuối thanh nên màu không phải kênh mã hoá duy nhất.
export default function ReportCharts({
  rows,
  videoLabel,
}: {
  rows: DbRow[];
  videoLabel: string;
}) {
  const picRows = rows.filter((row) => row.isRealPic);

  const metrics: Metric[] = [
    {
      key: "lienHe",
      label: "Liên hệ",
      color: "#256abf",
      money: false,
      get: (r) => Number(r.lienHe) || 0,
    },
    {
      key: "phanHoi",
      label: "Phản hồi",
      color: "#4a3aa7",
      money: false,
      get: (r) => Number(r.phanHoi) || 0,
    },
    {
      key: "bookingMoi",
      label: "Booking mới",
      color: "#eb6834",
      money: false,
      get: (r) => Number(r.bookingMoi) || 0,
    },
    {
      key: "video",
      label: videoLabel,
      color: "#1baf7a",
      money: false,
      get: (r) => (Number(r.dailyVideoNew) || 0) + (Number(r.dailyVideoOld) || 0),
    },
    {
      key: "gmv",
      label: "GMV",
      color: "#008300",
      money: true,
      get: (r) => Number(r.gmvNgay) || 0,
    },
  ];

  const totals = metrics.map((metric) =>
    picRows.reduce((sum, row) => sum + metric.get(row), 0)
  );

  return (
    <>
      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <div
            key={metric.key}
            className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: metric.color }}
              />
              <p className="text-[12px] font-bold text-slate-500">
                {metric.label}
              </p>
            </div>

            <p className="mt-2 text-[24px] font-black leading-none tracking-tight text-slate-950 tabular-nums">
              {metric.money
                ? formatMoney(totals[index])
                : formatNumber(totals[index])}
            </p>

            <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
              Tổng {picRows.length} PIC
            </p>
          </div>
        ))}
      </section>

      <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {metrics.map((metric) => (
          <MetricBarChart key={metric.key} metric={metric} rows={picRows} />
        ))}
      </section>
    </>
  );
}

function MetricBarChart({ metric, rows }: { metric: Metric; rows: DbRow[] }) {
  const data = rows
    .map((row) => ({
      id: String(row.employeeId),
      name: String(row.employeeName || "—"),
      value: metric.get(row),
    }))
    .sort((a, b) => b.value - a.value);

  const max = data.reduce((m, item) => Math.max(m, item.value), 0);

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: metric.color }}
          />
          <h3 className="text-[13px] font-bold text-slate-800">
            {metric.label} theo PIC
          </h3>
        </div>
      </div>

      {max === 0 ? (
        <p className="py-6 text-center text-[12px] font-semibold text-slate-400">
          Chưa có số liệu
        </p>
      ) : (
        <div className="space-y-1.5">
          {data.map((item) => {
            const pct = max > 0 ? (item.value / max) * 100 : 0;
            const valueLabel = metric.money
              ? formatMoney(item.value)
              : formatNumber(item.value);

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
                    style={{
                      width: `${Math.max(pct, item.value > 0 ? 3 : 0)}%`,
                      background: metric.color,
                    }}
                    title={`${item.name}: ${valueLabel}`}
                  />
                </div>

                <div className="w-20 shrink-0 text-right text-[12px] font-bold tabular-nums text-slate-800">
                  {valueLabel}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatNumber(value: unknown) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatMoney(value: unknown) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}
