import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'accent' | 'success' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-blue text-white shadow-md shadow-ieee-navy/20 hover:brightness-110 hover:shadow-glow-blue',
  accent:
    'bg-gradient-orange text-white shadow-md shadow-ieee-orange-dark/30 hover:brightness-105 hover:shadow-glow-orange',
  success:
    'bg-gradient-green text-white shadow-md shadow-ieee-green-dark/30 hover:brightness-105 hover:shadow-glow-green',
  secondary:
    'bg-gradient-surface text-ieee-navy border border-hairline shadow-sm ' +
    'hover:border-ieee-blue hover:text-ieee-blue hover:shadow-md',
  ghost: 'text-ieee-gray hover:bg-hairline/60 hover:text-ieee-navy',
  danger:
    'bg-gradient-red text-white shadow-md shadow-ieee-red-dark/30 hover:brightness-110 hover:shadow-glow-red',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // `py-2` on the small button keeps a comfortable touch target on phones.
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(
    // `transition-all` so the shadow and the 1px press respond together.
    'inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150',
    'active:translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ieee-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(buttonClasses(variant, size), className)} {...props} />;
}
