import { useId, type ReactNode } from 'react';

interface InspectorPanelProps {
  readonly title?: string;
  readonly context: string;
  readonly children: ReactNode;
}

export function InspectorPanel({ title = 'Inspector', context, children }: InspectorPanelProps) {
  const titleId = useId();

  return (
    <section
      className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-chrome"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id={titleId} className="text-ui font-medium">
          {title}
        </h2>
        <span className="text-xs text-muted">{context}</span>
      </div>

      <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
        {children}
      </div>
    </section>
  );
}
