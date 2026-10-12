"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface SeriesPoint {
  day: string;
  count: number;
  average: number | null;
}

/**
 * Daily feedback column chart (single series → no legend; the title names it).
 * - Columns ≤24px, 4px rounded tops, square at the baseline, 2px gaps.
 * - Hairline gridlines at clean ticks, recessive axes.
 * - Pointer snaps to the nearest day; keyboard users focus the chart and use
 *   ←/→ (Home/End) to move the same tooltip. The full data is also in a table.
 */
export function TimeSeriesChart({
  data,
  labels,
  locale,
}: {
  data: SeriesPoint[];
  labels: { count: string; average: string; date: string; showTable: string; summary: string };
  locale: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tableId = useId();

  const width = 720;
  const height = 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const { max, ticks } = useMemo(() => {
    const raw = Math.max(1, ...data.map((d) => d.count));
    const step = niceStep(raw / 4);
    const top = Math.ceil(raw / step) * step;
    return { max: top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
  }, [data]);

  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(24, slot - 2));
  const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }).format(new Date(`${d}T00:00:00Z`));
  const labelIdx = data.length <= 1 ? [0] : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !data.length) return;
    const x = ((e.clientX - rect.left) / rect.width) * width - pad.left;
    setActive(Math.min(data.length - 1, Math.max(0, Math.floor(x / slot))));
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!data.length) return;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (e.key in moves) {
      e.preventDefault();
      // In RTL the visual order is still chronological left→right (the chart is dir=ltr).
      setActive((a) => Math.min(data.length - 1, Math.max(0, (a ?? (moves[e.key] > 0 ? -1 : data.length)) + moves[e.key])));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(data.length - 1);
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  const activePoint = active !== null ? data[active] : null;
  const tipLeft = active !== null ? ((pad.left + active * slot + slot / 2) / width) * 100 : 0;

  return (
    <div>
      <div className="relative" dir="ltr">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full touch-pan-y rounded-lg focus-visible:outline-3 focus-visible:outline-focus"
          role="img"
          aria-label={labels.summary}
          tabIndex={0}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => {
            const y = pad.top + innerH - (t / max) * innerH;
            return (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e4e2da" strokeWidth={1} />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#475467" className="tabular">
                  {t.toLocaleString(locale)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = (d.count / max) * innerH;
            const x = pad.left + i * slot + (slot - barW) / 2;
            const y = pad.top + innerH - h;
            const r = Math.min(4, barW / 2, h);
            return (
              <path
                key={d.day}
                d={h > 0 ? roundedTop(x, y, barW, h, r) : ""}
                fill={active === i ? "#084536" : "#0b5c47"}
              />
            );
          })}
          {activePoint ? (
            <line
              x1={pad.left + (active ?? 0) * slot + slot / 2}
              x2={pad.left + (active ?? 0) * slot + slot / 2}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="#344054"
              strokeWidth={1}
              strokeDasharray="0"
              opacity={0.35}
            />
          ) : null}
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#98a2b3" strokeWidth={1} />
          {data.length
            ? labelIdx.map((i) => (
                <text
                  key={i}
                  x={pad.left + i * slot + slot / 2}
                  y={height - 8}
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                  fontSize="11"
                  fill="#475467"
                >
                  {fmtDay(data[i].day, { day: "numeric", month: "short" })}
                </text>
              ))
            : null}
        </svg>
        {activePoint ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: `clamp(70px, ${tipLeft}%, calc(100% - 70px))` }}
          >
            <p className="text-muted">{fmtDay(activePoint.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
            <p className="mt-0.5">
              <strong className="tabular text-sm text-ink">{activePoint.count}</strong> <span className="text-ink-2">{labels.count}</span>
            </p>
            {activePoint.average !== null ? (
              <p>
                <strong className="tabular text-ink">{activePoint.average.toFixed(1)}</strong> <span className="text-ink-2">{labels.average}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-9 cursor-pointer items-center font-semibold text-ink-2 hover:text-ink" aria-controls={tableId}>
          {labels.showTable}
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line" tabIndex={0}>
          <table id={tableId} className="w-full text-start text-sm">
            <thead className="sticky top-0 bg-subtle">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-semibold">{labels.date}</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">{labels.count}</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">{labels.average}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <th scope="row" className="px-3 py-1.5 text-start font-normal">{fmtDay(d.day, { day: "numeric", month: "short", year: "numeric" })}</th>
                  <td className="tabular px-3 py-1.5 text-end">{d.count}</td>
                  <td className="tabular px-3 py-1.5 text-end">{d.average !== null ? d.average.toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Column path with rounded top corners and a square base. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}
