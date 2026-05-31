"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  /** Target date/time in ISO 8601 format */
  targetTime: string;
  /** Whether to count up from start (elapsed) or down to end (remaining) */
  mode?: "countdown" | "countup";
  /** Whether the timer is active */
  active?: boolean;
  /** Show overtime in red when exceeded */
  showOvertime?: boolean;
  className?: string;
}

interface TimeParts {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isNegative: boolean;
}

function calculateTimeDiff(targetTime: string, mode: "countdown" | "countup"): TimeParts {
  const now = Date.now();
  const target = new Date(targetTime).getTime();
  const diff = mode === "countdown" ? target - now : now - target;
  const isNegative = diff < 0;
  const absDiff = Math.abs(diff);

  return {
    hours: Math.floor(absDiff / 3600000),
    minutes: Math.floor((absDiff % 3600000) / 60000),
    seconds: Math.floor((absDiff % 60000) / 1000),
    totalSeconds: Math.floor(absDiff / 1000),
    isNegative,
  };
}

const CountdownTimer = React.memo<CountdownTimerProps>(({
  targetTime,
  mode = "countdown",
  active = true,
  showOvertime = true,
  className = "",
}) => {
  const [time, setTime] = useState<TimeParts>(() =>
    calculateTimeDiff(targetTime, mode)
  );

  const update = useCallback(() => {
    setTime(calculateTimeDiff(targetTime, mode));
  }, [targetTime, mode]);

  useEffect(() => {
    if (!active) return;
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [active, update]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const isOvertime = time.isNegative;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 font-poppins font-bold text-lg tabular-nums",
        isOvertime && showOvertime ? "text-accent-red-400" : "text-text-primary",
        className
      )}
    >
      <span
        className={cn(
          "px-2 py-1 rounded-[6px] min-w-[36px] text-center",
          isOvertime && showOvertime
            ? "bg-accent-red-50"
            : "bg-primary-50 text-primary-500"
        )}
      >
        {pad(time.hours)}
      </span>
      <span className="text-text-muted">:</span>
      <span
        className={cn(
          "px-2 py-1 rounded-[6px] min-w-[36px] text-center",
          isOvertime && showOvertime
            ? "bg-accent-red-50"
            : "bg-primary-50 text-primary-500"
        )}
      >
        {pad(time.minutes)}
      </span>
      <span className="text-text-muted">:</span>
      <span
        className={cn(
          "px-2 py-1 rounded-[6px] min-w-[36px] text-center",
          isOvertime && showOvertime
            ? "bg-accent-red-50"
            : "bg-primary-50 text-primary-500"
        )}
      >
        {pad(time.seconds)}
      </span>
    </div>
  );
});

CountdownTimer.displayName = "CountdownTimer";

export { CountdownTimer };
export type { CountdownTimerProps };
