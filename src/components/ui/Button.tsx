import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'accent' | 'success' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-ieee-blue text-white shadow-sm hover:bg-ieee-navy hover:shadow-md',
  accent: 'bg-ieee-orange-dark text-white shadow-sm hover:bg-ieee-orange hover:shadow-md',
  success: 'bg-ieee-green-dark text-white shadow-sm hover:bg-ieee-green hover:shadow-md',
  secondary:
    'bg-white text-ieee-navy border border-hairline shadow-sm ' +
    'hover:border-ieee-blue hover:text-ieee-blue hover:shadow',
  ghost: 'text-ieee-gray hover:bg-hairline/60 hover:text-ieee-navy',
  danger: 'bg-ieee-red-dark text-white shadow-sm hover:bg-ieee-red hover:shadow-md',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(
    // `transition-all` so the shadow and the 1px press respond together.
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150',
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
