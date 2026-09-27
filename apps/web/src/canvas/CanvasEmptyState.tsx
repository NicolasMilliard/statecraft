import { useId } from 'react';
import { CommandButton } from '../editor/CommandButton';
import type { CommandRegistry, ShortcutPlatform } from '../editor/commands';

interface CanvasEmptyStateProps {
  readonly commands: Pick<CommandRegistry, 'add-screen' | 'open-json'>;
  readonly platform: ShortcutPlatform;
}

export function CanvasEmptyState({ commands, platform }: CanvasEmptyStateProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      // React Flow's renderer sits at z-index 4 and otherwise intercepts clicks.
      className="pointer-events-none nopan nowheel absolute inset-0 z-5 flex flex-col overflow-y-auto px-6 pt-44 pb-20"
    >
      <div className="mx-auto my-auto w-full max-w-sm shrink-0 text-center">
        <h2 id={titleId} className="text-lg font-medium tracking-tight">
          Start your flow
        </h2>
        <p className="mt-2 text-ui text-muted">
          Add a screen to map the first step of your user journey.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <CommandButton className="pointer-events-auto" command={commands['add-screen']} platform={platform}>
            Add first screen
          </CommandButton>
          <CommandButton className="pointer-events-auto" command={commands['open-json']} platform={platform} variant="secondary">
            Open JSON
          </CommandButton>
        </div>
        <p className="mt-4 text-xs text-muted">
          Use Add node for other node types.
        </p>
      </div>
    </section>
  );
}
