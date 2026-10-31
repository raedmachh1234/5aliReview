"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { controlClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { idleState } from "@/lib/types";
import { login } from "@/server/actions/auth";
import { SubmitButton } from "./submit-button";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, idleState);
  const [visible, setVisible] = useState(false);
  const error = state.status === "error" ? state.message : null;

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "password-error" : undefined}
            className={cn(controlClass, "h-12 pe-12 text-base")}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <Icon name={visible ? "eyeOff" : "eye"} size={18} title={visible ? "Hide password" : "Show password"} />
          </button>
        </div>
        {error ? (
          <p id="password-error" role="alert" className="flex items-center gap-1.5 text-sm font-medium text-danger">
            <Icon name="alert" size={15} />
            {error}
          </p>
        ) : null}
      </div>
      <SubmitButton variant="primary" size="lg" className="w-full" pendingLabel="Signing in…">
        Sign in
        <Icon name="arrowRight" size={18} />
      </SubmitButton>
    </form>
  );
}
