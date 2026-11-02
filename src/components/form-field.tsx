type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
};

// A labeled input that shows a friendly error message under it.
export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  error,
  hint,
  autoComplete,
}: FormFieldProps) {
  const messageId = `${name}-message`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className="h-11 rounded-md border border-line bg-surface px-3 text-base outline-none transition-colors focus:border-accent aria-[invalid=true]:border-danger"
      />
      {error ? (
        <p id={messageId} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
