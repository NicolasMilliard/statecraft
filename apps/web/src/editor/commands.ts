export type CommandId =
  | 'commands' | 'new-flow' | 'rename-flow' | 'save' | 'open-json' | 'export-json'
  | 'undo' | 'redo' | 'reset-layout' | 'fit-view' | 'select-all'
  | 'delete-selection' | 'cancel'
  | 'add-screen' | 'add-ui' | 'add-action' | 'add-service' | 'add-state';

export interface Shortcut {
  readonly key: string;
  readonly mod?: boolean;
  readonly shift?: boolean;
}

interface CommandDefinition {
  readonly label: string;
  readonly group: 'Flow' | 'History' | 'Canvas' | 'Add node';
  readonly shortcuts?: readonly Shortcut[];
  readonly scope?: 'canvas';
  readonly allowInText?: boolean;
}

export interface EditorCommand extends CommandDefinition {
  readonly id: CommandId;
  readonly enabled: boolean;
  readonly run: () => void;
}

export type CommandRegistry = Record<CommandId, EditorCommand>;
export type ShortcutPlatform = 'mac' | 'other';

export const COMMAND_DEFINITIONS: Record<CommandId, CommandDefinition> = {
  commands: { label: 'Commands', group: 'Flow', shortcuts: [{ key: 'k', mod: true }], allowInText: true },
  'new-flow': { label: 'New flow', group: 'Flow' },
  'rename-flow': { label: 'Rename flow', group: 'Flow' },
  save: { label: 'Save locally', group: 'Flow', shortcuts: [{ key: 's', mod: true }], allowInText: true },
  'open-json': { label: 'Open JSON', group: 'Flow' },
  'export-json': { label: 'Export JSON', group: 'Flow' },
  undo: { label: 'Undo', group: 'History', shortcuts: [{ key: 'z', mod: true }] },
  redo: { label: 'Redo', group: 'History', shortcuts: [{ key: 'z', mod: true, shift: true }] },
  'reset-layout': { label: 'Reset layout', group: 'Canvas' },
  'fit-view': { label: 'Fit view', group: 'Canvas' },
  'select-all': { label: 'Select all', group: 'Canvas', scope: 'canvas', shortcuts: [{ key: 'a', mod: true }] },
  'delete-selection': { label: 'Delete selection', group: 'Canvas', scope: 'canvas', shortcuts: [{ key: 'Backspace' }, { key: 'Delete' }] },
  cancel: { label: 'Cancel selection or connection', group: 'Canvas', scope: 'canvas', shortcuts: [{ key: 'Escape' }] },
  'add-screen': { label: 'Add Screen node', group: 'Add node' },
  'add-ui': { label: 'Add UI node', group: 'Add node' },
  'add-action': { label: 'Add Action node', group: 'Add node' },
  'add-service': { label: 'Add Service node', group: 'Add node' },
  'add-state': { label: 'Add State node', group: 'Add node' },
};

export function createCommands(
  actions: Record<CommandId, () => void>,
  availability: Partial<Record<CommandId, boolean>>,
): CommandRegistry {
  return Object.fromEntries(
    Object.entries(COMMAND_DEFINITIONS).map(([key, definition]) => {
      const id = key as CommandId;
      return [id, { ...definition, id, enabled: availability[id] ?? true, run: actions[id] }];
    }),
  ) as CommandRegistry;
}

export function runCommand(command: EditorCommand): boolean {
  if (!command.enabled) return false;
  command.run();
  return true;
}

export function getShortcutPlatform(platform: string): ShortcutPlatform {
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? 'mac' : 'other';
}

export function formatShortcut(shortcut: Shortcut, platform: ShortcutPlatform): string {
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  if (platform === 'mac') {
    const displayKey = key === 'Backspace' ? '⌫' : key === 'Escape' ? 'Esc' : key;
    return `${shortcut.mod ? '⌘' : ''}${shortcut.shift ? '⇧' : ''}${displayKey}`;
  }
  return [shortcut.mod ? 'Ctrl' : '', shortcut.shift ? 'Shift' : '', key === 'Escape' ? 'Esc' : key].filter(Boolean).join('+');
}

export function ariaShortcut(shortcut: Shortcut, platform: ShortcutPlatform): string {
  return [shortcut.mod ? platform === 'mac' ? 'Meta' : 'Control' : '', shortcut.shift ? 'Shift' : '', shortcut.key].filter(Boolean).join('+');
}

export function filterCommands(commands: readonly EditorCommand[], query: string): EditorCommand[] {
  const words = query.trim().toLowerCase().split(/\s+/);
  return commands.filter((command) =>
    command.id !== 'commands' && command.id !== 'cancel' &&
    words.every((word) => `${command.label} ${command.group}`.toLowerCase().includes(word)),
  );
}
