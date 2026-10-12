import { Fragment, type ReactNode } from "react";

/** Like fmt(), but placeholders can be React nodes (e.g. links inside a translated sentence). */
export function rich(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{key && key in values ? values[key] : part}</Fragment>;
  });
}
