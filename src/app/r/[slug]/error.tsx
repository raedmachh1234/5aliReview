"use client";

import { ErrorView } from "@/components/site/error-view";

export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
