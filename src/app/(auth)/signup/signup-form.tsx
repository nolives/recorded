"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthFormState } from "../actions";
import { FormField } from "@/components/form-field";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signUp,
    {},
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormField
        label="Username"
        name="username"
        autoComplete="username"
        defaultValue={state.values?.username}
        error={state.errors?.username}
        hint="3–20 lowercase letters, numbers, or underscores."
      />
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
        autoComplete="new-password"
        error={state.errors?.password}
        hint="At least 8 characters."
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
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
