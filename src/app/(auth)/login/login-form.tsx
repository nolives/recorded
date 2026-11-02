"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, type AuthFormState } from "../actions";
import { FormField } from "@/components/form-field";

export function LogInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    logIn,
    {},
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.errors?.password}
      />

      {state.message ? (
        <p role="alert" className="rounded-md bg-surface px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-accent font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>

      <p className="text-center text-sm text-muted">
        New to Recorded?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
