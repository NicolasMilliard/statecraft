import type { ComponentPropsWithRef } from 'react';

type TextInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;

const classes = [
  'min-h-9 w-full min-w-0 rounded-control',
  'border border-border-strong bg-surface px-3 py-1.5',
  'text-ui text-foreground placeholder:text-muted',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-brand',
  'aria-invalid:border-danger',
  'aria-invalid:focus-visible:outline-danger',
  'disabled:cursor-not-allowed',
  'disabled:bg-surface-hover disabled:text-muted',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

export function TextInput({ className = '', ...props }: TextInputProps) {
  return <input {...props} type="text" className={`${classes} ${className}`} />;
}
