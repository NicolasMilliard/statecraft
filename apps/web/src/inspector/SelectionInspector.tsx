interface SelectionInspectorProps {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly onSelectionDelete: () => void;
}

export function SelectionInspector({
  nodeCount,
  edgeCount,
  onSelectionDelete,
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

      <div className="mt-6 border-t border-slate-200 pt-4">
        {nodeCount > 0 && (
          <p className="mb-3 text-xs text-slate-500">
            Deleting nodes also removes their connections.
          </p>
        )}

        <button
          type="button"
          onClick={onSelectionDelete}
          className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Delete selection
        </button>
      </div>
    </aside>
  );
}
