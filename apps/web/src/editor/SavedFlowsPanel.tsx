import type { FlowEditorState } from './flow-editor-state';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { Button } from '../ui/Button';

interface SavedFlowsPanelProps {
  readonly flows: readonly FlowEditorState[];
  readonly currentFlowId: string;
  readonly hasUnsavedChanges: boolean;
  readonly issue: string | null;
  readonly onOpen: (flowId: string) => void;
}

export function SavedFlowsPanel({
  flows,
  currentFlowId,
  hasUnsavedChanges,
  issue,
  onOpen,
}: SavedFlowsPanelProps) {
  return (
    <InspectorPanel title="Flows" context={`${flows.length} saved`}>
      {issue !== null && <p role="alert" className="mb-4 text-ui text-danger">{issue}</p>}
      {flows.length === 0 ? (
        <p className="text-ui text-muted">Save a flow to make it available here across reloads.</p>
      ) : (
        <ul className="space-y-2">
          {flows.map((editor) => {
            const isCurrent = editor.flow.id === currentFlowId;
            return (
              <li key={editor.flow.id} className="rounded-control border border-border bg-surface p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-ui font-medium wrap-anywhere">{editor.flow.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {editor.flow.nodes.length} nodes · {editor.flow.codeReferences.length} code links
                    </p>
                    {isCurrent && <p className="mt-1 text-xs text-brand">Current flow</p>}
                  </div>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    disabled={isCurrent && !hasUnsavedChanges}
                    onClick={() => onOpen(editor.flow.id)}
                    aria-label={`${isCurrent ? 'Reopen saved' : 'Open'} ${editor.flow.name}`}
                  >
                    {isCurrent && hasUnsavedChanges ? 'Reopen' : 'Open'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </InspectorPanel>
  );
}
