import type { FlowNodeKind } from '@statecraft/core';

const paths: Record<FlowNodeKind, string> = {
  screen: 'M4 4h16v12H4z M8 20h8 M12 16v4',
  ui: 'M4 4h16v16H4z M4 9h16 M9 9v11',
  action: 'm5 3 14 9-7 1-3 7z',
  service: 'M8 4H6v6l-3 2 3 2v6h2 M16 4h2v6l3 2-3 2v6h-2',
  state: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
};

export function NodeKindIcon({ kind }: { readonly kind: FlowNodeKind }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
