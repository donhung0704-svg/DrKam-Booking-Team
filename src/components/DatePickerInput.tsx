"use client";

import { useEffect, useMemo, useState } from "react";

type DatePickerInputProps = {
  name: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function DatePickerInput({
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "dd/mm/yyyy",
  className = "",
  disabled,
}: DatePickerInputProps) {
  const [draftValue, setDraftValue] = useState(() =>
    formatDateForDisplay(value ?? defaultValue ?? "")
  );

  useEffect(() => {
    if (value !== undefined) {
      setDraftValue(formatDateForDisplay(value || ""));
    }
  }, [value]);

  const isoValue = useMemo(() => toIsoDate(draftValue), [draftValue]);

  function handleTextChange(nextRawValue: string) {
    setDraftValue(formatDateWhileTyping(nextRawValue));
  }

  function commitTextValue() {
    const raw = String(draftValue || "").trim();

    if (!raw) {
      setDraftValue("");
      onChange?.("");
      return;
    }

    const displayValue = formatDateForDisplay(raw);

    if (!displayValue) {
      setDraftValue(formatDateForDisplay(value ?? defaultValue ?? ""));
      return;
    }

    setDraftValue(displayValue);
    onChange?.(displayValue);
  }

  function handleDateChange(nextIsoValue: string) {
    const nextDisplayValue = formatDateForDisplay(nextIsoValue);

    setDraftValue(nextDisplayValue);
    onChange?.(nextDisplayValue);
  }

  return (
    <div className="relative">
      <input
        name={name}
        value={draftValue}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete="off"
        onChange={(event) => handleTextChange(event.target.value)}
        onBlur={commitTextValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={
          className ||
          "h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 pr-9 text-[12.5px] outline-none focus:border-[#3964ff] focus:ring-2 focus:ring-[#3964ff]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        }
      />

      <input
        type="date"
        value={isoValue}
        disabled={disabled}
        onChange={(event) => handleDateChange(event.target.value)}
        className="absolute right-0 top-0 h-full w-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={`${name}_calendar`}
        tabIndex={-1}
      />

      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">
        📅
      </span>
    </div>
  );
}

export function formatDateWhileTyping(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    return formatDateForDisplay(raw);
  }

  const digits = raw.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatDateForDisplay(value: unknown) {
  if (!value) return "";

  const raw = String(value).trim();

  if (!raw) return "";

  if (/^\d{8}$/.test(raw)) {
    const day = raw.slice(0, 2);
    const month = raw.slice(2, 4);
    const year = raw.slice(4, 8);

    return isValidDateParts(year, month, day) ? `${day}/${month}/${year}` : "";
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split("/");
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");

    return isValidDateParts(year, month, day) ? `${day}/${month}/${year}` : "";
  }

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split("-");
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");

    return isValidDateParts(year, month, day) ? `${day}/${month}/${year}` : "";
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, monthRaw, dayRaw] = raw.split("-");
    const month = monthRaw.padStart(2, "0");
    const day = dayRaw.padStart(2, "0");

    return isValidDateParts(year, month, day) ? `${day}/${month}/${year}` : "";
  }

  const shortDate = raw.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) {
    const [year, month, day] = shortDate.split("-");

    return isValidDateParts(year, month, day) ? `${day}/${month}/${year}` : "";
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

export function toIsoDate(value: unknown) {
  if (!value) return "";

  const raw = String(value).trim();

  if (!raw) return "";

  if (/^\d{8}$/.test(raw)) {
    const day = raw.slice(0, 2);
    const month = raw.slice(2, 4);
    const year = raw.slice(4, 8);

    return isValidDateParts(year, month, day) ? `${year}-${month}-${day}` : "";
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, monthRaw, dayRaw] = raw.split("-");
    const month = monthRaw.padStart(2, "0");
    const day = dayRaw.padStart(2, "0");

    return isValidDateParts(year, month, day) ? `${year}-${month}-${day}` : "";
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split("/");
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");

    return isValidDateParts(year, month, day) ? `${year}-${month}-${day}` : "";
  }

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [dayRaw, monthRaw, year] = raw.split("-");
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");

    return isValidDateParts(year, month, day) ? `${year}-${month}-${day}` : "";
  }

  const shortDate = raw.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(shortDate)) {
    const [year, month, day] = shortDate.split("-");

    return isValidDateParts(year, month, day) ? `${year}-${month}-${day}` : "";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function parseVietnameseDateForDatabase(value: unknown) {
  const isoValue = toIsoDate(value);

  return isoValue || null;
}

function isValidDateParts(year: string, month: string, day: string) {
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    return false;
  }

  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);

  if (yearNumber < 1900 || yearNumber > 2100) return false;
  if (monthNumber < 1 || monthNumber > 12) return false;
  if (dayNumber < 1 || dayNumber > 31) return false;

  const date = new Date(yearNumber, monthNumber - 1, dayNumber);

  return (
    date.getFullYear() === yearNumber &&
    date.getMonth() === monthNumber - 1 &&
    date.getDate() === dayNumber
  );
}
