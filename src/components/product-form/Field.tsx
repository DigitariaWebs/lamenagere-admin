"use client";

import { AlertCircle } from "lucide-react";

/**
 * Field ids are hand-written (not `useId()`) on purpose: the validator returns
 * the id of the control to focus, so a failed save can call
 * `document.getElementById(err.field)?.focus()`. Only one product form is ever
 * mounted at a time, so plain ids stay unique.
 */
export function fieldClass(base: string, error?: string): string {
  return error ? `${base} invalid` : base;
}

export function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <div className="field-error" role="alert">
          <AlertCircle size={13} strokeWidth={2} />
          <span>{error}</span>
        </div>
      ) : (
        hint && <div className="field-hint">{hint}</div>
      )}
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  /** Unit rendered inside the field (€, cm, kg…) instead of inside the label. */
  unit?: string;
  mono?: boolean;
  disabled?: boolean;
  /** "decimal" for money/measurements, "numeric" for whole numbers. */
  inputMode?: "text" | "decimal" | "numeric";
  onBlur?: () => void;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  placeholder,
  unit,
  mono,
  disabled,
  inputMode = "text",
  onBlur,
}: TextFieldProps) {
  const input = (
    <input
      id={id}
      className={fieldClass(mono ? "input mono" : "input", error)}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      aria-invalid={error ? true : undefined}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );

  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      {unit ? (
        <span className="input-affix">
          {input}
          <span className="affix">{unit}</span>
        </span>
      ) : (
        input
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  placeholder,
  minHeight,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        id={id}
        className={fieldClass("textarea", error)}
        style={minHeight ? { minHeight } : undefined}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <select
        id={id}
        className={fieldClass("input", error)}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/** Space-between row with the label on the left and the toggle on the right. */
export function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <span>{label}</span>
        <span className="switch">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="slider" />
        </span>
      </label>
      {hint && <div className="field-hint" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
