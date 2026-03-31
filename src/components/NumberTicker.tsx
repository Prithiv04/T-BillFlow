"use client";

import { useEffect, useRef } from "react";

interface NumberTickerProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  animate?: boolean;
}

export default function NumberTicker({
  value,
  decimals = 4,
  prefix = "",
  suffix = "",
  className = "",
  animate = true,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const displayRef = useRef(value);

  useEffect(() => {
    if (!animate || !ref.current) return;
    let frame: number;
    const tick = () => {
      displayRef.current += value * (5.0 / 100 / 365 / 24 / 3600 / 10);
      if (ref.current) {
        ref.current.textContent =
          prefix + displayRef.current.toFixed(decimals) + suffix;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, prefix, suffix, animate]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
