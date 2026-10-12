import type { SVGProps } from "react";

/**
 * Inline icon set (no icon library dependency). Icons are decorative by
 * default (aria-hidden); pass `title` when an icon is the only content.
 */
const paths = {
  star: "M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  check: "M5 12.5l4.2 4.2L19 7",
  checkCircle: "M12 21a9 9 0 100-18 9 9 0 000 18zM8 12.5l2.8 2.8L16.2 9.6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
  menu: "M4 7h16M4 12h16M4 17h16",
  x: "M6 6l12 12M18 6L6 18",
  home: "M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  chart: "M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  nfc: "M6 8.5a8 8 0 010 7M9.5 6a12 12 0 010 12M13 3.5a16 16 0 010 17M17 9h3v6h-3",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13.5l1.6 1.2-2 3.5-1.9-.7a7 7 0 01-2 1.2L14.8 21h-4l-.3-2.3a7 7 0 01-2-1.2l-1.9.7-2-3.5 1.6-1.2a7 7 0 010-2.4L4.6 9.9l2-3.5 1.9.7a7 7 0 012-1.2L10.8 3h4l.3 2.3a7 7 0 012 1.2l1.9-.7 2 3.5-1.6 1.2a7 7 0 010 2.4z",
  card: "M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5zM3 10h18M7 15h4",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  logout: "M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l-4 4 4 4M6 12h10",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01",
  alert: "M12 3l9.5 17h-19zM12 10v4M12 17h.01",
  users: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.9M15.5 4.2a3.5 3.5 0 010 6.6",
  file: "M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M9 13h6M9 17h6",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  building: "M5 21V5a1 1 0 011-1h8a1 1 0 011 1v16M15 10h3a1 1 0 011 1v10M3 21h18M8.5 8h3M8.5 12h3M8.5 16h3",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 017 0V11",
  log: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  copy: "M8 8h11v12H8zM5 16V4h11",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
  scale: "M12 4v16M5 20h14M5 8l-3 6a3 3 0 006 0zM19 8l-3 6a3 3 0 006 0zM5 8h14",
} as const;

export type IconName = keyof typeof paths;

const filled: IconName[] = ["star"];

export function Icon({
  name,
  title,
  size = 20,
  className,
  ...rest
}: { name: IconName; title?: string; size?: number } & Omit<SVGProps<SVGSVGElement>, "children">) {
  const isFilled = filled.includes(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? "currentColor" : "none"}
      stroke={isFilled ? "none" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={paths[name]} />
    </svg>
  );
}
