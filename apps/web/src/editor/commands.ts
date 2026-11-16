export type CommandId =
  | "commands"
  | "new-flow"
  | "rename-flow"
  | "save"
  | "open-json"
  | "export-json"
  | "undo"
  | "redo"
  | "reset-layout"
  | "fit-view"
  | "select-all"
  | "delete-selection"
  | "cancel"
  | "add-screen"
  | "add-ui"
  | "add-action"
  | "add-service"
  | "add-state";

export interface Shortcut {
  readonly key: string;
  readonly mod?: boolean;
  readonly shift?: boolean;
}

interface CommandDefinition {
  readonly label: string;
  readonly group: "Flow" | "History" | "Canvas" | "Add node";
  readonly shortcuts?: readonly Shortcut[];
  readonly scope?: "canvas";
  readonly allowInText?: boolean;
}

export interface EditorCommand extends CommandDefinition {
  readonly id: CommandId;
  readonly enabled: boolean;
  readonly run: () => void;
}

export type CommandRegistry = Record<CommandId, EditorCommand>;
export type ShortcutPlatform = "mac" | "other";

export const COMMAND_DEFINITIONS: Record<CommandId, CommandDefinition> = {
  commands: {
    label: "Commands",
    group: "Flow",
    shortcuts: [{ key: "k", mod: true }],
    allowInText: true,
  },
  "new-flow": { label: "New flow", group: "Flow" },
  "rename-flow": { label: "Rename flow", group: "Flow" },
  save: {
    label: "Save locally",
    group: "Flow",
    shortcuts: [{ key: "s", mod: true }],
    allowInText: true,
  },
  "open-json": { label: "Open JSON", group: "Flow" },
  "export-json": { label: "Export JSON", group: "Flow" },
  undo: {
    label: "Undo",
    group: "History",
    shortcuts: [{ key: "z", mod: true }],
  },
  redo: {
    label: "Redo",
    group: "History",
    shortcuts: [{ key: "z", mod: true, shift: true }],
  },
  "reset-layout": { label: "Reset layout", group: "Canvas" },
  "fit-view": { label: "Fit view", group: "Canvas" },
  "select-all": {
    label: "Select all",
    group: "Canvas",
    scope: "canvas",
    shortcuts: [{ key: "a", mod: true }],
  },
  "delete-selection": {
    label: "Delete selection",
    group: "Canvas",
    scope: "canvas",
    shortcuts: [{ key: "Backspace" }, { key: "Delete" }],
  },
  cancel: {
    label: "Cancel selection or connection",
    group: "Canvas",
    scope: "canvas",
    shortcuts: [{ key: "Escape" }],
  },
  "add-screen": { label: "Add Screen node", group: "Add node" },
  "add-ui": { label: "Add UI node", group: "Add node" },
  "add-action": { label: "Add Action node", group: "Add node" },
  "add-service": { label: "Add Service node", group: "Add node" },
  "add-state": { label: "Add State node", group: "Add node" },
};

export function createCommands(
  actions: Record<CommandId, () => void>,
  availability: Partial<Record<CommandId, boolean>>
): CommandRegistry {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Every fixed definition key maps to an EditorCommand.
  return Object.fromEntries(
    Object.entries(COMMAND_DEFINITIONS).map(([key, definition]) => {
      if (!isCommandId(key)) {
        throw new Error(`Unknown command ${key}.`);
      }
      const id = key;
      return [
        id,
        {
          ...definition,
          id,
          enabled: availability[id] ?? true,
          run: actions[id],
        },
      ];
    })
  ) as CommandRegistry;
}

export function runCommand(command: EditorCommand): boolean {
  if (!command.enabled) {
    return false;
  }
  command.run();
  return true;
}

export function getShortcutPlatform(platform: string): ShortcutPlatform {
  return /Mac|iPhone|iPad|iPod/iu.test(platform) ? "mac" : "other";
}

export function formatShortcut(
  shortcut: Shortcut,
  platform: ShortcutPlatform
): string {
  const key =
    shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  if (platform === "mac") {
    const getDisplayKey = () => {
      if (key === "Backspace") {
        return "⌫" as const;
      }
      if (key === "Escape") {
        return "Esc" as const;
      }
      return key;
    };
    const displayKey = getDisplayKey();
    return `${shortcut.mod === true ? "⌘" : ""}${shortcut.shift === true ? "⇧" : ""}${displayKey}`;
  }
  return [
    shortcut.mod === true ? "Ctrl" : "",
    shortcut.shift === true ? "Shift" : "",
    key === "Escape" ? "Esc" : key,
  ]
    .filter(Boolean)
    .join("+");
}

export function ariaShortcut(
  shortcut: Shortcut,
  platform: ShortcutPlatform
): string {
  function getModifierKey() {
    if (shortcut.mod === true) {
      if (platform === "mac") {
        return "Meta" as const;
      }
      return "Control" as const;
    }
    return "" as const;
  }
  return [
    getModifierKey(),
    shortcut.shift === true ? "Shift" : "",
    shortcut.key,
  ]
    .filter(Boolean)
    .join("+");
}

export function filterCommands(
  commands: readonly EditorCommand[],
  query: string
): EditorCommand[] {
  const words = query.trim().toLowerCase().split(/\s+/u);
  return commands.filter(
    (command) =>
      command.id !== "commands" &&
      command.id !== "cancel" &&
      words.every((word) =>
        `${command.label} ${command.group}`.toLowerCase().includes(word)
      )
  );
}

export function isCommandId(value: string): value is CommandId {
  return Object.hasOwn(COMMAND_DEFINITIONS, value);
}
