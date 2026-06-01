"use client";

import { useEffect } from "react";
import flatpickr from "flatpickr";
import { Portuguese } from "flatpickr/dist/l10n/pt";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  className?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  className,
}: PropsType) {
  useEffect(() => {
    // Convert ISO date strings (YYYY-MM-DD) to Date objects since dateFormat is d-m-Y
    let parsedDefaultDate = defaultDate;
    if (typeof defaultDate === "string" && defaultDate) {
      const parts = defaultDate.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        parsedDefaultDate = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2])
        );
      }
    }

    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: false,
      monthSelectorType: "static",
      dateFormat: "d-m-Y",
      allowInput: true,
      defaultDate: parsedDefaultDate,
      onChange,
      locale: Portuguese,
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate]);

  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
