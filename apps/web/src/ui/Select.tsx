import type { ComponentPropsWithRef } from 'react';

type SelectProps = ComponentPropsWithRef<'select'> & {
  readonly containerClassName?: string;
};

const classes = [
  'block min-h-9 w-full min-w-0 appearance-none rounded-control',
  'border border-border-strong bg-surface py-1.5 pl-3 pr-9',
  'text-ui text-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-brand',
  'disabled:cursor-not-allowed',
  'disabled:bg-surface-hover disabled:text-muted',
].join(' ');

export function Select({
  className = '',
  containerClassName = '',
  children,
  ...props
}: SelectProps) {
  return (
    <div className={`relative min-w-0 ${containerClassName}`}>
      <select {...props} className={`${classes} ${className}`}>
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3.5 6 4.5 4.5L12.5 6" />
      </svg>
    </div>
  );
}
