import type { SVGProps } from "react";

/**
 * Inline icon set (no icon library dependency). Icons are decorative by
 * default (aria-hidden); pass `title` when an icon is the only content.
 */
const paths = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  arrowUpRight: "M7 17L17 7M8 7h9v9",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  x: "M6 6l12 12M18 6L6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.2 4.2L19 7",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  copy: "M8 8h11v12H8zM5 16V4h11",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6C3.8 8.3 2 12 2 12s3.6 7 10 7a9.6 9.6 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2",
  star: "M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  starOutline: "M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  box: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  tag: "M3 12V4a1 1 0 011-1h8l9 9-9 9zM7.5 7.5h.01",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13.5l1.6 1.2-2 3.5-1.9-.7a7 7 0 01-2 1.2L14.8 21h-4l-.3-2.3a7 7 0 01-2-1.2l-1.9.7-2-3.5 1.6-1.2a7 7 0 010-2.4L4.6 9.9l2-3.5 1.9.7a7 7 0 012-1.2L10.8 3h4l.3 2.3a7 7 0 012 1.2l1.9-.7 2 3.5-1.6 1.2a7 7 0 010 2.4z",
  home: "M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z",
  store: "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s1-1.3 1-3M9.5 20v-5h5v5",
  logout: "M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l-4 4 4 4M6 12h10",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 017 0V11",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  whatsapp:
    "M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1.1zM9 8.5c0 3 2.5 6.5 6 6.5l1-1.6-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z",
  instagram: "M4 8a4 4 0 014-4h8a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM17 7h.01",
  facebook: "M14 21v-8h3l.5-3.5H14V7.8c0-1 .3-1.8 1.8-1.8h1.8V3a24 24 0 00-2.6-.1C12.4 2.9 11 4.4 11 7.2v2.3H8V13h3v8",
  alert: "M12 3l9.5 17h-19zM12 10v4M12 17h.01",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01",
  checkCircle: "M12 21a9 9 0 100-18 9 9 0 000 18zM8 12.5l2.8 2.8L16.2 9.6",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  wallet: "M4 7a2 2 0 012-2h12v4M4 7v10a2 2 0 002 2h14V9H6a2 2 0 01-2-2zM16 14h.01",
  draft: "M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M9 13h6M9 17h4",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  share: "M8.6 13.5l6.8 4M15.4 6.5l-6.8 4M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6z",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  truck: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  bolt: "M13.5 2L4 13.5h7L10 22l9.5-11.5h-7z",
  play: "M8 5.5v13l10.5-6.5z",
  pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z",
} as const;

export type IconName = keyof typeof paths;

const filled: IconName[] = ["star", "bolt", "play", "pause"];

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
