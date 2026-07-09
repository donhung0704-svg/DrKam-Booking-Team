import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type DbRow = Record<string, any>;

type ChartItem = {
  label: string;
  value: number;
};

const contentBookingTypes = [
  "Booking vid",
  "Booking live",
  "Booking vid+live",
  "Booking mới",
];

const giftBookingTypes = [
  "Quà Tết",
  "Quà Tri Ân",
  "Quà Sinh Nhật",
  "Tặng quà",
];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isContentBookingType(value: unknown) {
  return contentBookingTypes.includes(normalizeText(value));
}

function isGiftBookingType(value: unknown) {
  return giftBookingTypes.includes(normalizeText(value));
}

function getVNDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function normalizeDate(value: unknown) {
  if (!value) return "";

  const raw = String(value).trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);

  if (!Number.isNaN(date.getTime())) {
    return getVNDate(date);
  }

  const shortDate = raw.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) {
    return shortDate;
  }

  return "";
}

function isSameVNDate(value: unknown, targetDate: string) {
  return normalizeDate(value) === targetDate;
}

function getMonthRangeVN() {
  const today = getVNDate();
  const [year, month] = today.split("-").map(Number);

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonth =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  return { monthStart, nextMonth };
}

function getVietnamDayRange(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const nextDay = new Date(Date.UTC(year, month - 1, day));
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const nextDayKey = [
    nextDay.getUTCFullYear(),
    String(nextDay.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDay.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return {
    startIso: `${dateKey}T00:00:00+07:00`,
    endIso: `${nextDayKey}T00:00:00+07:00`,
  };
}

function getVietnamMonthRangeIso(monthStart: string, nextMonth: string) {
  return {
    monthStartIso: `${monthStart}T00:00:00+07:00`,
    nextMonthStartIso: `${nextMonth}T00:00:00+07:00`,
  };
}

async function loadAllRows(
  fetchPage: (from: number, to: number) => PromiseLike<any>
) {
  const allRows: DbRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const result = await fetchPage(from, to);

    if (result.error) {
      return {
        data: allRows,
        error: result.error,
      };
    }

    const rows = result.data || [];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }
  }

  return {
    data: allRows,
    error: null,
  };
}

function isDateInRange(value: unknown, startDate: string, endDate: string) {
  const date = normalizeDate(value);

  if (!date) return false;

  return date >= startDate && date < endDate;
}

