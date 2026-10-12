"use client";

import "./globals.css";
import { ErrorView } from "@/components/site/error-view";

/** Last-resort boundary (errors in the root layout). Must render its own <html>. */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <ErrorView {...props} />
      </body>
    </html>
  );
}
