import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId ?? hintId}
          className={cn(
            "h-11 w-full rounded-md border bg-white px-4 text-base text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-40",
            error
              ? "border-danger focus-visible:outline-danger"
              : "border-border",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-sm text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