function daysBetween(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00+07:00`).getTime();
  const to = new Date(`${toDate}T00:00:00+07:00`).getTime();

  if (Number.isNaN(from) || Number.isNaN(to)) return 0;

  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

function groupByDate(rows: DbRow[], dateField: string): ChartItem[] {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    const date = normalizeDate(row[dateField]);
    if (!date) return;

    map.set(date, (map.get(date) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function groupBookingByPic(bookings: DbRow[], employees: DbRow[]): ChartItem[] {
  const employeeMap = new Map<string, string>();

  employees.forEach((employee) => {
    const id = employee.id;
    if (!id) return;

    employeeMap.set(String(id), getEmployeeDisplayName(employee));
  });

  const map = new Map<string, number>();

  bookings.forEach((booking) => {
    const employeeId = booking.employee_id;

    const picName = employeeId
      ? employeeMap.get(String(employeeId)) || "Chưa rõ PIC"
      : "Chưa có PIC";

    map.set(picName, (map.get(picName) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const today = getVNDate();
  const { monthStart, nextMonth } = getMonthRangeVN();
  const { startIso: todayStartIso, endIso: tomorrowStartIso } =
    getVietnamDayRange(today);
  const { monthStartIso, nextMonthStartIso } = getVietnamMonthRangeIso(
    monthStart,
    nextMonth
  );

  const [
    kocResult,
    bookingResult,
    employeeResult,
    kocCreatedTodayResult,
    kocCareTodayResult,
    contentBookingTodayResult,
    giftBookingTodayResult,
    videoPostedTodayResult,
    paidBookingTotalResult,
    bookingThisMonthResult,
  ] = await Promise.all([
    loadAllRows((from, to) =>
      supabase
        .from("koc")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),

    loadAllRows((from, to) =>
      supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),

    supabase
      .from("employees")
      .select("id, employee_code, full_name, email, phone, role, active, manager_id")
      .eq("active", true)
      .order("employee_code", { ascending: true })
      .limit(1000),

    supabase
      .from("koc")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStartIso)
      .lt("created_at", tomorrowStartIso),

    supabase
      .from("koc")
      .select("id, created_at", { count: "exact" })
      .eq("new_contact_date", today),

    supabase
      .from("bookings")
      .select("id, cast_price, employee_id", { count: "exact" })
      .gte("created_at", todayStartIso)
      .lt("created_at", tomorrowStartIso)
      .in("booking_type", contentBookingTypes),

    supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .gte("created_at", todayStartIso)
      .lt("created_at", tomorrowStartIso)
      .in("booking_type", giftBookingTypes),

    supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .eq("actual_post_date", today),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status_booking", "Đã thanh toán"),

    supabase
      .from("bookings")
      .select("id, employee_id", { count: "exact" })
      .gte("created_at", monthStartIso)
      .lt("created_at", nextMonthStartIso)
      .in("booking_type", contentBookingTypes),
  ]);

  const kocRows = kocResult.data ?? [];
  const bookingRows = bookingResult.data ?? [];
  const employeeRows = employeeResult.data ?? [];

  const errors = [
    kocResult.error,
    bookingResult.error,
    employeeResult.error,
    kocCreatedTodayResult.error,
    kocCareTodayResult.error,
    contentBookingTodayResult.error,
    giftBookingTodayResult.error,
    videoPostedTodayResult.error,
    paidBookingTotalResult.error,
    bookingThisMonthResult.error,
  ].filter(Boolean);

  const employeeMap = new Map<string, DbRow>();

  employeeRows.forEach((employee) => {
    if (employee.id) {
      employeeMap.set(String(employee.id), employee);
    }
  });

  const kocMap = new Map<string, DbRow>();

  kocRows.forEach((koc) => {
    if (koc.id) {
      kocMap.set(String(koc.id), koc);
    }
  });

  const bookingKocIds = new Set(
    bookingRows
      .map((booking) => String(booking.koc_id || "").trim())
      .filter(Boolean)
  );

  const kocCreatedTodayCount = kocCreatedTodayResult.count ?? 0;

  const kocCareTodayRows = kocCareTodayResult.data ?? [];
  const kocCareTodayCount =
    kocCareTodayResult.count ?? kocCareTodayRows.length;

  const oldKocCareTodayCount = kocCareTodayRows.filter(
    (koc) => !isSameVNDate(koc.created_at, today)
  ).length;

  const bookingNewTodayRows = contentBookingTodayResult.data ?? [];
  const bookingNewTodayCount =
    contentBookingTodayResult.count ?? bookingNewTodayRows.length;

  const giftBookingTodayRows = giftBookingTodayResult.data ?? [];
  const giftBookingTodayCount =
    giftBookingTodayResult.count ?? giftBookingTodayRows.length;

  const videoPostedTodayCount =
    videoPostedTodayResult.count ?? (videoPostedTodayResult.data || []).length;

  const paidBookingTotalCount = paidBookingTotalResult.count ?? 0;

  const totalCastToday = bookingNewTodayRows.reduce((total, booking) => {
    return total + parseNumber(booking.cast_price);
  }, 0);

  const kocChartData = groupByDate(kocRows, "created_at");

  const bookingThisMonthNew = bookingThisMonthResult.data ?? [];
  const bookingThisMonthNewCount =
    bookingThisMonthResult.count ?? bookingThisMonthNew.length;

  const bookingByPicData = groupBookingByPic(bookingThisMonthNew, employeeRows);

  const overdueBookings = bookingRows.filter((booking) => {
    const expectedDate = normalizeDate(booking.expected_post_date);
    const status = String(booking.status_booking || "");

    if (!expectedDate) return false;

    return (
      expectedDate < today &&
      status !== "Đã đăng video" &&
      status !== "Đã thanh toán"
    );
  });

  const postedNotPaidBookings = bookingRows.filter((booking) => {
    const status = String(booking.status_booking || "");
    const actualPostDate = normalizeDate(booking.actual_post_date);

    return (
      status !== "Đã thanh toán" &&
      (status === "Đã đăng video" || Boolean(actualPostDate))
    );
  });

  const bookingsWithoutPic = bookingRows.filter(
    (booking) => !String(booking.employee_id || "").trim()
  );

  const closedKocWithoutBooking = kocRows.filter((koc) => {
    const status = String(koc.status || "");
    const kocId = String(koc.id || "");

    return status === "Đã chốt" && kocId && !bookingKocIds.has(kocId);
  });

  const staleCareKocs = kocRows.filter((koc) => {
    const status = String(koc.status || "");
    if (status === "Từ chối") return false;

    const lastCareDate = normalizeDate(koc.new_contact_date || koc.created_at);
    if (!lastCareDate) return false;

    return daysBetween(lastCareDate, today) >= 7;
  });

  return (
    <main className="min-h-screen rounded-[32px] bg-[#f4f7fb] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)] md:px-8">
      {errors.length > 0 && (
        <section className="mb-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-bold">Có lỗi khi đọc dữ liệu Supabase:</p>

          <ul className="mt-2 list-disc pl-5 text-sm">
            {errors.map((error, index) => (
              <li key={index}>{error?.message}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-start gap-4">
      <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl">
        📊
      </span>

      <div>
        <p className="mb-4 text-[12px] font-bold uppercase leading-[1.4] tracking-[0.22em] text-red-600">
  DRKAM CRM PORTAL
</p>

<h1 className="pt-1 text-[30px] font-bold leading-[1.35] tracking-normal text-slate-950 md:text-[34px]">
  Tổng quan vận hành hôm nay
</h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Theo dõi nhanh hiệu suất KOC, Booking, video đăng và các cảnh báo
          cần xử lý trong ngày.
        </p>
      </div>
    </div>

    <div className="flex flex-wrap gap-3">
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
        Hôm nay: {formatDateDisplay(today)}
      </div>

      <Link
        href="/reports/daily"
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800"
      >
        Xem báo cáo ngày
      </Link>
    </div>
  </div>
</section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="👥"
          title="KOC tạo mới"
          value={kocCreatedTodayCount}
          note="Trong ngày"
          tone="blue"
        />

        <KpiCard
          icon="💬"
          title="KOC CS hôm nay"
          value={kocCareTodayCount}
          note="Theo ngày CS gần nhất"
          tone="green"
        />

        <KpiCard
          icon="📦"
          title="Booking nội dung"
          value={bookingNewTodayCount}
          note="Vid / live / vid+live hôm nay"
          tone="red"
        />

        <KpiCard
          icon="🎁"
          title="Booking quà"
          value={giftBookingTodayCount}
          note="Tết / tri ân / sinh nhật hôm nay"
          tone="purple"
        />

        <KpiCard
          icon="🎬"
          title="Video đăng"
          value={videoPostedTodayCount}
          note="Có ngày đăng thực tế"
          tone="green"
        />

        <KpiCard
          icon="✅"
          title="Đã thanh toán (tổng)"
          value={paidBookingTotalCount}
          note="Tổng booking có status Đã thanh toán"
          tone="blue"
        />

        <KpiCard
          icon="💰"
          title="Giá cast"
          value={formatMoney(totalCastToday)}
          note="Tổng booking nội dung hôm nay"
          tone="red"
        />

        <KpiCard
          icon="⚠️"
          title="Cảnh báo quá hạn"
          value={overdueBookings.length}
          note="Booking trễ dự kiến đăng"
          tone="orange"
        />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiniStatCard
          title="KOC cũ CS hôm nay"
          value={oldKocCareTodayCount}
          description="Không tính KOC tạo mới hôm nay"
        />

        <MiniStatCard
          title="Tổng Booking hôm nay"
          value={bookingNewTodayCount + giftBookingTodayCount}
          description="Booking nội dung + Booking quà"
        />

        <MiniStatCard
          title="Booking nội dung trong tháng"
          value={bookingThisMonthNewCount}
          description="Vid / live / vid+live từ đầu tháng"
        />
      </section>

      <section className="mb-6 rounded-[28px] border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-800">
        Các KPI theo ngày được tính trực tiếp bằng mốc giờ Việt Nam
        <b> 00:00–24:00 (+07:00)</b>. Chỉ số <b>Đã thanh toán (tổng)</b> là tổng
        booking đang có status <b>Đã thanh toán</b>; hệ thống hiện chưa có cột
        ngày thanh toán riêng nên không thể xác định chính xác số thanh toán riêng trong ngày.
      </section>

      <section className="mb-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">
              Cảnh báo vận hành
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Việc cần xử lý ngay
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ưu tiên xử lý để tránh trễ video, sót booking hoặc bỏ quên KOC.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WarningBox
            title="Booking quá hạn ngày dự kiến đăng"
            count={overdueBookings.length}
            tone="danger"
          >
            {overdueBookings.slice(0, 8).map((booking) => {
              const koc = getKocFromBooking(booking, kocMap);
              const employee = getEmployeeFromBooking(booking, employeeMap);

              return (
                <WarningRow
                  key={booking.id}
                  title={getKocDisplayName(koc)}
                  meta={[
                    `PIC: ${getEmployeeDisplayName(employee)}`,
                    `Dự kiến: ${formatDateDisplay(booking.expected_post_date)}`,
                    `Status: ${booking.status_booking || "-"}`,
                  ]}
                  href={`/bookings/${booking.id}/edit`}
                />
              );
            })}
          </WarningBox>

          <WarningBox
            title="Booking đã đăng nhưng chưa thanh toán"
            count={postedNotPaidBookings.length}
            tone="warning"
          >
            {postedNotPaidBookings.slice(0, 8).map((booking) => {
              const koc = getKocFromBooking(booking, kocMap);
              const employee = getEmployeeFromBooking(booking, employeeMap);

              return (
                <WarningRow
                  key={booking.id}
                  title={getKocDisplayName(koc)}
                  meta={[
                    `PIC: ${getEmployeeDisplayName(employee)}`,
                    `Ngày đăng: ${formatDateDisplay(booking.actual_post_date)}`,
                    `Status: ${booking.status_booking || "-"}`,
                  ]}
                  href={`/bookings/${booking.id}/edit`}
                />
              );
            })}
          </WarningBox>

          <WarningBox
            title="Booking chưa có PIC"
            count={bookingsWithoutPic.length}
            tone="normal"
          >
            {bookingsWithoutPic.slice(0, 8).map((booking) => {
              const koc = getKocFromBooking(booking, kocMap);

              return (
                <WarningRow
                  key={booking.id}
                  title={getKocDisplayName(koc)}
                  meta={[
                    `Loại: ${booking.booking_type || "-"}`,
                    `Dự kiến: ${formatDateDisplay(booking.expected_post_date)}`,
                    `Status: ${booking.status_booking || "-"}`,
                  ]}
                  href={`/bookings/${booking.id}/edit`}
                />
              );
            })}
          </WarningBox>

          <WarningBox
            title="KOC đã chốt nhưng chưa tạo Booking"
            count={closedKocWithoutBooking.length}
            tone="danger"
          >
            {closedKocWithoutBooking.slice(0, 8).map((koc) => (
              <WarningRow
                key={koc.id}
                title={getKocDisplayName(koc)}
                meta={[
                  `Mã: ${koc.koc_code || "-"}`,
                  `Tier: ${koc.tier || "-"}`,
                  `CS gần nhất: ${formatDateDisplay(koc.new_contact_date)}`,
                ]}
                href={`/koc/${koc.id}/edit`}
              />
            ))}
          </WarningBox>

          <WarningBox
            title="KOC lâu chưa CS lại từ 7 ngày"
            count={staleCareKocs.length}
            tone="normal"
          >
            {staleCareKocs.slice(0, 8).map((koc) => {
              const lastCareDate = normalizeDate(
                koc.new_contact_date || koc.created_at
              );

              return (
                <WarningRow
                  key={koc.id}
                  title={getKocDisplayName(koc)}
                  meta={[
                    `Status: ${koc.status || "-"}`,
                    `CS gần nhất: ${formatDateDisplay(lastCareDate)}`,
                    `Quá ${daysBetween(lastCareDate, today)} ngày`,
                  ]}
                  href={`/koc/${koc.id}/edit`}
                />
              );
            })}
          </WarningBox>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartBox
          title="KOC tạo mới"
          subtitle="Biểu đồ theo ngày tạo trong hệ thống"
        >
          <BarChart data={kocChartData} />
        </ChartBox>

        <ChartBox
          title="Booking nội dung theo PIC trong tháng"
          subtitle="Chỉ tính Booking vid / live / vid+live trong tháng hiện tại"
        >
          <BarChart data={bookingByPicData} />
        </ChartBox>
      </section>
    </main>
  );
}

function KpiCard({
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
  tone: "blue" | "green" | "red" | "purple" | "orange";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 border-red-100"
          : tone === "orange"
            ? "bg-orange-50 text-orange-700 border-orange-100"
            : "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-400">{note}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xl ${toneClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-3xl font-black text-slate-950">{value}</p>
        <p className="max-w-[220px] text-right text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function WarningBox({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "danger" | "warning" | "normal";
  children: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  const countClass =
    tone === "danger"
      ? "bg-red-600 text-white"
      : tone === "warning"
        ? "bg-amber-500 text-white"
        : "bg-slate-950 text-white";

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${toneClass}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Hiển thị tối đa 8 dòng cần xử lý.
          </p>
        </div>

        <div
          className={`flex h-11 min-w-11 items-center justify-center rounded-2xl px-3 text-xl font-black ${countClass}`}
        >
          {count}
        </div>
      </div>

      <div className="space-y-3">
        {count === 0 ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            Không có cảnh báo.
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function WarningRow({
  title,
  meta,
  href,
}: {
  title: string;
  meta: string[];
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-blue-200 hover:bg-blue-50"
    >
      <p className="font-black text-slate-950">{title}</p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        {meta.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold"
          >
            {item}
          </span>
        ))}
      </div>
    </Link>
  );
}

function ChartBox({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[495px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="h-[390px]">{children}</div>
    </div>
  );
}

function BarChart({
  data,
  emptyText = "Chưa có dữ liệu",
}: {
  data: ChartItem[];
  emptyText?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <div className="mb-3 flex h-10 items-end gap-1">
          <span className="h-4 w-2 rounded bg-slate-300" />
          <span className="h-7 w-2 rounded bg-slate-300" />
          <span className="h-10 w-2 rounded bg-slate-300" />
        </div>
        <p className="text-sm font-bold">{emptyText}</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="relative h-full overflow-x-auto rounded-3xl bg-slate-50 px-8 pb-8 pt-5">
      <div className="absolute left-8 right-8 top-6 h-[280px]">
        {[0, 1, 2, 3, 4].map((line) => (
          <div
            key={line}
            className="absolute left-0 right-0 border-t border-dashed border-slate-200"
            style={{ top: `${line * 25}%` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full items-end gap-8">
        {data.map((item) => {
          const height = Math.max((item.value / maxValue) * 280, 18);

          return (
            <div
              key={item.label}
              className="flex min-w-[95px] flex-col items-center"
            >
              <div className="mb-3 text-sm font-black text-slate-700">
                {item.value}
              </div>

              <div
                className="w-12 rounded-t-2xl bg-gradient-to-t from-blue-600 to-cyan-400 shadow-[0_10px_25px_rgba(37,99,235,0.25)]"
                style={{ height: `${height}px` }}
              />

              <div className="mt-3 max-w-[120px] truncate text-xs font-bold text-slate-400">
                {formatDateDisplay(item.label)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getKocFromBooking(booking: DbRow, kocMap: Map<string, DbRow>) {
  const kocId = String(booking.koc_id || "").trim();
  if (!kocId) return null;

  return kocMap.get(kocId) || null;
}

function getEmployeeFromBooking(
  booking: DbRow,
  employeeMap: Map<string, DbRow>
) {
  const employeeId = String(booking.employee_id || "").trim();
  if (!employeeId) return null;

  return employeeMap.get(employeeId) || null;
}

function getKocDisplayName(koc?: DbRow | null) {
  if (!koc) return "Chưa rõ KOC";

  return (
    koc.Id_tiktok_Ten_fb ||
    koc.name ||
    koc.koc_code ||
    koc.phone ||
    "Chưa rõ KOC"
  );
}

function getEmployeeDisplayName(employee?: DbRow | null) {
  if (!employee) return "Chưa có PIC";

  return (
    employee.full_name ||
    employee.employee_code ||
    employee.email ||
    "Chưa rõ PIC"
  );
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const raw = String(value).trim().replace(/\./g, "").replace(/,/g, "");
  const numberValue = Number(raw);

  if (Number.isNaN(numberValue)) return 0;

  return numberValue;
}

function formatMoney(value: unknown) {
  const numberValue = Number(value || 0);

  return `${numberValue.toLocaleString("vi-VN")}đ`;
}

function formatDateDisplay(value: unknown) {
  if (!value) return "-";

  const dateKey = normalizeDate(value);

  if (!dateKey) return "-";

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [year, month, day] = dateKey.split("-");
    return `${day}/${month}/${year}`;
  }

  return String(value);
}