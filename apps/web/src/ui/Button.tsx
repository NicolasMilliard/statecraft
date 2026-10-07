import type { ComponentPropsWithRef } from 'react';

type ButtonProps = ComponentPropsWithRef<'button'> & {
  readonly variant?: 'primary' | 'secondary' | 'danger';
};

const baseClasses = [
  'ui-button',
  'inline-flex min-h-9 items-center justify-center gap-2',
  'rounded-control border px-3 py-1.5 text-ui font-medium',
  'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
  'enabled:[&[draggable=true]]:cursor-grab',
  'enabled:[&[draggable=true]]:active:cursor-grabbing',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
].join(' ');

const variantClasses = {
  primary: [
    'border-transparent bg-primary text-primary-foreground',
    'enabled:hover:bg-primary-hover',
    'enabled:active:bg-primary-pressed',
    'focus-visible:outline-brand',
  ].join(' '),
  secondary: [
    'border-border bg-surface text-foreground',
    'enabled:hover:bg-surface-hover',
    'enabled:active:bg-surface-pressed',
    'focus-visible:outline-brand',
  ].join(' '),
  danger: [
    'border-danger-border bg-surface text-danger',
    'enabled:hover:bg-danger-hover',
    'enabled:active:bg-danger-pressed',
    'focus-visible:outline-danger',
  ].join(' '),
};

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      <span className="ui-button__content">{children}</span>
    </button>
  );
}
