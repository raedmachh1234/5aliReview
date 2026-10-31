"use client";

import { Barlow, Barlow_Condensed } from "next/font/google";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import "./splash.css";

// The logo's typefaces (OFL), self-hosted by next/font like Inter. "block" keeps the
// wordmark from flashing in a fallback font; it only appears 1.7 s in, by which time they've loaded.
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-barlow-condensed", display: "block" });
const barlow = Barlow({ subsets: ["latin"], weight: "500", variable: "--font-barlow", display: "block" });

/** Where skipping jumps to: the logo is complete and the hand-off to the page begins. */
const SKIP_TO_MS = 3550;

function starPoints(r: number) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? r * 0.46 : r;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`);
  }
  return points.join(" ");
}

const STAR = starPoints(50);

/** Eight rays around a star; the visible spark slides along each (see .splash__spark). */
const SPARKS = Array.from({ length: 8 }, (_, k) => {
  const angle = ((k + 0.5) / 8) * 2 * Math.PI;
  return { x: (Math.cos(angle) * 168).toFixed(2), y: (Math.sin(angle) * 168).toFixed(2) };
});

/** The five stars: place in the row (d) and how far each rises into the crown's arch (dy). */
const STARS = [-2, -1, 0, 1, 2].map((d, i) => ({ i, d, dy: 352 - (4 - d * d) * 8 - 540 }));

function skipToEnd(splash: Element) {
  for (const animation of splash.getAnimations({ subtree: true })) {
    if (Number(animation.currentTime) < SKIP_TO_MS) animation.currentTime = SKIP_TO_MS;
  }
}

/**
 * The 5ali Review logo animation, played over the store on every visit and refresh, then faded
 * out to show the page, which loads underneath meanwhile. It's pure CSS (splash.css), so
 * it starts with the first paint; this script only lets visitors skip it (tap, click, scroll or
 * any key) and removes it once it's over. Moving between pages keeps the layout, so it doesn't replay.
 */
export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const splash = ref.current;
    if (!splash) return;
    const skip = () => skipToEnd(splash);
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
    };
  }, [done]);

  if (done) return null;

  return (
    <div
      ref={ref}
      className={cn("splash", condensed.variable, barlow.variable)}
      aria-hidden="true"
      onPointerDown={(event) => skipToEnd(event.currentTarget)}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setDone(true);
      }}
    >
      <svg className="splash__defs" width="0" height="0">
        <defs>
          <linearGradient id="splash-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5b400" />
            <stop offset="1" stopColor="#c98a00" />
          </linearGradient>
          <linearGradient id="splash-gold-lit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#f5b400" />
          </linearGradient>
          <linearGradient id="splash-shine">
            <stop offset="0" stopColor="#fff6d6" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff6d6" />
            <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
          </linearGradient>
          <clipPath id="splash-star">
            <polygon points={STAR} />
          </clipPath>
        </defs>
      </svg>

      <div className="splash__stage">
        <div className="splash__ambient">
          <div className="splash__aura splash__aura--west" />
          <div className="splash__aura splash__aura--east" />
          <div className="splash__vignette" />
        </div>

        <div className="splash__camera">
          <div className="splash__glow" />
          {[0, 1, 2].map((k) => (
            <div key={k} className={cn("splash__ring", k === 0 && "splash__ring--gold")} style={{ "--k": k } as CSSProperties} />
          ))}

          {STARS.map(({ i, d, dy }) => (
            <div key={i} className="splash__star" style={{ "--i": i, "--d": d, "--dy": dy } as CSSProperties}>
              <div className="splash__move">
                <div className="splash__bump">
                  <div className="splash__turn">
                    <svg className="splash__sparks" viewBox="-240 -240 480 480">
                      {SPARKS.map(({ x, y }) => (
                        <line key={`${x},${y}`} className="splash__spark" x2={x} y2={y} />
                      ))}
                    </svg>
                    <svg className="splash__shape" viewBox="-60 -60 120 120">
                      <polygon className="splash__fill" points={STAR} fill="url(#splash-gold)" />
                      <polygon className="splash__lit" points={STAR} fill="url(#splash-gold-lit)" />
                      <g clipPath="url(#splash-star)">
                        <g className="splash__shine">
                          <rect x="-23.6" y="-150" width="47.2" height="300" transform="rotate(45)" fill="url(#splash-shine)" />
                        </g>
                      </g>
                      <polygon className="splash__outline" points={STAR} />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="splash__wordmark">
            <span className="splash__word">5ali</span>
            <span className="splash__word">Review</span>
          </div>
          <div className="splash__tagline">
            <span className="splash__rule" />
            <span className="splash__motto">Tap. Rate. Grow.</span>
            <span className="splash__rule" />
          </div>
        </div>
      </div>
    </div>
  );
}
