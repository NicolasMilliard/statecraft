import type { ComponentPropsWithRef } from 'react';

type ButtonProps = ComponentPropsWithRef<'button'> & {
  readonly variant?: 'primary' | 'secondary';
};

const baseClasses = [
  'inline-flex min-h-9 items-center justify-center gap-2',
  'rounded-control border px-3 py-1.5 text-ui font-medium',
  'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-brand',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

const variantClasses = {
  primary: [
    'border-transparent bg-brand text-brand-foreground',
    'enabled:hover:bg-brand-hover',
    'enabled:active:bg-brand-pressed',
  ].join(' '),
  secondary: [
    'border-border bg-surface text-foreground',
    'enabled:hover:bg-surface-hover',
    'enabled:active:bg-surface-pressed',
  ].join(' '),
};

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    />
  );
}
