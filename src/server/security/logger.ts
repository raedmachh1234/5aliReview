import "server-only";

/**
 * Minimal structured logger. Messages are event names; context goes through
 * `redact`, which drops values of sensitive keys and masks email addresses,
 * so personal data and secrets never reach the logs.
 */
const SENSITIVE_KEY = /pass(word)?|token|secret|key|authorization|cookie|email|phone|ip/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (typeof value === "string") return value.replace(EMAIL, "[email]");
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1)]),
    );
  }
  return value;
}

function write(level: "info" | "warn" | "error", event: string, context?: unknown) {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...(context === undefined ? {} : { context: redact(context) }) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, context?: unknown) => write("info", event, context),
  warn: (event: string, context?: unknown) => write("warn", event, context),
  error: (event: string, context?: unknown) => write("error", event, context),
};
