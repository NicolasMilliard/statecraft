interface SelectionInspectorProps {
  readonly nodeCount: number;
  readonly edgeCount: number;
}

export function SelectionInspector({
  nodeCount,
  edgeCount,
}: SelectionInspectorProps) {
  return (
    <aside
      className="max-h-64 min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-5 md:max-h-none md:border-t-0 md:border-l"
      aria-labelledby="selection-inspector-title"
    >
      <h2
        id="selection-inspector-title"
        className="text-sm font-semibold text-slate-700"
      >
        Selection
      </h2>

      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="text-slate-500">Nodes</dt>
          <dd className="mt-1 font-medium">{nodeCount}</dd>
        </div>

        <div>
          <dt className="text-slate-500">Connections</dt>
          <dd className="mt-1 font-medium">{edgeCount}</dd>
        </div>
      </dl>

      {nodeCount > 1 && (
        <p className="mt-5 text-sm text-slate-500">
          Drag any selected node to move the nodes together.
        </p>
      )}

      <p className="mt-3 text-sm text-slate-500">
        Select a single item to edit its details.
      </p>
    </aside>
  );
}
