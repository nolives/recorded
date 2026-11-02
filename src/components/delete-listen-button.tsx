"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

// A Delete button that asks "Are you sure?" in a pop-up before deleting.
export function DeleteListenButton({
  action,
  albumTitle,
}: {
  action: () => Promise<void>;
  albumTitle: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-10 rounded-md border border-line px-4 text-danger transition-colors hover:border-danger"
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-title"
        className="m-auto w-[min(90vw,24rem)] rounded-lg border border-line bg-surface p-6 text-foreground backdrop:bg-black/70"
      >
        <h2 id="delete-title" className="text-lg font-semibold">
          Are you sure?
        </h2>
        <p className="mt-2 text-muted">
          This deletes your listen of <span className="text-foreground">{albumTitle}</span>.
          You can&apos;t undo this.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-10 rounded-md border border-line px-4 hover:border-accent"
          >
            Cancel
          </button>
          <form action={action}>
            <ConfirmButton />
          </form>
        </div>
      </dialog>
    </>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-md bg-danger px-4 font-semibold text-background disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}
