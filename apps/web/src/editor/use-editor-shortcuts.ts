import { useEffect, type RefObject } from 'react';
import { handleCommandShortcut } from './command-shortcuts';
import type { CommandRegistry, ShortcutPlatform } from './commands';

interface EditorShortcutsOptions {
  readonly workspaceRef: RefObject<HTMLElement | null>;
  readonly commands: CommandRegistry;
  readonly platform: ShortcutPlatform;
  readonly paletteOpen: boolean;
}

export function useEditorShortcuts({ workspaceRef, commands, platform, paletteOpen }: EditorShortcutsOptions) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement || target instanceof SVGElement)) return;
      if (target !== document.body && !workspaceRef.current?.contains(target)) return;

      handleCommandShortcut(event, commands, {
        platform,
        editingText:
          (target instanceof HTMLElement && target.isContentEditable) ||
          target.closest('input, textarea, select, [role="textbox"], [role="combobox"]') !== null,
        canvasFocused:
          target.closest('[data-canvas-surface]') !== null &&
          target.closest('.react-flow__panel, button, input, textarea, select') === null,
        modalOpen:
          paletteOpen || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]') !== null,
      });
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [workspaceRef, commands, platform, paletteOpen]);
}
