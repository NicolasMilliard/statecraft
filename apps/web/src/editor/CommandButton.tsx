import type { ComponentPropsWithRef } from 'react';
import { Button } from '../ui/Button';
import { ariaShortcut, formatShortcut, runCommand, type EditorCommand, type ShortcutPlatform } from './commands';

type CommandButtonProps = Omit<ComponentPropsWithRef<typeof Button>, 'onClick' | 'disabled'> & {
  readonly command: EditorCommand;
  readonly platform: ShortcutPlatform;
  readonly showShortcut?: boolean;
};

export function CommandButton({ command, platform, showShortcut = false, children, title, ...props }: CommandButtonProps) {
  const shortcut = command.shortcuts?.[0];
  const hint = shortcut === undefined ? '' : formatShortcut(shortcut, platform);
  return (
    <Button
      {...props}
      disabled={!command.enabled}
      onClick={() => runCommand(command)}
      aria-keyshortcuts={command.shortcuts?.map((item) => ariaShortcut(item, platform)).join(' ')}
      title={[title ?? command.label, hint].filter(Boolean).join(' · ')}
    >
      {children ?? command.label}
      {showShortcut && hint && <kbd aria-hidden="true" className="ml-2 font-mono text-xs text-muted">{hint}</kbd>}
    </Button>
  );
}
