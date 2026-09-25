import { useId, type ReactNode } from 'react';

interface InspectorPanelProps {
  readonly context: string;
  readonly children: ReactNode;
}

export function InspectorPanel({ context, children }: InspectorPanelProps) {
  const titleId = useId();

  return (
    <aside
      className="grid max-h-80 min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] border-t border-border bg-chrome md:max-h-none md:border-t-0 md:border-l"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id={titleId} className="text-ui font-medium">
          Inspector
        </h2>
        <span className="text-xs text-muted">{context}</span>
      </div>

      <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
        {children}
      </div>
    </aside>
  );
}
