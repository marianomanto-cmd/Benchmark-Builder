/**
 * <Field> — handoff §3.1.
 * Input / Select / Search / Textarea unificado con label, error state y ring focus.
 */

"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CommonProps {
  label?: string;
  ph?: string;
  error?: string;
  mono?: boolean;
  className?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

interface InputFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder" | "size">,
    CommonProps {
  textarea?: false;
  select?: false;
  search?: boolean;
}

interface TextareaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder">,
    CommonProps {
  textarea: true;
  select?: false;
  search?: false;
}

interface SelectFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder" | "size">,
    CommonProps {
  select: true;
  textarea?: false;
  search?: false;
  options?: { value: string; label: string }[];
}

export type FieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

const baseInput =
  "w-full bg-white text-n-900 placeholder:text-n-400 transition-[border-color,box-shadow] duration-150 ease-[var(--ease-out)] outline-none border rounded-sm";
const focusRing =
  "focus:border-n-900 focus:shadow-[0_0_0_3px_rgba(24,20,16,0.08)]";
const errorRing =
  "border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(184,38,29,0.10)]";

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Field(props: FieldProps) {
  const { label, ph, error, mono, className, iconLeft, iconRight } = props;
  const id = useId();
  const monoClass = mono ? "font-mono tabular-nums" : "";

  const inputClasses = cn(
    baseInput,
    error ? errorRing : "border-n-300 hover:border-n-400 " + focusRing,
    "h-9 px-3 text-[13px] md:h-9 max-md:h-11",
    monoClass,
  );

  let control: ReactNode;

  if ("textarea" in props && props.textarea) {
    const { label: _l, ph: _p, error: _e, mono: _m, className: _c, iconLeft: _il, iconRight: _ir, textarea: _t, ...rest } = props;
    control = (
      <textarea
        id={id}
        placeholder={ph}
        className={cn(
          baseInput,
          error ? errorRing : "border-n-300 hover:border-n-400 " + focusRing,
          "min-h-[72px] py-2 px-3 text-[13px] resize-y",
          monoClass,
        )}
        {...rest}
      />
    );
  } else if ("select" in props && props.select) {
    const { label: _l, ph: _p, error: _e, mono: _m, className: _c, iconLeft: _il, iconRight: _ir, select: _s, options, ...rest } = props;
    control = (
      <div className="relative">
        <select
          id={id}
          className={cn(inputClasses, "appearance-none pr-8 cursor-pointer")}
          {...(rest as InputHTMLAttributes<HTMLSelectElement>)}
        >
          {ph && <option value="">{ph}</option>}
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-n-500">
          <ChevronIcon />
        </span>
      </div>
    );
  } else {
    const { label: _l, ph: _p, error: _e, mono: _m, className: _c, iconLeft: _il, iconRight: _ir, search, ...rest } = props as InputFieldProps;
    const hasLeftIcon = search || iconLeft;
    control = (
      <div className="relative">
        {hasLeftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-n-500">
            {search ? <SearchIcon /> : iconLeft}
          </span>
        )}
        <input
          id={id}
          placeholder={ph}
          className={cn(inputClasses, hasLeftIcon && "pl-9", iconRight && "pr-9")}
          {...rest}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-n-500">{iconRight}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="t-micro">
          {label}
        </label>
      )}
      {control}
      {error && (
        <span className="t-mono text-[11px] text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
