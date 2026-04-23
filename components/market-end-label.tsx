"use client";

import { useEffect, useState } from "react";

interface MarketEndLabelProps {
  endDatetime: string | null;
}

export function MarketEndLabel({ endDatetime }: MarketEndLabelProps) {
  const [label, setLabel] = useState<string | null>(null);
  const [closingSoon, setClosingSoon] = useState(false);

  useEffect(() => {
    if (!endDatetime) return;

    const update = () => {
      const end = new Date(endDatetime);
      const diffMs = end.getTime() - Date.now();
      if (diffMs <= 15 * 60 * 1000) {
        setLabel("Ending Soon");
        setClosingSoon(true);
      } else {
        setLabel(
          `Ends ~${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}`,
        );
        setClosingSoon(false);
      }
    };

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [endDatetime]);

  if (!label) return null;

  return (
    <span
      className={`text-xs font-semibold ${
        closingSoon ? "text-[#ff1744]" : "text-[#374151]"
      }`}
    >
      {label}
    </span>
  );
}
