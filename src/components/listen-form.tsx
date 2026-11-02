"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type {
  ListenFormState,
  ListenFormValues,
} from "@/app/(app)/listens/actions";
import { REVIEW_MAX, type ListenField } from "@/lib/validation";

type ListenFormProps = {
  action: (state: ListenFormState, formData: FormData) => Promise<ListenFormState>;
  initialValues?: Partial<ListenFormValues>;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
};

const inputClass =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-base outline-none transition-colors focus:border-accent aria-[invalid=true]:border-danger";

// The order fields appear in, so we can jump to the first one with a problem.
const FIELD_ORDER: ListenField[] = [
  "title",
  "artist",
  "releaseYear",
  "genre",
  "listenedOn",
  "score",
  "review",
];

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
  const errors = state.errors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [reviewLength, setReviewLength] = useState(values.review?.length ?? 0);

  // After each save attempt the form resets to the submitted values,
  // so reset the review counter to match.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setReviewLength(state.values?.review?.length ?? 0);
  }

  // New listens default to today (in your own time zone).
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) {
      dateRef.current.value = localToday();
    }
  }, []);

  // After a failed save, move the cursor to the first field that needs fixing.
  useEffect(() => {
    const first = FIELD_ORDER.find((field) => state.errors?.[field]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
    }
  }, [state]);

  // Props shared by every input: error state and a link to its message.
  const a11y = (field: ListenField) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-6">
      {state.message ? (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Album
        </legend>
        <Field label="Album title" field="title" error={errors.title}>
          <input id="title" name="title" required defaultValue={values.title} className={inputClass} {...a11y("title")} />
        </Field>
        <Field label="Artist" field="artist" error={errors.artist}>
          <input id="artist" name="artist" required defaultValue={values.artist} className={inputClass} {...a11y("artist")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Release year" field="releaseYear" error={errors.releaseYear} optional>
            <input
              id="releaseYear"
              name="releaseYear"
              inputMode="numeric"
              defaultValue={values.releaseYear}
              className={inputClass}
              {...a11y("releaseYear")}
            />
          </Field>
          <Field label="Genre" field="genre" error={errors.genre} optional>
            <input id="genre" name="genre" defaultValue={values.genre} className={inputClass} {...a11y("genre")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Your listen
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date listened" field="listenedOn" error={errors.listenedOn}>
            <input
              ref={dateRef}
              id="listenedOn"
              name="listenedOn"
              type="date"
              required
              defaultValue={values.listenedOn}
              className={inputClass}
              {...a11y("listenedOn")}
            />
          </Field>
          <Field label="Score" field="score" error={errors.score} optional>
            <select id="score" name="score" defaultValue={values.score ?? ""} className={inputClass} {...a11y("score")}>
              <option value="">No score</option>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                <option key={n} value={n}>
                  {n} / 10
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Review"
          field="review"
          error={errors.review}
          optional
          note={
            <span className={reviewLength > REVIEW_MAX ? "text-danger" : undefined}>
              {reviewLength.toLocaleString("en-US")} / {REVIEW_MAX.toLocaleString("en-US")}
            </span>
          }
        >
          <textarea
            id="review"
            name="review"
            rows={4}
            defaultValue={values.review}
            onChange={(event) => setReviewLength(event.target.value.length)}
            placeholder="What stood out?"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base outline-none transition-colors focus:border-accent aria-[invalid=true]:border-danger"
            {...a11y("review")}
          />
        </Field>
      </fieldset>

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
  field,
  error,
  optional,
  note,
  children,
}: {
  label: string;
  field: ListenField;
  error?: string;
  optional?: boolean;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={field} className="text-sm font-medium">
          {label}
          {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
        </label>
        {note ? <span className="text-xs text-muted tabular-nums">{note}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${field}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
