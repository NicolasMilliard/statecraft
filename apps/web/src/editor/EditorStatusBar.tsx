import { CommandButton } from './CommandButton';
import type { CommandRegistry, ShortcutPlatform } from './commands';

interface EditorStatusBarProps {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly commands: Pick<CommandRegistry, 'undo' | 'redo' | 'reset-layout'>;
  readonly platform: ShortcutPlatform;
}

export function EditorStatusBar({ nodeCount, edgeCount, commands, platform }: EditorStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-chrome px-4 py-2">
      <p className="text-xs text-muted">{nodeCount} nodes · {edgeCount} connections</p>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Edit history" className="flex gap-1">
          <CommandButton command={commands.undo} platform={platform} variant="secondary">
            Undo
          </CommandButton>
          <CommandButton command={commands.redo} platform={platform} variant="secondary">
            Redo
          </CommandButton>
        </div>
        <CommandButton command={commands['reset-layout']} platform={platform} variant="secondary">
          Reset layout
        </CommandButton>
      </div>
    </div>
  );
}
