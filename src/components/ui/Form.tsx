import { cn } from '@/lib/utils';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

const FIELD_CLASSES =
  'w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ieee-navy ' +
  'placeholder:text-ieee-gray/70 focus:border-ieee-blue focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 ' +
  'disabled:bg-surface disabled:text-ieee-gray';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** The input, select, or textarea this label describes. */
  children: ReactNode;
}

/**
 * Wraps a form control with its label, hint, and error message.
 * The control is nested inside the <label>, so the association is implicit —
 * no id wiring needed anywhere.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ieee-navy">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ieee-gray">{hint}</span>}
      {error && (
        <span className="mt-1 block text-xs font-semibold text-ieee-red-dark">{error}</span>
      )}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_CLASSES, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD_CLASSES, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={cn(FIELD_CLASSES, className)} {...props} />;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-ieee-red-dark/10 px-3 py-2 text-sm font-semibold text-ieee-red-dark">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-ieee-green-dark/10 px-3 py-2 text-sm font-semibold text-ieee-green-dark">
      {message}
    </p>
  );
}
