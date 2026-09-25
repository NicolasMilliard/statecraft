import { FLOW_NODE_KINDS } from '@statecraft/core';
import { Panel } from '@xyflow/react';
import { NODE_KIND_LABELS } from '../node-kind-labels';
import { CommandButton } from '../editor/CommandButton';
import type { CommandRegistry, ShortcutPlatform } from '../editor/commands';
import { NODE_KIND_MIME_TYPE } from './node-drag';

interface NodePaletteProps {
  readonly commands: CommandRegistry;
  readonly platform: ShortcutPlatform;
}

export function NodePalette({ commands, platform }: NodePaletteProps) {
  return (
    <Panel
      position="top-left"
      className="nopan max-w-[calc(100%-1rem)] rounded-xl border border-border bg-surface p-3 shadow-sm"
    >
      <p className="text-xs font-semibold text-muted">Add node</p>
      <p className="mb-2 mt-1 text-xs text-muted">
        Drag onto the canvas or click to add.
      </p>

      <div role="group" aria-label="Add node" className="flex flex-wrap gap-2">
        {FLOW_NODE_KINDS.map((kind) => (
          <CommandButton
            command={commands[`add-${kind}`]}
            platform={platform}
            key={kind}
            variant="secondary"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(NODE_KIND_MIME_TYPE, kind);
              event.dataTransfer.effectAllowed = 'copy';
            }}
            aria-label={`Add ${NODE_KIND_LABELS[kind]} node`}
          >
            {NODE_KIND_LABELS[kind]}
          </CommandButton>
        ))}
      </div>
    </Panel>
  );
}
