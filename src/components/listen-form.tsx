"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import type {
  ListenFormState,
  ListenFormValues,
} from "@/app/(app)/listens/actions";

type ListenFormProps = {
  action: (state: ListenFormState, formData: FormData) => Promise<ListenFormState>;
  initialValues?: Partial<ListenFormValues>;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
};

const inputClass =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-base outline-none transition-colors focus:border-accent";

// Today's date on the visitor's own device, as YYYY-MM-DD.
function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function ListenForm({
  action,
  initialValues = {},
  submitLabel,
  pendingLabel,
  cancelHref,
}: ListenFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = { ...initialValues, ...state.values };
  const dateRef = useRef<HTMLInputElement>(null);

  // New listens default to today (in your own time zone).
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) {
      dateRef.current.value = localToday();
    }
  }, []);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Album
        </legend>
        <Field label="Album title" htmlFor="title">
          <input id="title" name="title" required defaultValue={values.title} className={inputClass} />
        </Field>
        <Field label="Artist" htmlFor="artist">
          <input id="artist" name="artist" required defaultValue={values.artist} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Release year" htmlFor="releaseYear" optional>
            <input
              id="releaseYear"
              name="releaseYear"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              defaultValue={values.releaseYear}
              className={inputClass}
            />
          </Field>
          <Field label="Genre" htmlFor="genre" optional>
            <input id="genre" name="genre" defaultValue={values.genre} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Your listen
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date listened" htmlFor="listenedOn">
            <input
              ref={dateRef}
              id="listenedOn"
              name="listenedOn"
              type="date"
              required
              defaultValue={values.listenedOn}
              className={inputClass}
            />
          </Field>
          <Field label="Score" htmlFor="score" optional>
            <select id="score" name="score" defaultValue={values.score ?? ""} className={inputClass}>
              <option value="">No score</option>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                <option key={n} value={n}>
                  {n} / 10
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Review" htmlFor="review" optional>
          <textarea
            id="review"
            name="review"
            rows={4}
            maxLength={2000}
            defaultValue={values.review}
            placeholder="What stood out?"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base outline-none transition-colors focus:border-accent"
          />
        </Field>
      </fieldset>

      {state.message ? (
        <p role="alert" className="rounded-md bg-surface px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-accent px-5 font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="flex h-11 items-center rounded-md border border-line px-5 hover:border-accent"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
      </label>
      {children}
    </div>
  );
}
