import { Button } from '../ui/Button';
import { InspectorPanel } from './InspectorPanel';

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
    <InspectorPanel context="Selection">
      <h3 className="text-sm font-medium">
        {nodeCount + edgeCount} items selected
      </h3>

      <dl className="mt-5 space-y-3 text-ui">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Nodes</dt>
          <dd className="font-medium tabular-nums">{nodeCount}</dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Connections</dt>
          <dd className="font-medium tabular-nums">{edgeCount}</dd>
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
    </InspectorPanel>
  );
}
