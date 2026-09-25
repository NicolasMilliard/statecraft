import type { CommandRegistry, EditorCommand, ShortcutPlatform } from './commands';

interface ShortcutEvent {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly isComposing: boolean;
  readonly keyCode: number;
  readonly repeat: boolean;
  readonly defaultPrevented: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

interface ShortcutContext {
  readonly platform: ShortcutPlatform;
  readonly editingText: boolean;
  readonly canvasFocused: boolean;
  readonly modalOpen: boolean;
}

export function handleCommandShortcut(
  event: ShortcutEvent,
  commands: CommandRegistry,
  context: ShortcutContext,
): boolean {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || context.modalOpen) return false;

  const command: EditorCommand | undefined = Object.values(commands).find((candidate) => {
    if (context.editingText && !candidate.allowInText) return false;
    if (candidate.scope === 'canvas' && !context.canvasFocused) return false;

    return candidate.shortcuts?.some((shortcut) => {
      const meta = context.platform === 'mac' && !!shortcut.mod;
      const ctrl = context.platform === 'other' && !!shortcut.mod;
      return event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        event.metaKey === meta && event.ctrlKey === ctrl &&
        event.shiftKey === !!shortcut.shift && !event.altKey;
    });
  });

  if (command === undefined) return false;

  // Consume a known shortcut even when disabled, to avoid the browser's Save dialog.
  event.preventDefault();
  event.stopPropagation();
  if (command.enabled && !event.repeat) command.run();
  return true;
}
