import { Button } from '../ui/Button';

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
      className="max-h-64 min-h-0 overflow-y-auto border-t border-border bg-surface p-5 md:max-h-none md:border-t-0 md:border-l"
      aria-labelledby="selection-inspector-title"
    >
      <h2
        id="selection-inspector-title"
        className="text-ui font-semibold text-foreground"
      >
        Selection
      </h2>

      <dl className="mt-5 space-y-4 text-ui">
        <div>
          <dt className="text-muted">Nodes</dt>
          <dd className="mt-1 font-medium">{nodeCount}</dd>
        </div>

        <div>
          <dt className="text-muted">Connections</dt>
          <dd className="mt-1 font-medium">{edgeCount}</dd>
        </div>
      </dl>

      {nodeCount > 1 && (
        <p className="mt-5 text-ui text-muted">
          Drag any selected node to move the nodes together.
        </p>
      )}

      <p className="mt-3 text-ui text-muted">
        Select a single item to edit its details.
      </p>

      <div className="mt-6 border-t border-border pt-4">
        {nodeCount > 0 && (
          <p className="mb-3 text-xs text-muted">
            Deleting nodes also removes their connections.
          </p>
        )}

        <Button variant="danger" onClick={onSelectionDelete}>
          Delete selection
        </Button>
      </div>
    </aside>
  );
}
